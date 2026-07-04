import type { Position } from '../entities/Entity';

interface Snapshot {
  position: Position;
  timestamp: number;
}

export class InterpolationBuffer {
  private snapshots: Snapshot[] = [];
  private readonly delay = 100; // Render 100ms in the past to ensure we have data to interpolate between

  public add(position: Position, serverTimestamp: number): void {
    this.snapshots.push({ position, timestamp: serverTimestamp });

    // Garbage collect old snapshots
    if (this.snapshots.length > 30) {
      this.snapshots.shift();
    }
  }

  public getPosition(renderTimestamp: number): Position | null {
    const bufferTime = renderTimestamp - this.delay;

    // Find the two snapshots that surround the render time
    for (let i = this.snapshots.length - 1; i >= 1; i--) {
      const newer = this.snapshots[i];
      const older = this.snapshots[i - 1];

      if (newer.timestamp >= bufferTime && older.timestamp <= bufferTime) {
        const timeDiff = newer.timestamp - older.timestamp;
        const interpolationFactor = timeDiff > 0 ? (bufferTime - older.timestamp) / timeDiff : 0;

        const x = older.position.x + (newer.position.x - older.position.x) * interpolationFactor;
        const y = older.position.y + (newer.position.y - older.position.y) * interpolationFactor;

        return { x, y };
      }
    }

    // If no suitable snapshots found, return the most recent one we have
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].position : null;
  }
}
