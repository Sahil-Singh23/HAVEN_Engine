import type { RemoteEntity } from './Entity';

const ANIM_SPEED = 0.15;

export function updateRemoteEntity(entity: RemoteEntity, now: number, dt: number): void {
  const oldX = entity.position.x;
  const oldY = entity.position.y;

  const pos = entity.interpolationBuffer.getPosition(now);
  if (pos) {
    entity.position.x = pos.x;
    entity.position.y = pos.y;
  }

  // Infer facing direction from movement delta
  const dx = entity.position.x - oldX;
  const dy = entity.position.y - oldY;
  const moving = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01;

  if (Math.abs(dy) >= Math.abs(dx)) {
    if (dy > 0.01) entity.facing = 'down';
    else if (dy < -0.01) entity.facing = 'up';
  } else {
    if (dx > 0.01) entity.facing = 'right';
    else if (dx < -0.01) entity.facing = 'left';
  }

  // Animate walk frames while moving
  if (moving) {
    entity.animTimer += dt;
    if (entity.animTimer >= ANIM_SPEED) {
      entity.animTimer -= ANIM_SPEED;
      entity.animFrame = (entity.animFrame + 1) % 3;
    }
  } else {
    entity.animFrame = 1;
    entity.animTimer = 0;
  }
}
