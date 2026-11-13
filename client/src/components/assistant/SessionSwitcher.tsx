import React from 'react';
import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messageCount: number;
}

interface SessionSwitcherProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (id: string) => void;
}

export const SessionSwitcher: React.FC<SessionSwitcherProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 px-1">
        <span>Chat Sessions</span>
        <button
          onClick={onNewSession}
          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-none">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
              activeSessionId === s.id
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{s.title}</span>
            </div>
            {onDeleteSession && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(s.id);
                }}
                className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
