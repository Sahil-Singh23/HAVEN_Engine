// src/entities/SpriteRenderer.ts
//
// Sprite sheet layout (e.g. public/sprites/01.png):
//   • Sheet size: 240 × 128 px
//   • Tile size:  16 × 16 px  (TILE_W / TILE_H)
//   • Each character: 3 tiles wide × 4 tiles tall (48 × 64 px)
//   • Characters per sheet-row: 5   (15 tile-columns ÷ 3)
//   • Character rows per sheet: 2   (8  tile-rows    ÷ 4)
//   • Total characters per sheet: 10
//
// spriteId format:  "<sheetId>-<charIndex>"
//   e.g. "01-3"  → file public/sprites/01.png, character index 3
//        "02-0"  → file public/sprites/02.png, character index 0 (custom sheet)
//
// Animation rows inside each character block:
//   Row 0 → walk DOWN
//   Row 1 → walk LEFT
//   Row 2 → walk RIGHT
//   Row 3 → walk UP

import type { FacingDirection } from './Entity';

export const TILE_W = 16;
export const TILE_H = 16;
export const CHARS_PER_ROW = 5;         // 5 characters per sheet row
export const CHAR_TILE_W = 3;           // each char is 3 tiles wide
export const CHAR_TILE_H = 4;           // each char is 4 tiles tall (= 4 directions)
export const ANIM_FRAMES = 3;           // 3 walk frames per direction

export const CHAR_PX_W = TILE_W * CHAR_TILE_W;  // 48px
export const CHAR_PX_H = TILE_H * CHAR_TILE_H;  // 64px

const DIR_ROW: Record<FacingDirection, number> = {
  down:  0,
  left:  1,
  right: 2,
  up:    3,
};

// Cache of loaded HTMLImageElements keyed by sheet filename (e.g. "01")
const sheetCache = new Map<string, HTMLImageElement>();

/**
 * Preload a sprite sheet by sheetId (e.g. "01" → /sprites/01.png).
 * Returns a promise that resolves when the image is ready.
 */
export function loadSpriteSheet(sheetId: string): Promise<HTMLImageElement> {
  if (sheetCache.has(sheetId)) {
    return Promise.resolve(sheetCache.get(sheetId)!);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `/sprites/${sheetId}.png`;
    img.onload = () => {
      sheetCache.set(sheetId, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${sheetId}.png`));
  });
}

/**
 * Get a cached sprite sheet. Returns undefined if not yet loaded.
 */
export function getSpriteSheet(sheetId: string): HTMLImageElement | undefined {
  return sheetCache.get(sheetId);
}

/**
 * Parse a spriteId string ("01-3") into its parts.
 */
export function parseSpriteId(spriteId: string): { sheetId: string; charIndex: number } {
  const parts = spriteId.split('-');
  const sheetId = parts[0] ?? '01';
  const charIndex = parseInt(parts[1] ?? '0', 10);
  return { sheetId, charIndex: isNaN(charIndex) ? 0 : charIndex };
}

/**
 * Draw one character frame onto the canvas context.
 *
 * @param ctx     Canvas 2D context (already transformed by camera)
 * @param spriteId e.g. "01-3"
 * @param facing  direction the character is facing
 * @param frame   animation frame index (0, 1, or 2)
 * @param destX   world X to draw at
 * @param destY   world Y to draw at
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  facing: FacingDirection,
  frame: number,
  destX: number,
  destY: number,
): void {
  const { sheetId, charIndex } = parseSpriteId(spriteId);
  const sheet = sheetCache.get(sheetId);

  if (!sheet) {
    // Sheet not loaded yet — draw a magenta fallback square
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(destX, destY, TILE_W, TILE_H);
    return;
  }

  // Which character column/row on the sheet?
  const charCol = charIndex % CHARS_PER_ROW;
  const charRow = Math.floor(charIndex / CHARS_PER_ROW);

  // Top-left pixel of this character's block on the sheet
  const charOriginX = charCol * CHAR_PX_W;
  const charOriginY = charRow * CHAR_PX_H;

  // Source tile within the character block
  const srcX = charOriginX + frame * TILE_W;
  const srcY = charOriginY + DIR_ROW[facing] * TILE_H;

  ctx.drawImage(
    sheet,
    srcX, srcY,          // source top-left
    TILE_W, TILE_H,      // source size (16×16)
    destX, destY,        // destination top-left (world coords)
    TILE_W, TILE_H,      // destination size (drawn at 1:1; camera zoom scales it)
  );
}

/**
 * Draw a static preview of a character (idle/down-facing middle frame).
 * Useful for the sprite picker UI.
 *
 * @param ctx       Canvas 2D context (no camera transform — screen coords)
 * @param spriteId  e.g. "01-3"
 * @param destX     Screen X
 * @param destY     Screen Y
 * @param scale     Draw scale multiplier (default 2 → 32×32px preview)
 */
export function drawSpritePreview(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  destX: number,
  destY: number,
  scale = 2,
): void {
  const { sheetId, charIndex } = parseSpriteId(spriteId);
  const sheet = sheetCache.get(sheetId);
  if (!sheet) return;

  const charCol = charIndex % CHARS_PER_ROW;
  const charRow = Math.floor(charIndex / CHARS_PER_ROW);

  // Idle = middle frame (1), facing down (row 0)
  const srcX = charCol * CHAR_PX_W + 1 * TILE_W;
  const srcY = charRow * CHAR_PX_H + 0 * TILE_H;

  ctx.drawImage(
    sheet,
    srcX, srcY,
    TILE_W, TILE_H,
    destX, destY,
    TILE_W * scale, TILE_H * scale,
  );
}
