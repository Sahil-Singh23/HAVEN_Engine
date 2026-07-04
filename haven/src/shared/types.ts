export interface PlayerState {
  x: number;
  y: number;
  sequence: number;
}

export interface StateMessage {
  type: 'state';
  tick: number;
  players: Record<string, PlayerState>;
}

export interface InitMessage {
  type: 'init';
  yourId: string;
  players: Record<string, PlayerState>;
}

export interface InputMessage {
  type: 'input';
  keys: string[];
  dt: number;
  sequence: number;
}

export type ServerMessage = StateMessage | InitMessage;
export type ClientMessage = InputMessage;
