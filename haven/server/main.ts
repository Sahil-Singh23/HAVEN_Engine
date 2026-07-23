// server/main.ts

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { InstanceManager } from './InstanceManager.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5010;
const TICK_RATE = 20;

//create the object of the instance manager 
const instanceManager = new InstanceManager();
// const instanceManager: {
//     instances: Map<string, MapInstance>; 
//     playerToInstance: Map<string, string>;
//     createInstance(): string;
//     joinInstance(code: string, playerId: string, ws: WebSocket): boolean;
//     leaveInstance(playerId: string): void;
//     getInstanceForPlayer(playerId: string): MapInstance | undefined;
//     generateCode(): string;
// }
const clients = new Map<string, WebSocket>();
//player id mapped to sockets 

const wss = new WebSocketServer({ port: PORT });
//creating server 

wss.on('connection', (ws) => {
  const playerId = `p-${Math.random().toString(36).slice(2, 9)}`;
  clients.set(playerId, ws);
  
  console.log(`Connected: ${playerId}`);
  //upon connection create player id 

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      const instance = instanceManager.getInstanceForPlayer(playerId);

      //now based on msg type we will respond to the client 
      switch (msg.type) {
        case 'createInstance': {
          const code = instanceManager.createInstance();
          //create instance creates a room, adds it to instances map (code: mapInstance)of the instance manager class n return the room code 
          ws.send(JSON.stringify({ type: 'instanceCreated', code }));
          break;
        }
        
        case 'joinInstance': {
          const playerName = msg.name || playerId.slice(0, 6);
          const spriteId = msg.spriteId || '01-0';
          const success = instanceManager.joinInstance(msg.code, playerId, ws, playerName, spriteId);
          if (!success) {
            ws.send(JSON.stringify({ 
              type: 'joinFailed', 
              reason: 'Invalid code or instance full' 
            }));
          }
          break;
        }
        
        case 'input': {
          if (!instance) break;
          instance.updatePlayer(
            playerId, 
            msg.x, 
            msg.y, 
            msg.keys || [], 
            msg.sequence || 0,
            msg.dt || 0.05
          );
          break;
        }
        
        case 'chat': {
          if (!instance) break;
          instance.broadcastChat(
            playerId, 
            msg.text || '', 
            msg.mode || 'global'
          );
          break;
        }
        
        case 'heartbeat': {
          if (!instance) break;
          const player = instance.players.get(playerId);
          if (player) {
            player.lastInput = Date.now();
          }
          break;
        }
      }
    } catch (err) {
      console.error(`Bad message from ${playerId}:`, err);
    }
  });

  ws.on('close', () => {
    console.log(`Disconnected: ${playerId}`);
    instanceManager.leaveInstance(playerId);
    clients.delete(playerId);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${playerId}:`, err);
  });
});

// State broadcast loop
setInterval(() => {
  for (const instance of instanceManager.instances.values()) {
    instance.broadcastState();
  }
}, 1000 / TICK_RATE);

// Away status check
setInterval(() => {
  for (const instance of instanceManager.instances.values()) {
    instance.checkAwayStatus();
  }
}, 60 * 1000);

console.log(`Server running on ws://localhost:${PORT}`);
