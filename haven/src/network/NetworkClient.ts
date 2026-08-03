// src/network/NetworkClient.ts

import type{ ServerMessage, ClientMessage } from '../shared/types';

export class NetworkClient {
  private ws: WebSocket | null = null;
  private handlers: Partial<Record<ServerMessage['type'], ((data: any) => void)[]>> = {};
  private onOpenHandlers: (() => void)[] = [];
  private initMessage: ServerMessage | null = null;

  connect(url: string): void {
    this.handlers = {};
    this.onOpenHandlers = [];
    this.initMessage = null;
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('Network: connected');
      this.onOpenHandlers.forEach(h => h());
    };
    
    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        
        if (msg.type === 'init') {
          this.initMessage = msg;
        }

        const handlers = this.handlers[msg.type] || [];
        handlers.forEach(h => h(msg));
      } catch (err) {
        console.error('Network: failed to parse message', err);
      }
    };
    
    this.ws.onclose = () => {
      console.log('Network: disconnected');
    };
    
    this.ws.onerror = (err) => {
      console.error('Network: error', err);
    };
  }

  on<T extends ServerMessage['type']>(
    type: T, 
    handler: (msg: Extract<ServerMessage, { type: T }>) => void
  ): void {
    if (!this.handlers[type]) {
      this.handlers[type] = [];
    }
    this.handlers[type]!.push(handler);

    // If an init message is already cached, fire the handler immediately
    if (type === 'init' && this.initMessage) {
      handler(this.initMessage as any);
    }
  }

  onOpen(handler: () => void): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      handler();
    } else {
      this.onOpenHandlers.push(handler);
    }
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Network: not connected, message dropped');
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  createInstance(name: string, sprite: string): void {
    this.send({ type: 'createInstance', name, sprite });
  }

  joinInstance(code: string, name: string, sprite: string): void {
    this.send({ type: 'joinInstance', code, name, sprite });
  }

  sendInput(keys: string[], dt: number, sequence: number, x: number, y: number): void {
    this.send({ type: 'input', keys, dt, sequence, x, y });
  }

  sendChat(text: string, mode: 'global' | 'room' | 'nearby'): void {
    this.send({ type: 'chat', text, mode });
  }

  heartbeat(): void {
    this.send({ type: 'heartbeat' });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers = {};
    this.onOpenHandlers = [];
    this.initMessage = null;
  }
}
