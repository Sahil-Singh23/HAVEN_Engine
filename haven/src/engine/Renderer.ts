import type { TiledMap, TileLayer } from '../map/MapLoader';
import type { LoadedTileset } from '../map/TilesetLoader';
import type { Camera } from './Camera';

const FLIPPED_H = 0x80000000;
const FLIPPED_V = 0x40000000;
const FLIPPED_D = 0x20000000;

function stripFlags(gid: number): number {
  return gid & ~(FLIPPED_H | FLIPPED_V | FLIPPED_D);
}

interface RenderLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export class MapRenderer {
  private bgLayers: RenderLayer[] = [];
  private fgLayers: RenderLayer[] = [];
  private tilesets: LoadedTileset[];
  private map: TiledMap;

  constructor(map: TiledMap, tilesets: LoadedTileset[]) {
    this.map = map;
    this.tilesets = tilesets.sort((a, b) => b.firstgid - a.firstgid);
    this.prerenderStaticLayers();
  }

  private findTileset(gid: number): LoadedTileset | undefined {
    const cleanGid = stripFlags(gid);
    for (const ts of this.tilesets) {
      if (cleanGid >= ts.firstgid) return ts;
    }
    return undefined;
  }

  private prerenderStaticLayers(): void {
    for (const layer of this.map.layers) {
      if (layer.type !== 'tilelayer') continue;
      if (layer.name.toLowerCase() === 'collision') continue;

      const canvas = document.createElement('canvas');
      canvas.width = this.map.width * this.map.tilewidth;
      canvas.height = this.map.height * this.map.tileheight;
      const ctx = canvas.getContext('2d')!;

      this.renderTileLayer(ctx, layer as TileLayer);

      const renderLayer: RenderLayer = { canvas, ctx };
      if (layer.name.toLowerCase().includes('foreground')) {
        this.fgLayers.push(renderLayer);
      } else {
        this.bgLayers.push(renderLayer);
      }
    }
  }

  private renderTileLayer(ctx: CanvasRenderingContext2D, layer: TileLayer): void {
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const gid = layer.data[y * layer.width + x];
        const cleanGid = stripFlags(gid);
        if (cleanGid === 0) continue;

        const tileset = this.findTileset(cleanGid);
        if (!tileset) continue;

        const localId = cleanGid - tileset.firstgid;
        const tileX = (localId % tileset.columns) * tileset.tilewidth;
        const tileY = Math.floor(localId / tileset.columns) * tileset.tileheight;

        ctx.drawImage(
          tileset.image,
          tileX, tileY, tileset.tilewidth, tileset.tileheight,
          x * this.map.tilewidth, y * this.map.tileheight,
          this.map.tilewidth, this.map.tileheight
        );
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    this.renderBackground(ctx, camera);
  }

  renderBackground(ctx: CanvasRenderingContext2D, camera: Camera): void {
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const layer of this.bgLayers) {
      ctx.drawImage(layer.canvas, 0, 0);
    }

    ctx.restore();
  }

  renderForeground(ctx: CanvasRenderingContext2D, camera: Camera): void {
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    for (const layer of this.fgLayers) {
      ctx.drawImage(layer.canvas, 0, 0);
    }

    ctx.restore();
  }
}