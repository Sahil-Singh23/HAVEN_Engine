// src/ui/NicknameModal.tsx

import { useState } from 'react';

const NICKNAME_KEY = 'haven-nickname';

interface NicknameModalProps {
  onSubmit: (name: string) => void;
}

export function NicknameModal({ onSubmit }: NicknameModalProps) {
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICKNAME_KEY) || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickname.trim() || 'Anon';
    localStorage.setItem(NICKNAME_KEY, name);
    onSubmit(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 w-[340px] mx-4"
        style={{ fontFamily: '"roobert", "roobert Fallback", sans-serif' }}
      >
        <h2 
          className="text-2xl tracking-tight"
          style={{ color: "#2E2E38", fontFamily: "'Gilda Display', serif", fontWeight: 400 }}
        >
          Enter your nickname
        </h2>

        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          placeholder="Nickname"
          maxLength={20}
          autoFocus
          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base outline-none focus:border-gray-500 transition text-center"
        />

        <button
          type="submit"
          className="w-full px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition font-semibold text-base cursor-pointer border-none"
        >
          Join Room
        </button>
      </form>
    </div>
  );
}
