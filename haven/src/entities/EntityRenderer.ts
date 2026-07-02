import type { AnyEntity } from './Entity';
import type { Camera } from '../engine/Camera';

export function renderEntities(
  ctx: CanvasRenderingContext2D,
  entities: AnyEntity[],
  camera: Camera
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

  for (const entity of sorted) {
    ctx.fillStyle = entity.color;
    ctx.fillRect(
      entity.position.x,
      entity.position.y,
      entity.size.width,
      entity.size.height
    );
  }

  ctx.restore();
}
