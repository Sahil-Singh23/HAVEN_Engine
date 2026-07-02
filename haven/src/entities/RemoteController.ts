import type { RemoteEntity } from './Entity';

// Placeholder: in Phase 3/4, this will interpolate between server states
export function updateRemoteEntity(entity: RemoteEntity, dt: number): void {
  // For now, remotes don't move automatically
  // Future: apply interpolation from state buffer
  void dt;
  entity.velocity.x = 0;
  entity.velocity.y = 0;
}
