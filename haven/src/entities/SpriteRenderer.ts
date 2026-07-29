// src/entities/SpriteRenderer.ts
//
// Sprite sheet layout:
//   • Total grid: 12 cols × 8 rows
//   • Per character block: 6 cols × 4 rows
//   • Characters per sheet: 4  (2 chars/sheet-row × 2 sheet-rows)
//   • Source frame size:  sheetW/12  ×  sheetH/8
//
// spriteId format:  "<sheetId>-<charIndex>" or "<basename>-<charIndex>"
//   e.g. "02-0", "8D actor1-1[VS8]-0", or "8D actor1-1[VS8]" (defaults to charIndex 0)

import type { FacingDirection } from './Entity';

// ── Render dimensions (world-space draw size) ──────────────────────────────
export const TILE_W = 32;           // rendered frame width  (px in world space)
export const TILE_H = 32;           // rendered frame height (px in world space)

// ── Sheet layout constants ─────────────────────────────────────────────────
export const CHARS_PER_ROW = 2;     // 2 characters per sheet-row (side by side)
export const CHAR_TILE_W   = 6;     // 6 cols per character block (3 cardinal + 3 diagonal)
export const CHAR_TILE_H   = 4;     // 4 direction rows per character block
export const ANIM_FRAMES   = 3;     // 3 walk frames

// Total source grid dimensions (in frames)
const SHEET_COLS = CHARS_PER_ROW * CHAR_TILE_W;   // 12
const SHEET_ROWS = 2              * CHAR_TILE_H;   //  8

// ── Direction → row index within a character block ─────────────────────────
const DIR_ROW: Record<FacingDirection, number> = {
  down:      0,
  left:      1,
  right:     2,
  up:        3,
  downLeft:  0,
  downRight: 1,
  upLeft:    2,
  upRight:   3,
};

// Whether a direction uses the diagonal column block (cols 3–5)
const DIAGONAL_DIRS = new Set<FacingDirection>(['downLeft', 'downRight', 'upLeft', 'upRight']);

// ── Sheet cache ────────────────────────────────────────────────────────────
const sheetCache = new Map<string, HTMLImageElement>();

/**
 * Parse a spriteId string ("02-1" or "8D actor1-1[VS8]-0") into sheetId and charIndex.
 */
export function parseSpriteId(spriteId: string): { sheetId: string; charIndex: number } {
  if (!spriteId) return { sheetId: '01', charIndex: 0 };
  const lastDash = spriteId.lastIndexOf('-');
  if (lastDash !== -1) {
    const possibleIndex = parseInt(spriteId.slice(lastDash + 1), 10);
    if (!isNaN(possibleIndex) && possibleIndex >= 0 && possibleIndex < 4) {
      return {
        sheetId: spriteId.slice(0, lastDash),
        charIndex: possibleIndex,
      };
    }
  }
  return { sheetId: spriteId, charIndex: 0 };
}

/**
 * Preload a sprite sheet by spriteId or sheetId (e.g. "01-0" -> /sprites/01.png or "8D actor1-1[VS8]").
 */
export function loadSpriteSheet(input: string): Promise<HTMLImageElement> {
  const { sheetId } = parseSpriteId(input);
  const cleanId = sheetId.endsWith('.png') ? sheetId.slice(0, -4) : sheetId;

  if (sheetCache.has(cleanId)) {
    return Promise.resolve(sheetCache.get(cleanId)!);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `/sprites/${cleanId}.png`;
    img.onload = () => {
      sheetCache.set(input, img);
      sheetCache.set(sheetId, img);
      sheetCache.set(cleanId, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${cleanId}`));
  });
}

/**
 * Get a cached sprite sheet. Returns undefined if not yet loaded.
 */
export function getSpriteSheet(input: string): HTMLImageElement | undefined {
  const { sheetId } = parseSpriteId(input);
  const cleanId = sheetId.endsWith('.png') ? sheetId.slice(0, -4) : sheetId;
  return sheetCache.get(input) || sheetCache.get(sheetId) || sheetCache.get(cleanId);
}

/**
 * Draw one character frame onto the canvas context.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  facing: FacingDirection,
  frame: number,
  destX: number,
  destY: number,
  drawW = TILE_W,
  drawH = TILE_H,
): void {
  const { sheetId, charIndex } = parseSpriteId(spriteId);
  const sheet = getSpriteSheet(sheetId);

  if (!sheet) {
    // Fallback if not loaded
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(destX, destY, drawW, drawH);
    return;
  }

  const srcFrameW = sheet.naturalWidth / SHEET_COLS;
  const srcFrameH = sheet.naturalHeight / SHEET_ROWS;

  const charCol = charIndex % CHARS_PER_ROW;
  const charRow = Math.floor(charIndex / CHARS_PER_ROW);

  const charOriginX = charCol * CHAR_TILE_W * srcFrameW;
  const charOriginY = charRow * CHAR_TILE_H * srcFrameH;

  const colOffset = DIAGONAL_DIRS.has(facing) ? 3 : 0;
  const clampedFrame = Math.floor(frame) % ANIM_FRAMES;

  const srcX = charOriginX + (colOffset + clampedFrame) * srcFrameW;
  const srcY = charOriginY + DIR_ROW[facing] * srcFrameH;

  ctx.drawImage(
    sheet,
    srcX, srcY,
    srcFrameW, srcFrameH,
    destX, destY,
    drawW, drawH,
  );
}

/**
 * Draw a static preview of a character (idle down-facing, frame 0).
 */
export function drawSpritePreview(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  destX: number,
  destY: number,
  drawW = TILE_W,
  drawH = TILE_H,
): void {
  const { sheetId, charIndex } = parseSpriteId(spriteId);
  const sheet = getSpriteSheet(sheetId);
  if (!sheet) return;

  const srcFrameW = sheet.naturalWidth / SHEET_COLS;
  const srcFrameH = sheet.naturalHeight / SHEET_ROWS;

  const charCol = charIndex % CHARS_PER_ROW;
  const charRow = Math.floor(charIndex / CHARS_PER_ROW);

  const charOriginX = charCol * CHAR_TILE_W * srcFrameW;
  const charOriginY = charRow * CHAR_TILE_H * srcFrameH;

  ctx.drawImage(
    sheet,
    charOriginX, charOriginY,
    srcFrameW, srcFrameH,
    destX, destY,
    drawW, drawH,
  );
}
