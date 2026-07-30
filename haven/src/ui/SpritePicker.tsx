// src/ui/SpritePicker.tsx

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SpriteCanvas } from './SpriteCanvas';
import { loadSpriteSheet, parseSpriteId } from '../entities/SpriteRenderer';

export const PICKER_SPRITES = [
  '01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33'
];

interface SpritePickerProps {
  selectedSprite: string;
  onSelect: (spriteId: string) => void;
}

export function SpritePicker({ selectedSprite, onSelect }: SpritePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    // Preload sheets
    const sheetsToLoad = new Set<string>();
    for (const spriteId of PICKER_SPRITES) {
      const { sheetId } = parseSpriteId(spriteId);
      sheetsToLoad.add(sheetId);
    }
    for (const sheetId of sheetsToLoad) {
      loadSpriteSheet(sheetId).catch(() => {});
    }
  }, []);

  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, []);

  // Ensure selected sprite is scrolled into view when changed
  useEffect(() => {
    if (!containerRef.current) return;
    const selectedEl = containerRef.current.querySelector<HTMLButtonElement>(
      `[data-sprite-id="${selectedSprite}"]`
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [selectedSprite]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = direction === 'left' ? -220 : 220;
    containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative w-full group py-1">
      <style>{`
        .sprite-picker-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Left Scroll Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-gray-800 border border-gray-200 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Left Gradient Fade */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/90 via-white/50 to-transparent z-10 pointer-events-none rounded-l-xl" />
      )}

      {/* Sprite Scroll List */}
      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto overflow-y-hidden py-2 px-2 scroll-smooth sprite-picker-scroll"
        style={{
          maxWidth: '100%',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {PICKER_SPRITES.map((spriteId) => {
          const isSelected = selectedSprite === spriteId;
          return (
            <button
              key={spriteId}
              data-sprite-id={spriteId}
              type="button"
              onClick={() => onSelect(spriteId)}
              title={`Character ${spriteId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 80,
                height: 100,
                padding: 4,
                borderRadius: 12,
                border: isSelected ? '2px solid #2E2E38' : '2px solid transparent',
                backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                flexShrink: 0,
              }}
              className="hover:bg-gray-100/60"
            >
              <SpriteCanvas spriteId={spriteId} size={100} />
            </button>
          );
        })}
      </div>

      {/* Right Gradient Fade */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 via-white/50 to-transparent z-10 pointer-events-none rounded-r-xl" />
      )}

      {/* Right Scroll Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-gray-800 border border-gray-200 shadow-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 shadow-indigo-100"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}

