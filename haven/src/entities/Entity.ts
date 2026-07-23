import { InterpolationBuffer } from '../network/InterpolationBuffer';

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

export type FacingDirection = 'down' | 'left' | 'right' | 'up';

// Shared by all entities in the world
export interface Entity {
  id: string;
  type: 'local' | 'remote';
  position: Position;
  velocity: Velocity;
  size: Size;
  color: string;
  speed: number;
  spriteId: string;          // e.g. "01-3"
  facing: FacingDirection;   // which direction the character faces
  animFrame: number;         // 0, 1, or 2 (3 walk frames)
  animTimer: number;         // accumulates dt to know when to advance frame
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

export function createLocalEntity(x: number, y: number, spriteId = '01-0'): LocalEntity {
  return {
    id: `local-${nextId++}`,
    type: 'local',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    size: { width: 12, height: 16 },
    color: '#510505',
    speed: 96, // 96 pixels per second, or 6 tiles per sec of 16 px per tile
    spriteId,
    facing: 'down',
    animFrame: 1,
    animTimer: 0,
  };
}

export function createRemoteEntity(id: string, x: number, y: number, spriteId = '01-0'): RemoteEntity {
  return {
    id,
    type: 'remote',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    size: { width: 12, height: 16 },
    color: '#ff4444',
    speed: 96,
    spriteId,
    facing: 'down',
    animFrame: 1,
    animTimer: 0,
    interpolationBuffer: new InterpolationBuffer(),
  };
}
