import type { CollisionGrid } from '../engine/Collision';
import {isSolid} from '../engine/Collision'
import type { Camera } from '../engine/Camera';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
}

export function createPlayer(x: number, y: number): Player {
  return {
    x, y,
    width: 12,
    height: 12,
    speed: 96, // 6 tiles per second (96px / 16px per tile)
    color: '#ff4444',
  };
}

export function updatePlayer(
  player: Player,
  keys: Set<string>,
  grid: CollisionGrid,
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

  const newX = player.x + dx * player.speed * dt;
  const newY = player.y + dy * player.speed * dt;

  // Check X movement
  if (!isSolid(grid, newX, player.y) && 
      !isSolid(grid, newX + player.width, player.y) &&
      !isSolid(grid, newX, player.y + player.height) &&
      !isSolid(grid, newX + player.width, player.y + player.height)) {
    player.x = newX;
  }

  // Check Y movement
  if (!isSolid(grid, player.x, newY) &&
      !isSolid(grid, player.x + player.width, newY) &&
      !isSolid(grid, player.x, newY + player.height) &&
      !isSolid(grid, player.x + player.width, newY + player.height)) {
    player.y = newY;
  }
}

export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  camera: Camera
): void {
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.restore();
}