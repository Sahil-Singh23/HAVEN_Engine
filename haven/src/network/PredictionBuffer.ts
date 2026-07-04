import type { Position } from '../entities/Entity';
import { isSolid, type CollisionGrid } from '../engine/Collision';

export interface InputFrame {
  sequence: number;
  keys: string[];
  dt: number;
}

// This function must exactly mirror the movement logic in LocalController.ts
function applyInput(pos: Position, size: {width: number, height: number}, speed: number, keys: string[], dt: number, collisionGrid: CollisionGrid): Position {
  let dx = 0, dy = 0;
  
  for (const key of keys) {
    if (key === 'w' || key === 'arrowup') dy -= 1;
    if (key === 's' || key === 'arrowdown') dy += 1;
    if (key === 'a' || key === 'arrowleft') dx -= 1;
    if (key === 'd' || key === 'arrowright') dx += 1;
  }
  
  //this block is for diagonal movement to normalise it, so it moves in constant speed in all direction rather than faster diagonally 
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }
  
  const newPos = { x: pos.x, y: pos.y };
  const newX = newPos.x + dx * speed * dt;
  const newY = newPos.y + dy * speed * dt;

  // Check X movement
  if (
    !isSolid(collisionGrid, newX, newPos.y) &&
    !isSolid(collisionGrid, newX + size.width, newPos.y) &&
    !isSolid(collisionGrid, newX, newPos.y + size.height) &&
    !isSolid(collisionGrid, newX + size.width, newPos.y + size.height)
  ) {
    newPos.x = newX;
  }

  // Check Y movement
  if (
    !isSolid(collisionGrid, newPos.x, newY) &&
    !isSolid(collisionGrid, newPos.x + size.width, newY) &&
    !isSolid(collisionGrid, newPos.x, newY + size.height) &&
    !isSolid(collisionGrid, newPos.x + size.width, newY + size.height)
  ) {
    newPos.y = newY;
  }

  return newPos;
}

export class PredictionBuffer {
  private inputs: InputFrame[] = [];
  private nextSequence = 0;

  add(keys: string[], dt: number): number {
    const seq = this.nextSequence++;
    this.inputs.push({
      sequence: seq,
      keys,
      dt,
    });
    return seq;
  }
 
  // When server corrects us, replay unacknowledged inputs on top of the authoritative state
  reconcile(serverState: { position: Position, sequence: number }, size: {width: number, height: number}, speed: number, collisionGrid: CollisionGrid): Position {
    // Remove all inputs that the server has already processed
    this.inputs = this.inputs.filter(i => i.sequence > serverState.sequence);
    
    // Start from the server's authoritative position
    let reconciledPosition = { ...serverState.position };

    // Replay the remaining inputs on top of the server's state
    for (const input of this.inputs) {
      reconciledPosition = applyInput(reconciledPosition, size, speed, input.keys, input.dt, collisionGrid);
    }
    
    return reconciledPosition;
  }
}
