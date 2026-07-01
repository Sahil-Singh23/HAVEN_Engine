import type { TiledMap, TileLayer } from '../map/MapLoader';

const FLIPPED_FLAGS = 0x80000000 | 0x40000000 | 0x20000000;

function stripFlags(gid: number): number {
  return gid & ~FLIPPED_FLAGS;
}

export interface CollisionGrid {
  width: number;
  height: number;
  tileSize: number;
  grid: boolean[][];
}

export function buildCollisionGrid(map: TiledMap, layerName: string = 'collision'): CollisionGrid {
  let layer = map.layers.find(
    (l): l is TileLayer => l.type === 'tilelayer' && l.name === layerName
  );

  // If not found, try a case-insensitive search
  if (!layer) {
    layer = map.layers.find(
      (l): l is TileLayer => l.type === 'tilelayer' && l.name.toLowerCase() === layerName.toLowerCase()
    ) as TileLayer | undefined;
  }

  if (!layer) throw new Error(`Collision layer "${layerName}" not found`);

  const grid: boolean[][] = [];

  for (let y = 0; y < layer.height; y++) {
    grid[y] = [];
    for (let x = 0; x < layer.width; x++) {
      const gid = layer.data[y * layer.width + x];
      grid[y][x] = stripFlags(gid) !== 0;
    }
  }

  return {
    width: layer.width,
    height: layer.height,
    tileSize: map.tilewidth,
    grid,
  };
}

export function isSolid(grid: CollisionGrid, worldX: number, worldY: number): boolean {
  const tx = Math.floor(worldX / grid.tileSize);
  const ty = Math.floor(worldY / grid.tileSize);

  if (tx < 0 || tx >= grid.width || ty < 0 || ty >= grid.height) return true;
  //return false; disable collion
  return grid.grid[ty][tx];
}