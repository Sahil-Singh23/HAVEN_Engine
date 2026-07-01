export interface TileLayer {
  name: string;
  type: 'tilelayer';
  width: number;
  height: number;
  data: number[];
}

export interface ObjectLayer {
  name: string;
  type: 'objectgroup';
  objects: Array<{
    x: number;
    y: number;
    name?: string;
    type?: string;
  }>;
}

export interface TilesetRef {
  firstgid: number;
  source: string;
}

export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: (TileLayer | ObjectLayer)[];
  tilesets: TilesetRef[];
}

export async function loadMap(url: string): Promise<TiledMap> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load map: ${response.status}`);
  return response.json();
}


