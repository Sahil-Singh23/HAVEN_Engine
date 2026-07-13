// src/ui/CodeHud.tsx

import { useState } from 'react';

interface CodeHudProps {
  instanceCode: string;
  onExit?: () => void;
}

export function CodeHud({ instanceCode, onExit }: CodeHudProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const link = `${window.location.origin}/join/${instanceCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed top-3 left-3 flex flex-col gap-2 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200/60 text-gray-600 px-3.5 py-2 rounded-xl pointer-events-auto flex items-center gap-2 text-xs shadow-sm">
        <span className="text-gray-400 font-medium">Code:</span>
        <strong className="text-[#635bff] font-mono text-sm font-bold tracking-wide">{instanceCode}</strong>
        <button 
          className="bg-transparent border-none text-gray-400 hover:text-[#635bff] cursor-pointer p-0.5 transition-colors flex items-center" 
          onClick={copyLink} 
          title="Copy invite link"
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </div>

      {onExit && (
        <button
          onClick={onExit}
          className="bg-transparent text-red-500 hover:text-red-500 hover:bg-red-50/20 px-3.5 py-2 rounded-xl pointer-events-auto flex items-center justify-center gap-2 text-xs font-bold cursor-pointer transition-all border-none w-fit"
          style={{
            filter: "drop-shadow(0px 1.5px 3px rgba(0,0,0,0.9)) drop-shadow(0px 4px 12px rgba(0,0,0,0.6))"
            
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
