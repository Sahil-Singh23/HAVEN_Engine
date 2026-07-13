// server/MapInstance.ts

import { WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
  PlayerState, 
  LocalPlayerState,
  PlayerStateWithId,
  ChatMessage,
  ZoneData,
  StateMessage
} from '../src/shared/types.js';
import { loadZones, getPlayerRoom } from './ZoneLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ServerPlayer {
  id: string;
  ws: WebSocket;
  x: number;
  y: number;
  lastInput: number;
  status: 'online' | 'away';
  room: string | null;
  name: string;
}

export class MapInstance {
  code: string;
  players = new Map<string, ServerPlayer>();
  chatHistory: ChatMessage[] = [];
  zones: ZoneData[];
  mapData: any;
  collisionGrid: {
    width: number;
    height: number;
    tileSize: number;
    grid: boolean[][];
  };
  private playerSequences = new Map<string, number>();
  //this seq is used prediction n reconsilation 

  constructor(code: string) {
    this.code = code;
    this.mapData = JSON.parse(
      readFileSync(resolve(__dirname, '../../../public/maps/final_map.tmj'), 'utf-8')
    );
    this.zones = loadZones(this.mapData);
    this.collisionGrid = this.buildCollisionGrid();
  }

  private buildCollisionGrid() {
    const layer = this.mapData.layers.find(
      (l: any) => l.type === 'tilelayer' && l.name.toLowerCase() === 'collision'
    );
    
    if (!layer) {
      throw new Error('No collision layer found in map');
    }

    const grid: boolean[][] = [];
    const FLIPPED = 0x80000000 | 0x40000000 | 0x20000000;
    
    for (let y = 0; y < layer.height; y++) {
      grid[y] = [];
      for (let x = 0; x < layer.width; x++) {
        const gid = layer.data[y * layer.width + x];
        grid[y][x] = (gid & ~FLIPPED) !== 0;
      }
    }
    
    return { 
      width: layer.width, 
      height: layer.height, 
      tileSize: this.mapData.tilewidth || 32, 
      grid 
    };
  }

  addPlayer(id: string, ws: WebSocket, name: string): void {
    const spawnLayer = this.mapData.layers.find(
      (l: any) => l.type === 'objectgroup' && l.name === 'objects'
    );
    const spawn = spawnLayer?.objects.find((o: any) => o.name === 'spawn');
    const x = spawn?.x ?? 260;
    const y = spawn?.y ?? 500;
    //add an object layer later named objects, rn it s default spawn point to fixed cordinated, 

    const player: ServerPlayer = {
      id,
      ws,
      x,
      y,
      lastInput: Date.now(),
      status: 'online',
      room: getPlayerRoom(x, y, this.zones),
      name: name || id.slice(0, 6)
    };

    this.players.set(id, player);
    this.playerSequences.set(id, 0);

    // Send init to new player
    this.sendTo(id, {
      type: 'init',
      yourId: id,
      code: this.code,
      players: this.getAllPlayerStates(),
      zones: this.zones,
      chatHistory: this.chatHistory.slice(-50)
    });

    // Notify others
    this.broadcast({
      type: 'playerJoined',
      player: this.getPlayerStateWithId(id)
    }, id);
  }

  removePlayer(id: string): boolean {
    this.players.delete(id);
    this.playerSequences.delete(id);
    this.broadcast({ type: 'playerLeft', id });
    return this.players.size === 0;
  }

  updatePlayer(id: string, x: number, y: number, keys: string[], sequence: number, dt: number): void {
    const player = this.players.get(id);
    if (!player) return;

    // Server-side movement with collision (aligned with client speed of 96 and 12x12 AABB)
    const SPEED = 96;
    let dx = 0, dy = 0;
    
    for (const key of keys) {
      const k = key.toLowerCase();
      if (k === 'w' || k === 'arrowup') dy -= 1;
      if (k === 's' || k === 'arrowdown') dy += 1;
      if (k === 'a' || k === 'arrowleft') dx -= 1;
      if (k === 'd' || k === 'arrowright') dx += 1;
    }

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const safeDt = Math.min(dt, 0.1);
    const newX = player.x + dx * SPEED * safeDt;
    const newY = player.y + dy * SPEED * safeDt;

    const playerWidth = 12;
    const playerHeight = 12;

    // Try X movement (4-corner bounding box check matching client)
    if (
      !this.isSolid(newX, player.y) &&
      !this.isSolid(newX + playerWidth, player.y) &&
      !this.isSolid(newX, player.y + playerHeight) &&
      !this.isSolid(newX + playerWidth, player.y + playerHeight)
    ) {
      player.x = newX;
    }
    
    // Try Y movement (4-corner bounding box check matching client)
    if (
      !this.isSolid(player.x, newY) &&
      !this.isSolid(player.x + playerWidth, newY) &&
      !this.isSolid(player.x, newY + playerHeight) &&
      !this.isSolid(player.x + playerWidth, newY + playerHeight)
    ) {
      player.y = newY;
    }

    // Update room zone
    const newRoom = getPlayerRoom(player.x, player.y, this.zones);
    if (newRoom !== player.room) {
      player.room = newRoom;
    }

    // Update timestamps and sequence
    player.lastInput = Date.now();
    this.playerSequences.set(id, sequence);

    // Wake up if away
    if (player.status === 'away') {
      player.status = 'online';
      this.broadcast({ type: 'statusChanged', id, status: 'online' });
    }
  }

