import type { RemoteEntity } from './Entity';

export function updateRemoteEntity(entity: RemoteEntity, now: number): void {
  const pos = entity.interpolationBuffer.getPosition(now);
  if (pos) {
    entity.position.x = pos.x;
    entity.position.y = pos.y;
  }
}
