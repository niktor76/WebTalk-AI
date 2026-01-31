import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, X, ExternalLink, Play, Settings2, FileText, MessageSquare, Pause } from 'lucide-react';
import Visualizer from './Visualizer';
import { useLiveSession } from '../hooks/useLiveSession';
import { WebsiteContext, ChatMessage } from '../types';

interface LiveInterfaceProps {
  context: WebsiteContext;
  initialMessages?: ChatMessage[];
  onExit: (messages: ChatMessage[]) => void;
}

const VOICES = [
  { id: 'Kore', name: 'Kore (Ruhig)' },
  { id: 'Puck', name: 'Puck (Verspielt)' },
  { id: 'Charon', name: 'Charon (Tief)' },
  { id: 'Fenrir', name: 'Fenrir (Energisch)' },
  { id: 'Zephyr', name: 'Zephyr (Sanft)' },
];

const LiveInterface: React.FC<LiveInterfaceProps> = ({ context, initialMessages = [], onExit }) => {
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [showTranscript, setShowTranscript] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use fullContent for the AI, fallback to summary if missing (e.g. old saves)
  const contentForAI = context.fullContent || context.summary;

  const systemInstruction = `
    Du bist ein intelligenter und freundlicher Assistent. Deine Aufgabe ist es, mit dem Benutzer über den Inhalt der folgenden Webseite zu sprechen.
    
    VOLLSTÄNDIGER WEBSITE INHALT:
    ${contentForAI}
    
    ANWEISUNGEN:
    1. Wenn kein vorheriger Gesprächsverlauf existiert, beginne mit einer kurzen Vorstellung und 1-Satz-Zusammenfassung.
    2. Wenn ein Verlauf existiert, begrüße den Nutzer zurück ("Willkommen zurück") und knüpfe an das letzte Thema an.
    3. Beantworte Fragen detailliert basierend auf dem vollen Inhalt.
    4. Sprich immer Deutsch, höflich und natürlich.
    5. Zitiere keine langen Passagen, sondern erkläre sie im Gesprächsfluss.
  `;

  const { connect, disconnect, isConnected, isTalking, volume, error, messages } = useLiveSession({
    apiKey: process.env.API_KEY || '',
    systemInstruction,
    voiceName: selectedVoice,
    initialMessages
  });

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showTranscript]);

  const handleExit = () => {
      // Disconnect first
      if (isConnected) {
          disconnect();
      }
      // Pass the current messages back to App to save
      onExit(messages);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-slate-950">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transition-opacity duration-1000 ${isTalking ? 'opacity-40' : 'opacity-10'}`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl transition-opacity duration-1000 ${isTalking ? 'opacity-40' : 'opacity-10'}`}></div>
      </div>

      {/* Header Info */}
      <div className="absolute top-6 left-0 right-0 z-10 flex flex-col items-center px-4">
        <h2 className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">Live Session</h2>
        <a 
            href={context.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors bg-blue-950/30 px-4 py-2 rounded-full border border-blue-900/50 backdrop-blur-sm"
        >
            <span className="truncate max-w-[200px] md:max-w-md">{context.url}</span>
            <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Main Visualizer Area */}
      <div className={`relative z-10 flex flex-col items-center justify-center flex-1 transition-all duration-500 ${showTranscript ? 'md:translate-x-[-200px]' : ''}`}>
        <Visualizer 
            volume={volume} 
            isActive={isConnected} 
            isTalking={isTalking} 
        />
        
        <div className="mt-8 text-center h-20 flex flex-col items-center justify-center">
            {!isConnected && !error && (
                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in">
                    {/* Voice Selection */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Settings2 className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 p-2.5 appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                            {VOICES.map(voice => (
                                <option key={voice.id} value={voice.id}>{voice.name}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                      onClick={connect}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full transition-all shadow-lg shadow-blue-500/25"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span className="font-medium">
                          {initialMessages.length > 0 ? "Fortsetzen" : "Verbindung starten"}
                      </span>
                    </button>
                </div>
            )}
            {error && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-red-400">{error}</span>
                <button 
                  onClick={connect} 
                  className="text-xs text-blue-400 hover:underline"
                >
                  Erneut versuchen
                </button>
              </div>
            )}
            {isConnected && isTalking && (
                <div className="flex flex-col items-center gap-1 animate-in fade-in">
                    <span className="text-cyan-400 font-medium text-lg">Gemini spricht...</span>
                    <span className="text-xs text-slate-500 uppercase tracking-widest">{selectedVoice}</span>
                </div>
            )}
            {isConnected && !isTalking && <span className="text-slate-500 animate-pulse">Zuhören...</span>}
        </div>
      </div>

      {/* Transcript Overlay */}
      <div 
        className={`fixed inset-y-0 right-0 h-full w-full md:w-[400px] bg-slate-900/95 backdrop-blur-md border-l border-slate-800 transform transition-transform duration-300 z-30 flex flex-col ${showTranscript ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <h3 className="text-slate-200 font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Transkript
            </h3>
            <button onClick={() => setShowTranscript(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
            </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
                <div className="text-center text-slate-600 mt-10">
                    <p>Noch keine Nachrichten.</p>
                    <p className="text-xs mt-2">Starten Sie das Gespräch, um das Transkript zu sehen.</p>
                </div>
            ) : (
                messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">
                            {msg.speaker === 'user' ? 'Du' : 'Gemini'}
                        </span>
                        <div 
                            className={`px-4 py-2 rounded-2xl max-w-[90%] text-sm ${
                                msg.speaker === 'user' 
                                ? 'bg-blue-600 text-white rounded-br-none' 
                                : 'bg-slate-800 text-slate-200 rounded-bl-none'
                            }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-20 pb-10 flex gap-6 items-center">
        {isConnected ? (
          <button 
            onClick={disconnect}
            className="p-5 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 border-2 bg-amber-500/20 border-amber-500 text-amber-500 hover:bg-amber-500/30"
            title="Pausieren"
          >
            <Pause className="w-8 h-8 fill-current" />
          </button>
        ) : (
          <button 
            onClick={connect}
            className="p-5 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 border-2 bg-green-500/20 border-green-500 text-green-500 hover:bg-green-500/30"
            title="Verbinden"
          >
            <Mic className="w-8 h-8" />
          </button>
        )}
        
        {/* Toggle Transcript Button */}
        <button 
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-4 rounded-full border-2 transition-all transform hover:scale-105 active:scale-95 ${showTranscript ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
            title="Transkript anzeigen"
        >
            <MessageSquare className="w-6 h-6" />
        </button>

        {/* Note: Removed the Exit button here as Navigation is now handled by Sidebar, but we can keep it as a "Save & Stop" action */}
      </div>

      {/* Grounding Source Info */}
      {context.groundingUrls.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 hidden md:block">
              <div className="bg-slate-900/80 backdrop-blur text-xs text-slate-500 p-2 rounded border border-slate-800">
                  Sources: {context.groundingUrls.length} found
              </div>
          </div>
      )}
    </div>
  );
};

export default LiveInterface;