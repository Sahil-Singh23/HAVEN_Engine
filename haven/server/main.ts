import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM-safe equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// #region Shared Types
interface PlayerInput {
  keys: string[];
  dt: number;
  sequence: number;
}

interface PlayerState {
  x: number;
  y: number;
  sequence: number;
}

interface GameState {
  players: Map<string, PlayerState>;
}
// #endregion

// #region Server Configuration
const PORT = 3001;
const TICK_RATE = 20; // 20 updates per second
// #endregion

// #region Collision Handling
interface CollisionGrid {
  width: number;
  height: number;
  tileSize: number;
  grid: boolean[][];
}


//this is just returning a collsion grid by extracting from map n converting to boolean
function loadCollisionGrid(): CollisionGrid {
  // Resolve path from the compiled JS file in `dist`
  const mapPath = resolve(__dirname, '../../public/maps/final_map.tmj');
  const mapData = JSON.parse(readFileSync(mapPath, 'utf-8'));
  
  const collisionLayer = mapData.layers.find(
    (l: any) => l.type === 'tilelayer' && l.name.toLowerCase() === 'collision'
  );
  
  if (!collisionLayer) throw new Error('Server error: No collision layer found in map file.');
  
  const grid: boolean[][] = [];
  const FLIPPED_FLAGS = 0x80000000 | 0x40000000 | 0x20000000;
  
  for (let y = 0; y < collisionLayer.height; y++) {
    grid[y] = [];
    for (let x = 0; x < collisionLayer.width; x++) {
      const gid = collisionLayer.data[y * collisionLayer.width + x];
      grid[y][x] = (gid & ~FLIPPED_FLAGS) !== 0;
    }
  }
  
  return {
    width: collisionLayer.width,
    height: collisionLayer.height,
    tileSize: mapData.tilewidth,
    grid
  };
}

//the collison gird is now loaded 
const collisionGrid = loadCollisionGrid();

//this is actual function which check if a given world pos x,y is collison or not
function isSolidServer(x: number, y: number): boolean {
  const tx = Math.floor(x / collisionGrid.tileSize);
  const ty = Math.floor(y / collisionGrid.tileSize);
  
  if (tx < 0 || tx >= collisionGrid.width || ty < 0 || ty >= collisionGrid.height) {
    return true; // Out of bounds is solid
  }
  
  return collisionGrid.grid[ty]?.[tx] ?? false;
}
// #endregion

const state: GameState = {
  players: new Map(),
};

const clients = new Map<string, WebSocket>();
const  lastInputTime = new Map<string, number>();

function updatePlayer(id: string, input: PlayerInput): void {
  const now = Date.now();
  const last = lastInputTime.get(id) || 0;
  
  // Rate limit to max 60 inputs/sec (16ms interval)
  if (now - last < 16) return;
  lastInputTime.set(id, now);

  const player = state.players.get(id);
  if (!player) return;

  const SPEED = 96; //speed of pixels per second 
  const PLAYER_SIZE = { width: 12, height: 12 };
  let dx = 0, dy = 0;

  for (const key of input.keys) {
    if (key === 'w' || key === 'arrowup') dy -= 1;
    if (key === 's' || key === 'arrowdown') dy += 1;
    if (key === 'a' || key === 'arrowleft') dx -= 1;
    if (key === 'd' || key === 'arrowright') dx += 1;
  }

  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  const newX = player.x + dx * SPEED * input.dt; // basically distace = speed* time , we add to old postion it will be + or - based on the dx , 
  const newY = player.y + dy * SPEED * input.dt;
  // dx, dy = direction
  // SPEED = movement per second
  // dt = time since last frame
  // SPEED × dt = distance traveled this frame
  // formula ensures FPS-independent movement

  // Perform server-side collision check, mirroring the client's 4-corner logic
  if (
    !isSolidServer(newX, player.y) &&
    !isSolidServer(newX + PLAYER_SIZE.width, player.y) &&
    !isSolidServer(newX, player.y + PLAYER_SIZE.height) &&
    !isSolidServer(newX + PLAYER_SIZE.width, player.y + PLAYER_SIZE.height)
  ) {
    player.x = newX;
  }

  if (
    !isSolidServer(player.x, newY) &&
    !isSolidServer(player.x + PLAYER_SIZE.width, newY) &&
    !isSolidServer(player.x, newY + PLAYER_SIZE.height) &&
    !isSolidServer(player.x + PLAYER_SIZE.width, newY + PLAYER_SIZE.height)
  ) {
    player.y = newY;
  }
  
  player.sequence = input.sequence;
}

function broadcastState(): void {
  const message = JSON.stringify({
    type: 'state',
    tick: Date.now(),
    players: Object.fromEntries(state.players),
  });

  for (const ws of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  const id = `player-${Math.random().toString(36).slice(2, 9)}`;
  console.log('Player connected:', id);

  state.players.set(id, { x: 265, y: 510, sequence: -1 });
  clients.set(id, ws);
  lastInputTime.set(id, Date.now());

  ws.send(JSON.stringify({
    type: 'init',
    yourId: id,
    players: Object.fromEntries(state.players),
  }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'input') {
        updatePlayer(id, {
          keys: msg.keys || [],
          dt: msg.dt || 1 / TICK_RATE,
          sequence: msg.sequence,
        });
      }
    } catch (err) {
      console.error(`Error processing message from ${id}:`, err);
    }
  });

  ws.on('close', () => {
    console.log('Player disconnected:', id);
    state.players.delete(id);
    clients.delete(id);
    lastInputTime.delete(id);
    broadcastState();
  });
});

setInterval(() => {
  broadcastState();
}, 1000 / TICK_RATE);

console.log(` Server running on ws://localhost:${PORT}`);
