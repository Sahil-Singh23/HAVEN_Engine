// src/game/GameState.ts

import type { PlayerState, ZoneData, ChatMessage } from '../shared/types';

export interface GamePlayer extends PlayerState {
  id: string;
}

export class GameState {
  localId: string | null = null;
  instanceCode: string | null = null;
  players = new Map<string, GamePlayer>();
  zones: ZoneData[] = [];
  chatMessages: ChatMessage[] = [];
  currentRoom: string | null = null;

  reset(): void {
    this.localId = null;
    this.instanceCode = null;
    this.players.clear();
    this.zones = [];
    this.chatMessages = [];
    this.currentRoom = null;
  }

  setLocalId(id: string): void {
    this.localId = id;
  }

  setInstanceCode(code: string): void {
    this.instanceCode = code;
  }

  updatePlayer(id: string, state: PlayerState): void {
    const existing = this.players.get(id);
    if (existing) {
      Object.assign(existing, state);
    } else {
      this.players.set(id, { id, ...state });
    }
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  setZones(zones: ZoneData[]): void {
    this.zones = zones;
  }

  getLocalPlayer(): GamePlayer | undefined {
    return this.localId ? this.players.get(this.localId) : undefined;
  }

  getRoomPlayers(room: string | null): GamePlayer[] {
    return Array.from(this.players.values()).filter(p => p.room === room);
  }

  getNearbyPlayers(radius: number = 200): GamePlayer[] {
    const local = this.getLocalPlayer();
    if (!local) return [];
    
    return Array.from(this.players.values()).filter(p => {
      if (p.id === local.id) return true;
      const dx = p.x - local.x;
      const dy = p.y - local.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  addChatMessage(msg: ChatMessage): void {
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
  }

  updateLocalRoom(x: number, y: number): string | null {
    const localPlayer = this.getLocalPlayer();
    if (localPlayer) {
      localPlayer.x = x;
      localPlayer.y = y;
    }

    for (const zone of this.zones) {
      if (x >= zone.x && 
          x <= zone.x + zone.width && 
          y >= zone.y && 
          y <= zone.y + zone.height) {
        this.currentRoom = zone.name;
        if (localPlayer) {
          localPlayer.room = zone.name;
        }
        return zone.name;
      }
    }
    
    this.currentRoom = null;
    if (localPlayer) {
      localPlayer.room = null;
    }
    return null;
  }
}
