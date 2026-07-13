// src/ui/ShareModal.tsx

import { useState } from 'react';

interface ShareModalProps {
  instanceCode: string;
  onClose: () => void;
}

export function ShareModal({ instanceCode, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join/${instanceCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" 
        onClick={onClose} 
      />
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-[340px] p-6 flex flex-col gap-4">
        <h3 className="text-lg font-bold text-gray-900">Share Room Link</h3>
        <p className="text-sm text-gray-500">Copy this link and share it with others:</p>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2.5">
          <span className="flex-1 text-xs text-gray-600 font-mono truncate select-all">
            {link}
          </span>
          <button
            className={`px-3 py-1.5 rounded-md text-xs font-semibold border-none cursor-pointer transition-all duration-150 ${
              copied 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-200 shadow-sm'
            }`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          className="w-full py-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold border-none cursor-pointer transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
