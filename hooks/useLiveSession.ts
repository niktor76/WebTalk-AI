import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToArrayBuffer } from '../utils/audio-utils';
import { ChatMessage } from '../types';

interface UseLiveSessionProps {
  apiKey: string;
  systemInstruction?: string;
  voiceName?: string;
  initialMessages?: ChatMessage[];
}

export const useLiveSession = ({ apiKey, systemInstruction, voiceName = 'Kore', initialMessages = [] }: UseLiveSessionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isConnectedRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Transcription accumulators
  const currentInputRef = useRef<string>('');
  const currentOutputRef = useRef<string>('');

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((s) => {
         try { s.close(); } catch(e) { console.error('Error closing session', e)}
      });
      sessionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }

    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsConnected(false);
    isConnectedRef.current = false;
    setIsTalking(false);
    setVolume(0);
    // Do NOT clear messages here, as we want to preserve them for saving
    currentInputRef.current = '';
    currentOutputRef.current = '';
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    currentInputRef.current = '';
    currentOutputRef.current = '';

    try {
      if (!apiKey) throw new Error("API Key required");

      const ai = new GoogleGenAI({ apiKey });
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // 1. Setup Input Context (Microphone)
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      if (inputContextRef.current.state === 'suspended') {
        await inputContextRef.current.resume();
      }

      // 2. Setup Output Context (Speaker)
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      if (outputContextRef.current.state === 'suspended') {
        await outputContextRef.current.resume();
      }

      analyserRef.current = outputContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // 3. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = inputContextRef.current.createMediaStreamSource(stream);
      const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
      
      scriptProcessor.onaudioprocess = (e) => {
        if (!sessionRef.current) return; 

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        sessionRef.current.then((session) => {
            try {
                session.sendRealtimeInput({ media: pcmBlob });
            } catch (e) {
                console.error("Error sending input", e);
            }
        });
      };

      source.connect(scriptProcessor);
      
      const gainNode = inputContextRef.current.createGain();
      gainNode.gain.value = 0; 
      scriptProcessor.connect(gainNode);
      gainNode.connect(inputContextRef.current.destination);

      // 4. Start Visualizer
      const updateVolume = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setVolume(avg);
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 5. Prepare System Instruction with History (Context Injection)
      let finalSystemInstruction = systemInstruction || '';
      
      if (messages.length > 0) {
        const historyText = messages.map(m => `${m.speaker === 'user' ? 'User' : 'Model'}: ${m.text}`).join('\n');
        finalSystemInstruction += `\n\nHIER IST DER BISHERIGE GESPRÄCHSVERLAUF. Nutze ihn als Kontext, um das Gespräch nahtlos fortzusetzen:\n${historyText}\n\nFahre fort, als ob keine Unterbrechung stattgefunden hätte.`;
      }

      // 6. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: finalSystemInstruction,
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Session Opened');
            setIsConnected(true);
            isConnectedRef.current = true;
            nextStartTimeRef.current = outputContextRef.current?.currentTime || 0;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            const serverContent = message.serverContent;
            if (serverContent) {
                if (serverContent.inputTranscription) {
                    currentInputRef.current += serverContent.inputTranscription.text;
                }
                if (serverContent.outputTranscription) {
                    currentOutputRef.current += serverContent.outputTranscription.text;
                }

                if (serverContent.turnComplete) {
                    const newMessages: ChatMessage[] = [];
                    
                    if (currentInputRef.current.trim()) {
                        newMessages.push({
                            id: Date.now() + '-user',
                            speaker: 'user',
                            text: currentInputRef.current.trim(),
                            isFinal: true,
                            timestamp: Date.now()
                        });
                        currentInputRef.current = '';
                    }
                    
                    if (currentOutputRef.current.trim()) {
                         newMessages.push({
                            id: Date.now() + '-model',
                            speaker: 'model',
                            text: currentOutputRef.current.trim(),
                            isFinal: true,
                            timestamp: Date.now()
                        });
                        currentOutputRef.current = '';
                    }

                    if (newMessages.length > 0) {
                        setMessages(prev => [...prev, ...newMessages]);
                    }
                }
            }

            // Handle Audio
            const audioCtx = outputContextRef.current;
            if (!audioCtx) return;

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsTalking(true);
              
              nextStartTimeRef.current = Math.max(
                  nextStartTimeRef.current,
                  audioCtx.currentTime
              );

              try {
                const arrayBuffer = base64ToArrayBuffer(base64Audio);
                const audioBuffer = await decodeAudioData(arrayBuffer, audioCtx, 24000, 1);
                
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                
                if (analyserRef.current) {
                    source.connect(analyserRef.current);
                }
                source.connect(audioCtx.destination);
                
                source.onended = () => {
                    if (sourcesRef.current) {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) {
                            setIsTalking(false);
                        }
                    }
                };

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);

              } catch (e) {
                console.error("Decode error", e);
              }
            }

            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = audioCtx.currentTime;
                setIsTalking(false);
            }
          },
          onclose: () => {
            console.log('Session Closed');
            cleanup();
          },
          onerror: (err) => {
            console.error('Session Error', err);
            setError("Verbindung fehlgeschlagen.");
            cleanup();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Fehler beim Starten");
      cleanup();
    }
  }, [apiKey, systemInstruction, voiceName, cleanup, messages]); // Added messages to deps slightly, but connect uses ref

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
      return () => cleanup();
  }, [cleanup]);

  return {
    connect,
    disconnect,
    isConnected,
    isTalking,
    volume,
    error,
    messages
  };
};