import React from 'react';
import { SavedSession } from '../types';
import { MessageSquare, Trash2, Clock, PlayCircle } from 'lucide-react';

interface ChatListProps {
  sessions: SavedSession[];
  onResume: (session: SavedSession) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
}

const ChatList: React.FC<ChatListProps> = ({ sessions, onResume, onDelete, onNewChat }) => {
  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    }).format(new Date(ts));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-in fade-in">
      
      <div className="flex justify-between items-end mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Deine Gespräche</h1>
            <p className="text-slate-400">Setze begonnene Unterhaltungen fort oder starte neu.</p>
        </div>
        <button 
            onClick={onNewChat}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95"
        >
            + Neues Gespräch
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
            <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Keine gespeicherten Gespräche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map(session => (
                <div key={session.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-xs text-blue-400 font-medium bg-blue-950/40 px-2 py-1 rounded">
                             <Clock className="w-3 h-3" />
                             {formatDate(session.lastUpdated)}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                            className="text-slate-600 hover:text-red-400 p-2 rounded-full hover:bg-slate-800 transition-colors"
                            title="Löschen"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    
                    <h3 className="text-white font-medium text-lg mb-2 line-clamp-1">{session.title || session.context.url}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-4 h-10">
                        {session.messages.length > 0 
                            ? session.messages[session.messages.length - 1].text 
                            : session.context.summary}
                    </p>
                    
                    <button 
                        onClick={() => onResume(session)}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg transition-colors border border-slate-700"
                    >
                        <PlayCircle className="w-4 h-4" />
                        Fortsetzen
                    </button>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;