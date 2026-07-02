import { loadMap } from './map/MapLoader';
import type { ObjectLayer } from './map/MapLoader';
import { loadTileset } from './map/TilesetLoader';
import type { LoadedTileset } from './map/TilesetLoader';
import { MapRenderer } from './engine/Renderer';
import { createCamera, updateCamera } from './engine/Camera';
import { buildCollisionGrid } from './engine/Collision';
import { EntityManager } from './entities/EntityManager';
import { createLocalEntity, createRemoteEntity } from './entities/Entity';
import { updateLocalEntity } from './entities/LocalController';
import { renderEntities } from './entities/EntityRenderer';
import { NetworkClient } from './network/NetworkClient';

async function main() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  
  const dpr = window.devicePixelRatio || 1;
  
  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const map = await loadMap('/maps/final_map.tmj');
  const tilesets: LoadedTileset[] = [];
  for (const ts of map.tilesets) {
    if (!ts.source) continue;
    const loaded = await loadTileset(ts.source, '/maps/');
    loaded.firstgid = ts.firstgid;
    tilesets.push(loaded);
  }

  const renderer = new MapRenderer(map, tilesets);
  const collisionGrid = buildCollisionGrid(map);
  const camera = createCamera(window.innerWidth, window.innerHeight);

  const entityManager = new EntityManager();
  const network = new NetworkClient();

  let localId: string | null = null;

  const keys = new Set<string>();
  window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  network.onInit((id, serverPlayers) => {
    localId = id;
    console.log(`Assigned local ID: ${id}`);

    for (const [pid, pos] of Object.entries(serverPlayers)) {
      const isLocal = pid === id;
      const entity = isLocal
        ? createLocalEntity(pos.x, pos.y)
        : createRemoteEntity(pid, pos.x, pos.y);
      entity.id = pid; // Override generated ID with server-authoritative ID
      entityManager.add(entity);
    }
  });

  network.onState((msg) => {
    const serverIds = new Set<string>();
    for (const [pid, pos] of Object.entries(msg.players)) {
      serverIds.add(pid);
      const entity = entityManager.get(pid);
      
      if (entity) {
        if (entity.type !== 'local') { // Naive state sync for remotes
          entity.position.x = pos.x;
          entity.position.y = pos.y;
        }
      } else {
        // New player joined
        console.log('New player joined:', pid);
        const remote = createRemoteEntity(pid, pos.x, pos.y);
        entityManager.add(remote);
      }
    }
    
    // Remove disconnected players
    for (const entity of entityManager.getAll()) {
      if (!serverIds.has(entity.id)) {
        console.log('Player left:', entity.id);
        entityManager.remove(entity.id);
      }
    }
  });

  network.connect('ws://localhost:3001');

  let lastTime = 0;
  
  function loop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // Send inputs to the server
    if (localId) {
      network.sendInput(Array.from(keys), dt);
    }

    // Update and render
    const local = entityManager.getLocal();
    if (local) {
      // We still run local movement for camera smoothness.
      // The server state will ultimately override this position.
      updateLocalEntity(local, keys, collisionGrid, dt);
      
      updateCamera(
        camera,
        local.position.x + local.size.width / 2,
        local.position.y + local.size.height / 2,
        dt,
        5,
        false // Snapping is no longer needed with server-driven state
      );
    }
    
    if (canvas.width !== window.innerWidth * dpr || canvas.height !== window.innerHeight * dpr) {
      resize();
    }
    camera.width = window.innerWidth;
    camera.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderer.renderBackground(ctx, camera);
    renderEntities(ctx, entityManager.getAll(), camera);
    renderer.renderForeground(ctx, camera);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

main().catch(err => {
  console.error('Game failed to start:', err);
});