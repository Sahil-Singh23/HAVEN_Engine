import type { AnyEntity, LocalEntity, RemoteEntity } from './Entity';

export class EntityManager {
  private entities = new Map<string, AnyEntity>();

  add(entity: AnyEntity): void {
    this.entities.set(entity.id, entity);
  }

  remove(id: string): void {
    this.entities.delete(id);
  }

  get(id: string): AnyEntity | undefined {
    return this.entities.get(id);
  }

  getLocal(): LocalEntity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.type === 'local') return entity;
    }
    return undefined;
  }

  getRemotes(): RemoteEntity[] {
    const remotes: RemoteEntity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.type === 'remote') remotes.push(entity);
    }
    return remotes;
  }

  getAll(): AnyEntity[] {
    return Array.from(this.entities.values());
  }

  clear(): void {
    this.entities.clear();
  }
}
