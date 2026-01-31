import React, { useState, useEffect } from 'react';
import { GoogleGenAI, SchemaType } from '@google/genai';
import { AppState, WebsiteContext, SavedSession, ChatMessage } from './types';
import UrlInput from './components/UrlInput';
import LiveInterface from './components/LiveInterface';
import Sidebar from './components/Sidebar';
import { getSessions, saveSession, deleteSession } from './utils/storage';
import { Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [context, setContext] = useState<WebsiteContext | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleUrlSubmit = async (url: string) => {
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Besuche die folgende URL: ${url}
        
        Deine Aufgaben:
        1. Extrahiere den VOLLSTÄNDIGEN Haupttext der Webseite (Artikel, Blogpost, Transkript etc.). Kürze nichts weg. Ich brauche alle Details.
        2. Erstelle eine kurze Zusammenfassung (max. 3 Sätze) für die Übersicht.
        3. Erstelle einen kurzen, prägnanten Titel (max. 5 Wörter).
        
        Gib das Ergebnis strikt als JSON zurück.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: "Ein kurzer Titel für das Gespräch" },
              summary: { type: 'STRING', description: "Eine sehr kurze Zusammenfassung für die UI (max 3 Sätze)" },
              fullContent: { type: 'STRING', description: "Der vollständige, detaillierte Textinhalt der Webseite ohne Kürzungen." }
            },
            required: ['title', 'summary', 'fullContent']
          }
        }
      });

      const jsonText = response.text || '{}';
      let data;
      try {
        data = JSON.parse(jsonText);
      } catch (e) {
        console.error("JSON parse error", e);
        // Fallback for malformed JSON
        data = {
            title: new URL(url).hostname,
            summary: "Konnte Inhalt nicht strukturieren.",
            fullContent: response.text || ""
        };
      }
      
      const title = data.title || new URL(url).hostname;
      const summary = data.summary || "Keine Zusammenfassung verfügbar.";
      const fullContent = data.fullContent || summary; // Fallback

      const groundingUrls: string[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            groundingUrls.push(chunk.web.uri);
          }
        });
      }

      const newContext: WebsiteContext = { url, summary, fullContent, groundingUrls };
      const newSessionId = Date.now().toString();

      // Create initial session
      const newSession: SavedSession = {
        id: newSessionId,
        title,
        context: newContext,
        messages: [],
        lastUpdated: Date.now()
      };
      
      saveSession(newSession);
      setSessions(getSessions());
      
      // Select the new session
      setContext(newContext);
      setCurrentSessionId(newSessionId);
      setCurrentMessages([]);
      setAppState(AppState.READY_TO_CHAT);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Konnte die Webseite nicht analysieren. Bitte überprüfe die URL oder versuche es später noch einmal.");
      setAppState(AppState.IDLE);
    }
  };

  const handleStartLive = () => {
    setAppState(AppState.LIVE_ACTIVE);
  };

  const handleSelectSession = (session: SavedSession) => {
    // Migration helper: If old session doesn't have fullContent, use summary
    const safeContext = {
        ...session.context,
        fullContent: session.context.fullContent || session.context.summary
    };
    
    setContext(safeContext);
    setCurrentSessionId(session.id);
    setCurrentMessages(session.messages);
    setAppState(AppState.LIVE_ACTIVE); 
    setIsMobileMenuOpen(false);
  };

  const handleNewChat = () => {
    setAppState(AppState.IDLE);
    setContext(null);
    setCurrentSessionId(null);
    setCurrentMessages([]);
    setIsMobileMenuOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const newSessions = getSessions();
    setSessions(newSessions);

    if (currentSessionId === id) {
        handleNewChat();
    }
  };

  const handleExitLive = (finalMessages: ChatMessage[]) => {
    if (currentSessionId && context) {
      const session: SavedSession = {
        id: currentSessionId,
        title: sessions.find(s => s.id === currentSessionId)?.title || context.url,
        context: context,
        messages: finalMessages,
        lastUpdated: Date.now()
      };
      saveSession(session);
      setSessions(getSessions());
      
      setCurrentMessages(finalMessages);
    }
    
    setAppState(AppState.LIVE_ACTIVE); 
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Mobile Header Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-slate-800 rounded-md text-white border border-slate-700 shadow-lg"
        >
            {isMobileMenuOpen ? <X className="w-6 h-6"/> : <Menu className="w-6 h-6"/>}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
          <Sidebar 
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
          />
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden bg-slate-950">
        
        {/* Scenario 1: Analyzing / Loading */}
        {appState === AppState.ANALYZING && (
            <div className="flex-1 flex items-center justify-center">
                 <UrlInput onUrlSubmit={() => {}} isLoading={true} />
            </div>
        )}

        {/* Scenario 2: New Chat (IDLE & No Active Session) */}
        {appState === AppState.IDLE && !currentSessionId && (
             <div className="flex-1 flex items-center justify-center p-4">
                 <div className="w-full max-w-2xl">
                    <UrlInput onUrlSubmit={handleUrlSubmit} isLoading={false} />
                    {errorMsg && (
                        <div className="mt-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-300 text-center animate-in fade-in">
                        {errorMsg}
                        </div>
                    )}
                 </div>
             </div>
        )}

        {/* Scenario 3: Ready to Chat (Analysis Done, waiting for user to start) */}
        {appState === AppState.READY_TO_CHAT && context && (
             <div className="flex-1 flex items-center justify-center p-4 animate-in fade-in">
                 <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 max-w-2xl w-full shadow-2xl backdrop-blur-sm">
                    <h2 className="text-2xl font-bold text-white mb-4">Bereit zum Gespräch</h2>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 mb-6">
                        <p className="text-slate-400 text-sm leading-relaxed max-h-60 overflow-y-auto">
                            {context.summary}
                        </p>
                        {/* Debug hint regarding full content length */}
                        <p className="text-slate-600 text-xs mt-4 italic border-t border-slate-800 pt-2">
                           Voller Kontext geladen: {context.fullContent.length} Zeichen
                        </p>
                    </div>
                    <div className="flex justify-center gap-4">
                         <button 
                            onClick={handleNewChat}
                            className="px-6 py-3 rounded-full text-slate-400 hover:text-white transition-colors"
                         >
                            Abbrechen
                         </button>
                         <button 
                            onClick={handleStartLive}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-medium shadow-lg shadow-blue-500/25 transition-all transform hover:scale-105"
                         >
                            Gespräch starten
                         </button>
                    </div>
                 </div>
             </div>
        )}

        {/* Scenario 4: Live Active (or Paused View of a Chat) */}
        {appState === AppState.LIVE_ACTIVE && context && (
             <LiveInterface 
                context={context}
                initialMessages={currentMessages}
                onExit={handleExitLive}
             />
        )}
      </main>
    </div>
  );
};

export default App;