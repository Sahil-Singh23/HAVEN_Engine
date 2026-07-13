// server/InstanceManager.ts

import { WebSocket } from 'ws';
import { MapInstance } from './MapInstance.js';

export class InstanceManager {
  //instances stores roomId: mapInstance
  instances = new Map<string, MapInstance>();
  //reverse map for o(1) lookup
  private playerToInstance = new Map<string, string>();

  //
  createInstance(): string {
    const code = this.generateCode();
    this.instances.set(code, new MapInstance(code));
    console.log(`Created instance: ${code}`);
    return code;
  }

  joinInstance(code: string, playerId: string, ws: WebSocket, name: string): boolean {
    const upperCode = code.toUpperCase();
    const instance = this.instances.get(upperCode);
    
    if (!instance) {
      console.log(`Join failed: instance ${upperCode} not found`);
      return false;
    }
    
    if (instance.players.size >= 30) {
      console.log(`Join failed: instance ${upperCode} full`);
      return false;
    }

    instance.addPlayer(playerId, ws, name);
    this.playerToInstance.set(playerId, upperCode);
    return true;
  }

  leaveInstance(playerId: string): void {
    const code = this.playerToInstance.get(playerId);
    if (!code) return;

    const instance = this.instances.get(code);
    if (!instance) {
      this.playerToInstance.delete(playerId);
      return;
    }

    const shouldDestroy = instance.removePlayer(playerId);
    this.playerToInstance.delete(playerId);

    if (shouldDestroy) {
      console.log(`Destroyed empty instance: ${code}`);
      this.instances.delete(code);
    }
  }

  getInstanceForPlayer(playerId: string): MapInstance | undefined {
    const code = this.playerToInstance.get(playerId);
    return code ? this.instances.get(code) : undefined;
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    
    if (this.instances.has(code)) {
      return this.generateCode();
    }
    
    return code;
  }
}
