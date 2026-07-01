import { loadMap } from './map/MapLoader';
import type { ObjectLayer } from './map/MapLoader';
import { loadTileset } from './map/TilesetLoader';
import type { LoadedTileset } from './map/TilesetLoader';
import { MapRenderer } from './engine/Renderer';
import { createCamera, updateCamera } from './engine/Camera';
import { buildCollisionGrid } from './engine/Collision';
import { createPlayer, updatePlayer, renderPlayer } from './entities/Player';

async function main() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  
  // Handle resize and device pixel ratio
  const dpr = window.devicePixelRatio || 1;
  
  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Load map and tilesets
  const map = await loadMap('/maps/final_map.tmj');
  console.log('Map loaded:', map.width, 'x', map.height);
  console.log('Layers:', map.layers.map(l => l.name));
  console.log('Tilesets:', map.tilesets.map(t => t.source));

  const tilesets: LoadedTileset[] = [];
  for (const ts of map.tilesets) {
    if (!ts.source) continue; // Skip tilesets without a source
    const loaded = await loadTileset(ts.source, '/maps/');
    loaded.firstgid = ts.firstgid; // Set the map-specific firstgid on the loaded tileset
    tilesets.push(loaded);
    console.log('Loaded tileset:', loaded.name, 'with firstgid:', loaded.firstgid);
  }

  // Build systems
  const renderer = new MapRenderer(map, tilesets);
  const collisionGrid = buildCollisionGrid(map);

  // Find spawn point
  const objectsLayer = map.layers.find(
    (l): l is ObjectLayer => l.type === 'objectgroup' && l.name === 'objects'
  );
  const spawn = objectsLayer?.objects.find(o => o.name === 'spawn');
  
  const player = createPlayer(spawn?.x ?? 265, spawn?.y ?? 510);
  const camera = createCamera(window.innerWidth, window.innerHeight);

  // Input
  const keys = new Set<string>();
  window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  // Game loop
  let lastTime = 0;
  let spawnTime = 0;

  function loop(timestamp: number) {
    if (spawnTime === 0) {
      spawnTime = timestamp;
    }
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // Ensure canvas dimensions are in sync with window size
    if (
      canvas.width !== window.innerWidth * dpr ||
      canvas.height !== window.innerHeight * dpr
    ) {
      resize();
    }

    // Update camera dimensions to match viewport before updating camera position
    camera.width = window.innerWidth;
    camera.height = window.innerHeight;

    // Update
    updatePlayer(player, keys, collisionGrid, dt);

    // Snap camera for the first 1000ms to allow mobile viewports to stabilize
    const elapsedSinceSpawn = timestamp - spawnTime;
    const shouldSnap = elapsedSinceSpawn < 1000;

    updateCamera(
      camera,
      player.x + player.width / 2,
      player.y + player.height / 2,
      dt,
      5,
      shouldSnap
    );

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderer.renderBackground(ctx, camera);
    renderPlayer(ctx, player, camera);
    renderer.renderForeground(ctx, camera);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main().catch(err => {
  console.error('Game failed to start:', err);
});