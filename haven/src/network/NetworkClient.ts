import type { ServerMessage, ClientMessage, InitMessage, StateMessage } from '../shared/types';

export class NetworkClient {
  private ws: WebSocket | null = null;
  private onStateCallback: ((msg: StateMessage) => void) | null = null;
  private onInitCallback: ((id: string, players: Record<string, { x: number; y: number }>) => void) | null = null;

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('Connected to server');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        
        if (msg.type === 'init' && this.onInitCallback) {
          this.onInitCallback(msg.yourId, msg.players);
        }
        
        if (msg.type === 'state' && this.onStateCallback) {
          this.onStateCallback(msg);
        }
      } catch (err) {
        console.error('Error processing server message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      // Optionally, you can add retry logic here
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }

  sendInput(keys: string[], dt: number, sequence: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    const msg: ClientMessage = {
      type: 'input',
      keys,
      dt,
      sequence,
    };
    
    this.ws.send(JSON.stringify(msg));
  }

  onState(cb: (msg: StateMessage) => void): void {
    this.onStateCallback = cb;
  }

  onInit(cb: (id: string, players: Record<string, { x: number; y: number }>) => void): void {
    this.onInitCallback = cb;
  }
}
