import type { RemoteEntity } from './Entity';
import { getFacingFromVector } from './LocalController';

const FRAME_DURATION = 0.15;

export function updateRemoteEntity(entity: RemoteEntity, now: number, dt: number): void {
  const prevX = entity.position.x;
  const prevY = entity.position.y;

  const pos = entity.interpolationBuffer.getPosition(now);
  if (pos) {
    entity.position.x = pos.x;
    entity.position.y = pos.y;
  }

  const dx = entity.position.x - prevX;
  const dy = entity.position.y - prevY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const isMoving = dist > 0.05;
  entity.isMoving = isMoving;

  if (isMoving) {
    const facing = getFacingFromVector(dx, dy);
    if (facing) {
      entity.facing = facing;
    }

    entity.animTimer += dt;
    if (entity.animTimer >= FRAME_DURATION) {
      entity.animTimer -= FRAME_DURATION;
      entity.animFrame = (entity.animFrame + 1) % 3;
    }
  } else {
    entity.animFrame = 0;
    entity.animTimer = 0;
  }
}
