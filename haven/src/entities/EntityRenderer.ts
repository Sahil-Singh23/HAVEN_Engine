import type { AnyEntity } from './Entity';
import type { Camera } from '../engine/Camera';
import { drawSprite, TILE_W, TILE_H } from './SpriteRenderer';

export function renderEntities(
  ctx: CanvasRenderingContext2D,
  entities: AnyEntity[],
  camera: Camera,
  names?: Map<string, string>
): void {
  // Y-sort for pseudo-3D depth ordering (based on collision box bottom)
  const sorted = [...entities].sort((a, b) => {
    const aBottom = a.position.y + a.size.height;
    const bBottom = b.position.y + b.size.height;
    if (aBottom === bBottom) return a.position.x - b.position.x;
    return aBottom - bBottom;
  });

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  for (const entity of sorted) {
    // Calculate draw position:
    // Center sprite horizontally over 12×12 hitbox
    const drawX = entity.position.x + entity.size.width / 2 - TILE_W / 2;
    // Align sprite feet with bottom of 12×12 hitbox
    const drawY = entity.position.y + entity.size.height - TILE_H;

    // Draw sprite via SpriteRenderer
    drawSprite(
      ctx,
      entity.sprite,
      entity.facing,
      entity.animFrame,
      drawX,
      drawY,
      TILE_W,
      TILE_H
    );

    // Player name label position (above top of visual sprite head)
    const label = names?.get(entity.id) || entity.id.slice(0, 6);
    const centerX = entity.position.x + entity.size.width / 2;
    const labelY = drawY + 7;

    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Dark outline for readability
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeText(label, centerX, labelY);

    // White fill
    ctx.fillStyle = 'rgba(248, 246, 229, 1)';
    ctx.fillText(label, centerX, labelY);
  }

  ctx.restore();
}
