// src/ui/SpriteCanvas.tsx

import { useEffect, useRef } from 'react';
import { drawSpritePreview, loadSpriteSheet, parseSpriteId } from '../entities/SpriteRenderer';

interface SpriteCanvasProps {
  spriteId: string;
  size?: number; // width/height in px
}

export function SpriteCanvas({ spriteId, size = 150 }: SpriteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { sheetId } = parseSpriteId(spriteId);
    let active = true;

    loadSpriteSheet(sheetId).then(() => {
      if (!active) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      drawSpritePreview(ctx, spriteId, 0, 0, canvas.width, canvas.height);
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [spriteId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  );
}
