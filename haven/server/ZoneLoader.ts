// server/ZoneLoader.ts

import { ZoneData } from '../src/shared/types.js';

export function loadZones(mapData: any): ZoneData[] {
  const zonesLayer = mapData.layers.find(
    (l: any) => l.type === 'objectgroup' && l.name === 'zones'
  );
  
  if (!zonesLayer) {
    console.warn('No zones layer found in map');
    return [];
  }
  
  return zonesLayer.objects.map((obj: any) => ({
    name: obj.name || 'unnamed-zone',
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height
  }));
}

export function getPlayerRoom(
  x: number, 
  y: number, 
  zones: ZoneData[]
): string | null {
  for (const zone of zones) {
    if (x >= zone.x && 
        x <= zone.x + zone.width && 
        y >= zone.y && 
        y <= zone.y + zone.height) {
      return zone.name;
    }
  }
  return null;
}
