// src/ui/Landing.tsx

import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Navbar } from './Navbar';
import { SketchFabModel } from './SketchFabModel';

const NICKNAME_KEY = 'haven-nickname';

interface LandingProps {
  onCreate: (name: string) => void;
}

export function Landing({ onCreate }: LandingProps) {
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICKNAME_KEY) || '');

  // Persist nickname to localStorage on change
  useEffect(() => {
    if (nickname.trim()) {
      localStorage.setItem(NICKNAME_KEY, nickname.trim());
    }
  }, [nickname]);

  const handleCreate = () => {
    const name = nickname.trim() || 'Anon';
    localStorage.setItem(NICKNAME_KEY, name);
    onCreate(name);
  };

  return (
    <div 
      className="w-full min-h-[100dvh]"
      style={{ backgroundColor: "#F9F9FB" }}
    >
      {/* Content Container */}
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* Navigation Bar */}
        <Navbar />

        {/* Hero Section */}
        <div className="flex-1 flex flex-col-reverse lg:flex-row items-stretch lg:items-start mt-4 lg:mt-14 px-6 md:px-16 text-left lg:gap-12">
          {/* Left Content */}
          <div className="flex flex-col w-full lg:flex-1 lg:mt-34 pb-12 lg:pb-0" style={{ minWidth: 0 }}>
            {/* Main Heading */}
            <h1 
              className="text-4xl md:text-[85px] leading-tight -mb-4 md:-mb-8 tracking-[-2px] md:tracking-[-4px]"
              style={{ color: "#2E2E38", fontFamily: "'Gilda Display', serif", fontWeight: 200 }}
            >
              Haven
            </h1>

            {/* Subtitle */}
            <h2 
              className="text-4xl md:text-[80px] leading-tight mt-2 tracking-[-2px] md:tracking-[-4px]"
              style={{ color: "#9494A9", fontFamily: "'Gilda Display', serif", fontWeight: 200 }}
            >
              Interactive world
            </h2>

            {/* Description */}
            <p 
              className="text-base md:text-xl max-w-2xl ml-1 leading-relaxed mb-8 text-left md:text-justify"
              style={{ color: "#9494A9", fontFamily: '"roobert", "roobert Fallback", sans-serif' }}
            >
              Haven is a virtual workspace designed for seamless collaboration — one where you can meet, chat, and work together naturally, as if you're in the same room.
            </p>

            {/* Nickname + CTA Section */}
            <div className="flex flex-col gap-5 items-start">
              <div className="flex flex-wrap items-center gap-4">
                {/* Nickname input */}
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                  placeholder="Your nickname"
                  maxLength={20}
                  className="px-5 py-4 rounded-full border border-gray-300 text-base outline-none focus:border-gray-500 transition w-48"
                  style={{ fontFamily: '"roobert", "roobert Fallback", sans-serif' }}
                />

                {/* Create Space */}
                <button 
                  className="px-8 py-4 bg-black text-white rounded-full hover:bg-gray-800 transition font-semibold flex items-center justify-center gap-2.5 shadow-lg hover:shadow-xl cursor-pointer border-none flex-shrink-0 text-base"
                  style={{ fontFamily: '"roobert", "roobert Fallback", sans-serif' }}
                  onClick={handleCreate}
                >
                  <span>Create Room</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Mobile spacer */}
            <div className="block lg:hidden" style={{ height: 150 }} />
          </div>

          {/* Right Content - 3D Model */}
          <div 
            style={{ minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }} 
            className="flex w-full lg:flex-1"
          >
            <SketchFabModel />
          </div>
        </div>
      </div>
    </div>
  );
}
