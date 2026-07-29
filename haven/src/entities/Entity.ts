import { InterpolationBuffer } from '../network/InterpolationBuffer';

export type FacingDirection =
  | 'down'
  | 'left'
  | 'right'
  | 'up'
  | 'downLeft'
  | 'downRight'
  | 'upLeft'
  | 'upRight';

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const DEFAULT_SPRITE_ID = '8D actor1-1[VS8]-0';

// Shared by all entities in the world
export interface Entity {
  id: string;
  type: 'local' | 'remote';
  position: Position;
  velocity: Velocity;
  size: Size;          // Collision hitbox size (12×12) — NOT the visual sprite size
  color: string;       // Fallback color when sprite hasn't loaded
  speed: number;
  sprite: string;      // Sprite identifier (e.g. "8D actor1-1[VS8]-0" or "02-1")
  facing: FacingDirection;
  animFrame: number;
  animTimer: number;
  isMoving: boolean;
}

// Local player: you control this, needs prediction state
export interface LocalEntity extends Entity {
  type: 'local';
}

// Remote player: someone else, server tells you where they are
export interface RemoteEntity extends Entity {
  type: 'remote';
  interpolationBuffer: InterpolationBuffer;
}

export type AnyEntity = LocalEntity | RemoteEntity;

let nextId = 0;

export function createLocalEntity(x: number, y: number, sprite?: string): LocalEntity {
  return {
    id: `local-${nextId++}`,
    type: 'local',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    size: { width: 12, height: 12 },   // Collision hitbox stays 12×12
    color: '#510505',
    speed: 96, // 96 pixels per second
    sprite: sprite || DEFAULT_SPRITE_ID,
    facing: 'down',
    animFrame: 0,
    animTimer: 0,
    isMoving: false,
  };
}

export function createRemoteEntity(id: string, x: number, y: number, sprite?: string): RemoteEntity {
  return {
    id,
    type: 'remote',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    size: { width: 12, height: 12 },   // Collision hitbox stays 12×12
    color: '#ff4444',
    speed: 96,
    sprite: sprite || DEFAULT_SPRITE_ID,
    facing: 'down',
    animFrame: 0,
    animTimer: 0,
    isMoving: false,
    interpolationBuffer: new InterpolationBuffer(),
  };
}
