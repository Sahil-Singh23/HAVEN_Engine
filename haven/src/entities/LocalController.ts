import type { LocalEntity } from './Entity';
import type { CollisionGrid } from '../engine/Collision';
import { isSolid } from '../engine/Collision';

const ANIM_SPEED = 0.15; // seconds per frame (~6.6fps walk cycle)

export function updateLocalEntity(
  entity: LocalEntity,
  keys: Set<string>,
  collisionGrid: CollisionGrid,
  dt: number
): void {
  let dx = 0;
  let dy = 0;

  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  const newX = entity.position.x + dx * entity.speed * dt;
  const newY = entity.position.y + dy * entity.speed * dt;

  // Check X movement with collisions
  if (
    !isSolid(collisionGrid, newX, entity.position.y) &&
    !isSolid(collisionGrid, newX + entity.size.width, entity.position.y) &&
    !isSolid(collisionGrid, newX, entity.position.y + entity.size.height) &&
    !isSolid(collisionGrid, newX + entity.size.width, entity.position.y + entity.size.height)
  ) {
    entity.position.x = newX;
  }

  // Check Y movement with collisions
  if (
    !isSolid(collisionGrid, entity.position.x, newY) &&
    !isSolid(collisionGrid, entity.position.x + entity.size.width, newY) &&
    !isSolid(collisionGrid, entity.position.x, newY + entity.size.height) &&
    !isSolid(collisionGrid, entity.position.x + entity.size.width, newY + entity.size.height)
  ) {
    entity.position.y = newY;
  }

  // Update facing direction (prefer the axis with more movement; last pressed wins for diagonals)
  if (dy > 0) entity.facing = 'down';
  else if (dy < 0) entity.facing = 'up';
  else if (dx < 0) entity.facing = 'left';
  else if (dx > 0) entity.facing = 'right';

  // Advance animation when moving, reset to idle frame when stopped
  const isMoving = dx !== 0 || dy !== 0;
  if (isMoving) {
    entity.animTimer += dt;
    if (entity.animTimer >= ANIM_SPEED) {
      entity.animTimer -= ANIM_SPEED;
      entity.animFrame = (entity.animFrame + 1) % 3;
    }
  } else {
    entity.animFrame = 1; // middle frame = idle/neutral pose
    entity.animTimer = 0;
  }
}
