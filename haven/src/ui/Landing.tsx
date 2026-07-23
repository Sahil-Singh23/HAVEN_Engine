// src/ui/Landing.tsx

import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Navbar } from './Navbar';
import { SketchFabModel } from './SketchFabModel';
import { loadSpriteSheet, parseSpriteId, TILE_W, TILE_H, CHAR_PX_W, CHAR_PX_H, CHARS_PER_ROW } from '../entities/SpriteRenderer';

const NICKNAME_KEY = 'haven-nickname';
const SPRITE_KEY   = 'haven-sprite';
const SPRITE_SHEETS = ['01']; // add '02', '03' etc. here to expand the picker
const CHARS_PER_SHEET = 10;   // 5 cols × 2 rows per sheet

interface LandingProps {
  onCreate: (name: string, spriteId: string) => void;
}

/** Renders one sprite preview tile onto a <canvas> */
function SpriteCanvas({ spriteId, size }: { spriteId: string; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;

    const { sheetId, charIndex } = parseSpriteId(spriteId);

    // Try to draw immediately if sheet is already cached, else load and draw
    const draw = (img: HTMLImageElement) => {
      const charCol = charIndex % CHARS_PER_ROW;
      const charRow = Math.floor(charIndex / CHARS_PER_ROW);
      const srcX = charCol * CHAR_PX_W + 1 * TILE_W; // frame 1 = idle
      const srcY = charRow * CHAR_PX_H + 0 * TILE_H; // row 0  = facing down
      ctx.drawImage(img, srcX, srcY, TILE_W, TILE_H, 0, 0, size, size);
    };

    loadSpriteSheet(sheetId).then(draw).catch(() => {
      // fallback: magenta square
      ctx.fillStyle = '#cc44cc';
      ctx.fillRect(0, 0, size, size);
    });
  }, [spriteId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', width: size, height: size }}
    />
  );
}

export function Landing({ onCreate }: LandingProps) {
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICKNAME_KEY) || '');
  const [selectedSprite, setSelectedSprite] = useState(
    () => localStorage.getItem(SPRITE_KEY) || '01-0'
  );

  // Build the full list of spriteIds from all sheets
  const allSpriteIds: string[] = [];
  for (const sheet of SPRITE_SHEETS) {
    for (let i = 0; i < CHARS_PER_SHEET; i++) {
      allSpriteIds.push(`${sheet}-${i}`);
    }
  }

  // Persist nickname to localStorage on change
  useEffect(() => {
    if (nickname.trim()) {
      localStorage.setItem(NICKNAME_KEY, nickname.trim());
    }
  }, [nickname]);

  // Persist sprite selection
  useEffect(() => {
    localStorage.setItem(SPRITE_KEY, selectedSprite);
  }, [selectedSprite]);

  const handleCreate = () => {
    const name = nickname.trim() || 'Anon';
    localStorage.setItem(NICKNAME_KEY, name);
    onCreate(name, selectedSprite);
  };

  const PREVIEW_SIZE = 40; // px each cell renders at

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

            {/* ── Sprite Picker ── */}
            <div className="flex flex-col gap-3 mb-6">
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#9494A9',
                  fontFamily: '"roobert", "roobert Fallback", sans-serif',
                }}
              >
                Choose your character
              </p>

              {/* Character grid */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {allSpriteIds.map((spriteId) => {
                  const isSelected = selectedSprite === spriteId;
                  return (
                    <button
                      key={spriteId}
                      onClick={() => setSelectedSprite(spriteId)}
                      title={`Character ${spriteId}`}
                      style={{
                        width: PREVIEW_SIZE + 10,
                        height: PREVIEW_SIZE + 10,
                        border: isSelected
                          ? '2px solid #2E2E38'
                          : '2px solid transparent',
                        borderRadius: '10px',
                        background: isSelected ? '#E8E8F0' : '#EDEDF3',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                        padding: 0,
                        flexShrink: 0,
                      }}
                    >
                      <SpriteCanvas spriteId={spriteId} size={PREVIEW_SIZE} />
                    </button>
                  );
                })}
              </div>
            </div>

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
