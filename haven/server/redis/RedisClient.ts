import { createClient, RedisClientType } from 'redis';

export class RedisClient {
  private client: RedisClientType;
  private pub: RedisClientType;
  private sub: RedisClientType;
  private serverId: string;

  constructor(serverId: string, url: string = 'redis://localhost:6379') {
    this.serverId = serverId;
    this.client = createClient({ url });
    this.pub = createClient({ url });
    this.sub = createClient({ url });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.pub.connect();
    await this.sub.connect();
    console.log(`[${this.serverId}] Redis connected`);
  }

  // Instance registry
  async registerInstance(code: string): Promise<void> {
    await this.client.hSet(`instance:${code}`, {
      server: this.serverId,
      createdAt: Date.now().toString()
    });
    await this.client.expire(`instance:${code}`, 3600);
    await this.client.sAdd(`server:${this.serverId}:instances`, code);
  }

  async getInstanceServer(code: string): Promise<string | null> {
    return await this.client.hGet(`instance:${code}`, 'server');
  }

  async removeInstance(code: string): Promise<void> {
    await this.client.del(`instance:${code}`);
    await this.client.sRem(`server:${this.serverId}:instances`, code);
  }

  // Player presence
  async setPlayerPresence(playerId: string, instanceCode: string): Promise<void> {
    await this.client.hSet(`player:${playerId}`, {
      instance: instanceCode,
      server: this.serverId,
      lastSeen: Date.now().toString()
    });
    await this.client.expire(`player:${playerId}`, 60);
  }

  async removePlayerPresence(playerId: string): Promise<void> {
    await this.client.del(`player:${playerId}`);
  }

  getServerId(): string {
    return this.serverId;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.pub.quit();
    await this.sub.quit();
  }
}