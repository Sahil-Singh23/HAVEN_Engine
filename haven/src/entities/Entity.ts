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

// Shared by all entities in the world
export interface Entity {
  id: string;
  type: 'local' | 'remote';
  position: Position;
  velocity: Velocity;
  size: Size;
  color: string;
  speed: number;
}

// Local player: you control this, needs prediction state
export interface LocalEntity extends Entity {
  type: 'local';
  // Future: input history for reconciliation
  // inputHistory: InputState[];
  // Future: last server-confirmed position
  // lastServerPosition: Position;
}

// Remote player: someone else, server tells you where they are
export interface RemoteEntity extends Entity {
  type: 'remote';
  // Future: buffer of past states for interpolation
  // stateBuffer: Array<{ timestamp: number; position: Position }>;
}

export type AnyEntity = LocalEntity | RemoteEntity;

let nextId = 0;

export function createLocalEntity(x: number, y: number): LocalEntity {
  return {
    id: `local-${nextId++}`,
    type: 'local',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    size: { width: 12, height: 12 }, // Match the previous player size
    color: '#510505', // Keep original blue color
    speed: 96, // 6 tiles per second (96px / 16px per tile)
  };
}

export function createRemoteEntity(id: string, x: number, y: number): RemoteEntity {
  return {
    id,
    type: 'remote',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    size: { width: 12, height: 12 },
    color: '#ff4444', // Red color for remote players to differentiate
    speed: 96,
  };
}
