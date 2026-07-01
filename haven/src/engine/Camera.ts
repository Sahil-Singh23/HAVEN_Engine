export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export function createCamera(width: number, height: number): Camera {
  return { x: 0, y: 0, width, height, zoom: 2.1 };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * camera.zoom,
    y: (worldY - camera.y) * camera.zoom,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Camera
): { x: number; y: number } {
  return {
    x: screenX / camera.zoom + camera.x,
    y: screenY / camera.zoom + camera.y,
  };
}

export function updateCamera(
  camera: Camera,
  targetX: number,
  targetY: number,
  dt: number,
  smoothing: number = 5,
  snap: boolean = false
): void {
  const targetCamX = targetX - (camera.width / camera.zoom) / 2;
  const targetCamY = targetY - (camera.height / camera.zoom) / 2;
  
  if (snap) {
    camera.x = targetCamX;
    camera.y = targetCamY;
  } else {
    camera.x += (targetCamX - camera.x) * smoothing * dt;
    camera.y += (targetCamY - camera.y) * smoothing * dt;
  }
}