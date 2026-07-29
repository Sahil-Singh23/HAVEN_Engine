import type { LocalEntity, FacingDirection } from './Entity';
import type { CollisionGrid } from '../engine/Collision';
import { isSolid } from '../engine/Collision';

export function getFacingFromVector(dx: number, dy: number): FacingDirection | null {
  if (dx === 0 && dy === 0) return null;
  if (dx === 0 && dy > 0) return 'down';
  if (dx === 0 && dy < 0) return 'up';
  if (dx < 0 && dy === 0) return 'left';
  if (dx > 0 && dy === 0) return 'right';
  if (dx < 0 && dy > 0) return 'downLeft';
  if (dx > 0 && dy > 0) return 'downRight';
  if (dx < 0 && dy < 0) return 'upLeft';
  if (dx > 0 && dy < 0) return 'upRight';
  return 'down';
}

const FRAME_DURATION = 0.15; // 150ms per animation frame

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

  const isMoving = dx !== 0 || dy !== 0;
  entity.isMoving = isMoving;

  if (isMoving) {
    const facing = getFacingFromVector(dx, dy);
    if (facing) {
      entity.facing = facing;
    }

    // Advance walk animation frame
    entity.animTimer += dt;
    if (entity.animTimer >= FRAME_DURATION) {
      entity.animTimer -= FRAME_DURATION;
      entity.animFrame = (entity.animFrame + 1) % 3;
    }

    // Normalize diagonal movement speed
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  } else {
    // Idle frame
    entity.animFrame = 0;
    entity.animTimer = 0;
  }

  const newX = entity.position.x + dx * entity.speed * dt;
  const newY = entity.position.y + dy * entity.speed * dt;

  // Check X movement with 12×12 hitbox collision
  if (
    !isSolid(collisionGrid, newX, entity.position.y) &&
    !isSolid(collisionGrid, newX + entity.size.width, entity.position.y) &&
    !isSolid(collisionGrid, newX, entity.position.y + entity.size.height) &&
    !isSolid(collisionGrid, newX + entity.size.width, entity.position.y + entity.size.height)
  ) {
    entity.position.x = newX;
  }

  // Check Y movement with 12×12 hitbox collision
  if (
    !isSolid(collisionGrid, entity.position.x, newY) &&
    !isSolid(collisionGrid, entity.position.x + entity.size.width, newY) &&
    !isSolid(collisionGrid, entity.position.x, newY + entity.size.height) &&
    !isSolid(collisionGrid, entity.position.x + entity.size.width, newY + entity.size.height)
  ) {
    entity.position.y = newY;
  }
}
