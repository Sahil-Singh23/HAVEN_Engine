// src/shared/types.ts

// ========== PLAYER STATE ==========

// these contatins the schema shared between the frontend n backend, 
//By defining these interfaces in a
  // single "shared" file, both your TypeScript React code
  // and your Node.js server can import them, guaranteeing
  // compile-time type safety across your entire stack.
export interface PlayerState {
  x: number;
  y: number;
  status: 'online' | 'away';
  room: string | null;
  name: string;
}


export interface PlayerStateWithId extends PlayerState {
  id: string;
}

// Server sends this back to YOU specifically for reconciliation
export interface LocalPlayerState extends PlayerState {
  sequence: number;
}

// ========== ZONES ==========

//zones - arcade , meetings, admin etc
export interface ZoneData {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ========== INSTANCE / CONNECTION ==========

//sent by client to server to create an instance
export interface CreateInstanceMessage {
  type: 'createInstance';
  name: string;
}

//sent by client to server to join an instance
export interface JoinInstanceMessage {
  type: 'joinInstance';
  code: string;
  name: string;
}

//sent by server to client to join an instance
export interface InstanceCreatedMessage {
  type: 'instanceCreated';
  code: string;
}

//failed join
export interface JoinFailedMessage {
  type: 'joinFailed';
  reason: string;
}

//sent by server upon joining 
export interface InitMessage {
  type: 'init';
  yourId: string;
  code: string;
  players: Record<string, PlayerState>;
  zones: ZoneData[];
  chatHistory: ChatMessage[];
}

// ========== GAME STATE SYNC ==========

//scheme for every tick sent by the server 
export interface StateMessage {
  type: 'state';
  tick: number;
  // All OTHER players in the instance
  players: Record<string, PlayerState>;
  // YOUR state, with sequence ack for reconciliation
  local: LocalPlayerState;
}

//sent by server, broadcast to all upon joining 
export interface PlayerJoinedMessage {
  type: 'playerJoined';
  player: PlayerStateWithId;
}

//sent by server, broadcast to all upon leaving 
export interface PlayerLeftMessage {
  type: 'playerLeft';
  id: string;
}

//sent by server, broadcast to all upon status change 
export interface StatusChangedMessage {
  type: 'statusChanged';
  id: string;
  status: 'online' | 'away';
}

// ========== CHAT ==========


export type ChatMode = 'global' | 'room' | 'nearby';

// The full schema of a chat bubble,
//  recording who sent it, where they sent it, what room
//  they were in, and when it was sent.
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  mode: ChatMode;
  room: string | null;
  x: number;
  y: number;
  timestamp: number;
}


export interface ChatSendMessage {
  type: 'chat';
  text: string;
  mode: ChatMode;
}

export interface ChatReceiveMessage {
  type: 'chat';
  message: ChatMessage;
}

// ========== INPUT ==========


//sent by clients 
export interface InputMessage {
  type: 'input';
  keys: string[];
  dt: number;
  sequence: number;
  x: number;
  y: number;
}

// ========== HEARTBEAT ==========

//sent by player to 
export interface HeartbeatMessage {
  type: 'heartbeat';
}

// ========== UNIONS ==========

//types of server msgs 
export type ServerMessage = 
  | InstanceCreatedMessage
  | JoinFailedMessage
  | InitMessage
  | StateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | StatusChangedMessage
  | ChatReceiveMessage;

//types of client msgs
export type ClientMessage = 
  | CreateInstanceMessage
  | JoinInstanceMessage
  | InputMessage
  | ChatSendMessage
  | HeartbeatMessage;
