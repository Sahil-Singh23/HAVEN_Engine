import type { AnyEntity } from './Entity';
import type { Camera } from '../engine/Camera';
import { drawSprite } from './SpriteRenderer';

export function renderEntities(
  ctx: CanvasRenderingContext2D,
  entities: AnyEntity[],
  camera: Camera,
  names?: Map<string, string>
): void {
  // Sort by Y position so lower entities draw on top (pseudo-3D Y-sort depth-ordering)
  const sorted = [...entities].sort((a, b) => {
    // Tie-break by x position for stable sorting if y is identical
    if (a.position.y === b.position.y) {
      return a.position.x - b.position.x;
    }
    return a.position.y - b.position.y;
  });

  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  // Disable smoothing so pixel-art sprites stay crisp
  ctx.imageSmoothingEnabled = false;

  for (const entity of sorted) {
    // Draw the sprite tile at the entity's world position
    drawSprite(
      ctx,
      entity.spriteId,
      entity.facing,
      entity.animFrame,
      entity.position.x,
      entity.position.y,
    );

    // Draw player name above entity
    const label = names?.get(entity.id) || entity.id.slice(0, 6);
    const centerX = entity.position.x + entity.size.width / 2;
    const labelY = entity.position.y - 4;

    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Dark outline for readability on any background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeText(label, centerX, labelY);

    // White fill
    ctx.fillStyle = 'rgba(248, 246, 229, 1)';
    ctx.fillText(label, centerX, labelY);
  }

  ctx.restore();
}