  private isSolid(x: number, y: number): boolean {
    const tx = Math.floor(x / this.collisionGrid.tileSize);
    const ty = Math.floor(y / this.collisionGrid.tileSize);
    
    if (tx < 0 || tx >= this.collisionGrid.width || 
        ty < 0 || ty >= this.collisionGrid.height) {
      return true;
    }
    
    return this.collisionGrid.grid[ty]?.[tx] ?? false;
  }

  broadcastState(): void {
    for (const [id, player] of this.players) {
      const others: Record<string, PlayerState> = {};
      
      for (const [otherId, other] of this.players) {
        if (otherId === id) continue;
        others[otherId] = this.getPlayerState(otherId);
      }

      const localState: LocalPlayerState = {
        ...this.getPlayerState(id),
        sequence: this.playerSequences.get(id) || 0
      };

      const msg: StateMessage = {
        type: 'state',
        tick: Date.now(),
        players: others,
        local: localState
      };

      this.sendTo(id, msg);
    }
  }

  broadcastChat(senderId: string, text: string, mode: 'global' | 'room' | 'nearby'): void {
    const sender = this.players.get(senderId);
    if (!sender) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId,
      senderName: sender.name,
      text: text.slice(0, 200),
      mode,
      room: sender.room,
      x: sender.x,
      y: sender.y,
      timestamp: Date.now()
    };

    const recipients = this.getRecipients(sender, mode);
    
    for (const player of recipients) {
      this.sendTo(player.id, { type: 'chat', message });
    }

    // Store in history (global and room only)
    if (mode !== 'nearby') {
      this.chatHistory.push(message);
      if (this.chatHistory.length > 100) {
        this.chatHistory.shift();
      }
    }
  }

  private getRecipients(sender: ServerPlayer, mode: 'global' | 'room' | 'nearby'): ServerPlayer[] {
    const all = Array.from(this.players.values());
    
    switch (mode) {
      case 'global':
        return all;
      
      case 'room':
        if (!sender.room) return [];
        return all.filter(p => p.room === sender.room);
      
      case 'nearby':
        return all.filter(p => {
          if (p.id === sender.id) return true;
          const dx = p.x - sender.x;
          const dy = p.y - sender.y;
          return Math.sqrt(dx * dx + dy * dy) <= 200;
        });
    }
  }

  checkAwayStatus(): void {
    const now = Date.now();
    const awayThreshold = 2 * 60 * 1000; // 2 minutes

    for (const player of this.players.values()) {
      if (player.status === 'online' && now - player.lastInput > awayThreshold) {
        player.status = 'away';
        this.broadcast({ 
          type: 'statusChanged', 
          id: player.id, 
          status: 'away' 
        });
      }
    }
  }

  getPlayerState(id: string): PlayerState {
    const p = this.players.get(id)!;
    return {
      x: p.x,
      y: p.y,
      status: p.status,
      room: p.room,
      name: p.name
    };
  }

  getPlayerStateWithId(id: string): PlayerStateWithId {
    return {
      id,
      ...this.getPlayerState(id)
    };
  }

  getAllPlayerStates(): Record<string, PlayerState> {
    const states: Record<string, PlayerState> = {};
    for (const [id, p] of this.players) {
      states[id] = this.getPlayerState(id);
    }
    return states;
  }

  broadcast(data: any, excludeId?: string): void {
    const msg = JSON.stringify(data);
    for (const [id, player] of this.players) {
      if (id === excludeId) continue;
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(msg);
      }
    }
  }

  sendTo(id: string, data: any): void {
    const player = this.players.get(id);
    if (player && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(data));
    }
  }
}
