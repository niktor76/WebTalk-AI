import React from 'react';
import { SavedSession } from '../types';
import { MessageSquare, Plus, Trash2, Globe, Clock } from 'lucide-react';

interface SidebarProps {
  sessions: SavedSession[];
  currentSessionId: string | null;
  onSelectSession: (session: SavedSession) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  currentSessionId, 
  onSelectSession, 
  onNewChat, 
  onDeleteSession,
  className = ''
}) => {
  return (
    <div className={`flex flex-col h-full bg-slate-900 border-r border-slate-800 w-72 flex-shrink-0 transition-all ${className}`}>
      {/* Header / New Chat */}
      <div className="p-4 border-b border-slate-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="font-medium">Neuer Chat</span>
        </button>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-600">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-xs">Noch keine Gespräche.</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session)}
              className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border border-transparent ${
                currentSessionId === session.id
                  ? 'bg-slate-800 border-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex-shrink-0">
                 {/* Icon based on context */}
                 <Globe className={`w-4 h-4 ${currentSessionId === session.id ? 'text-blue-400' : 'text-slate-600'}`} />
              </div>
              
              <div className="flex-1 min-w-0 overflow-hidden">
                <h4 className="text-sm font-medium truncate">
                    {session.title || "Unbenanntes Gespräch"}
                </h4>
                <div className="flex items-center gap-1 text-[10px] opacity-60 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                         {new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.lastUpdated))}
                    </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className={`p-1.5 rounded-md text-slate-500 hover:bg-red-900/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ${currentSessionId === session.id ? 'opacity-100' : ''}`}
                title="Löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-600">
        <div className="flex justify-between items-center">
            <span>WebTalk AI</span>
            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;