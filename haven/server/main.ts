import { WebSocketServer, WebSocket } from 'ws';

// Shared types (will be moved to a shared file)
interface PlayerInput {
  keys: string[];
  dt: number;
}

interface PlayerState {
  x: number;
  y: number;
}

interface GameState {
  players: Map<string, PlayerState>;
}

const PORT = 3001;
const TICK_RATE = 20; // 20 updates per second = 50ms interval

// In a real implementation, you would load the map data here
// to build a server-side collision grid. For now, we will
// proceed without server-side collision to keep it simple.
// const collisionGrid = buildCollisionGrid(mapData);

const state: GameState = {
  players: new Map(),
};

const clients = new Map<string, WebSocket>();

function isSolid(x: number, y: number): boolean {
  // Server-side collision check would go here.
  // For now, we allow all movement.
  void x;
  void y;
  return false;
}

function updatePlayer(id: string, input: PlayerInput): void {
  const player = state.players.get(id);
  if (!player) return;

  const SPEED = 96; // 6 tiles per second (96px / 16px per tile)
  let dx = 0;
  let dy = 0;

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

  const newX = player.x + dx * SPEED * input.dt;
  const newY = player.y + dy * SPEED * input.dt;

  // We check for collisions before updating the player's state.
  // This simple check only validates the center point of the player.
  if (!isSolid(newX + 6, newY + 6)) {
    player.x = newX;
    player.y = newY;
  }
}


function broadcastState(): void {
  const snapshot: Record<string, PlayerState> = {};
  for (const [id, pos] of state.players) {
    snapshot[id] = { x: pos.x, y: pos.y };
  }

  const message = JSON.stringify({
    type: 'state',
    tick: Date.now(),
    players: snapshot,
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

  // Spawn at a default position
  state.players.set(id, { x: 265, y: 510 });
  clients.set(id, ws);

  // Send the new player their ID and the current game state
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
          dt: msg.dt || 1 / TICK_RATE, // Use a fixed tick if dt is not provided
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
    
    // Notify remaining players about the disconnection
    broadcastState();
  });
});

// Server-side game loop
setInterval(() => {
  // For this phase, inputs are processed as they arrive.
  // In a more advanced model, you might queue inputs and process them here.
  broadcastState();
}, 1000 / TICK_RATE);

console.log(` Server running on ws://localhost:${PORT}`);
