// src/ui/ChatPanel.tsx

import { useState, useRef, useEffect } from 'react';
import type { ChatMode } from '../shared/types';

interface ChatMessage {
  id: string;
  senderName: string;
  mode: string;
  text: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  onSendChat: (text: string) => void;
}

export function ChatPanel({ messages, chatMode, onChatModeChange, onSendChat }: ChatPanelProps) {
  const [chatInput, setChatInput] = useState('');
  const [expanded, setExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const isMobileOrTablet = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024;
      return !isMobileOrTablet;
    }
    return true;
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    onSendChat(trimmed);
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-3 right-3 lg:right-auto lg:left-3 pointer-events-auto">
      {expanded ? (
        <div className="w-[300px] bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-sm flex flex-col max-h-[280px] overflow-hidden">
          {/* Chat tab header with underline style */}
          <div className="flex items-center border-b border-gray-100">
            <div className="flex flex-1">
              {(['global', 'room', 'nearby'] as ChatMode[]).map(mode => (
                <button
                  key={mode}
                  className={`
                    flex-1 py-2.5 px-2 text-center bg-transparent border-none text-xs font-semibold cursor-pointer transition-all duration-150
                    ${chatMode === mode 
                      ? 'text-gray-900 border-b-2 border-gray-900' 
                      : 'text-gray-400 border-b-2 border-transparent hover:text-gray-600'}
                  `}
                  onClick={() => onChatModeChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            {/* Collapse button */}
            <button
              className="px-2.5 py-2.5 bg-transparent border-none text-gray-400 hover:text-gray-600 cursor-pointer transition-colors flex items-center"
              onClick={() => setExpanded(false)}
              title="Collapse chat"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 15 12 9 18 15" />
              </svg>
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3.5 py-2 min-h-[100px] max-h-[170px]">
            {messages.map(msg => (
              <div key={msg.id} className="py-1 text-xs leading-relaxed text-gray-500 break-words">
                <span className="text-gray-800 font-bold mr-1">{msg.senderName}</span>
                <span className="text-gray-400 text-[9px] bg-gray-100 rounded-full px-1.5 py-0.5 mr-1 font-medium">{msg.mode}</span>
                <span className="text-gray-600">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          
          {/* Input */}
          <div className="flex gap-2 items-center px-3 py-2.5 border-t border-gray-100">
            <input
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs focus:outline-none focus:border-[#635bff] focus:ring-1 focus:ring-[#635bff]/30 placeholder-gray-400 transition-all"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Please enter your chat..."
            />
            <button 
              className="w-8 h-8 bg-gray-300 hover:bg-[#635bff] text-white rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 shrink-0 border-none" 
              onClick={handleSend}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed chat — small pill button */
        <button
          className="bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl shadow-sm px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 cursor-pointer flex items-center gap-2 transition-colors"
          onClick={() => setExpanded(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Chat
        </button>
      )}
    </div>
  );
}
