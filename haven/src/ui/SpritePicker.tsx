// src/ui/SpritePicker.tsx

import { useEffect } from 'react';
import { SpriteCanvas } from './SpriteCanvas';
import { loadSpriteSheet, parseSpriteId } from '../entities/SpriteRenderer';

export const PICKER_SPRITES = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
  '29',
  '30',
  '31',
  '32',
  '33',
];

interface SpritePickerProps {
  selectedSprite: string;
  onSelect: (spriteId: string) => void;
}

export function SpritePicker({ selectedSprite, onSelect }: SpritePickerProps) {
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

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: 10,
        maxWidth: '100%',
        scrollbarWidth: 'thin',
      }}
    >
      {PICKER_SPRITES.map((spriteId) => {
        const isSelected = selectedSprite === spriteId;
        return (
          <button
            key={spriteId}
            type="button"
            onClick={() => onSelect(spriteId)}
            title={spriteId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 100,
              padding: 4,
              borderRadius: 12,
              border: isSelected ? '1px solid #2E2E38' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              transform: isSelected ? 'scale(1.08)' : 'scale(1)',
              flexShrink: 0,
            }}
          >
            <SpriteCanvas spriteId={spriteId} size={100} />
          </button>
        );
      })}
    </div>
  );
}
