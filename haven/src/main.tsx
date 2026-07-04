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
import { updateRemoteEntity } from './entities/RemoteController';
import { renderEntities } from './entities/EntityRenderer';
import { NetworkClient } from './network/NetworkClient';
import { initTouchInput } from './input/TouchInput';
import { PredictionBuffer } from './network/PredictionBuffer';

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
  const predictionBuffer = new PredictionBuffer();

  let localId: string | null = null;

  //heree
  const keys = new Set<string>(); 
//Because Set represents:
//“what is currently active”

  window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  const getTouchKeys = initTouchInput();

//56-108 network setup, or ws setup
  network.onInit((id, serverPlayers) => {
    // on init we receive server players, based on pid we just add them local player entity or remote player entity 
    localId = id;
    for (const [pid, pstate] of Object.entries(serverPlayers)) {
      const entity = (pid === id)
        ? createLocalEntity(pstate.x, pstate.y)
        : createRemoteEntity(pid, pstate.x, pstate.y);
      entity.id = pid;
      entityManager.add(entity);
    }
  });

  network.onState((msg) => {
    for (const [pid, serverEntityState] of Object.entries(msg.players)) {
      const entity = entityManager.get(pid);
      if (!entity) {
        console.log('New player joined:', pid);
        const remote = createRemoteEntity(pid, serverEntityState.x, serverEntityState.y);
        entityManager.add(remote);
        continue;
      }

      if (entity.type === 'local') {
        const serverStateForReconcile = {
          position: { x: serverEntityState.x, y: serverEntityState.y },
          sequence: serverEntityState.sequence,
        };
        const reconciledPos = predictionBuffer.reconcile(serverStateForReconcile, entity.size, entity.speed, collisionGrid);

        const error = Math.sqrt(
          (reconciledPos.x - entity.position.x) ** 2 +
          (reconciledPos.y - entity.position.y) ** 2
        );

        if (error > 20) { // Large error, snap to prevent visual chaos
          entity.position.x = reconciledPos.x;
          entity.position.y = reconciledPos.y;
        } else if (error > 0.1) { // Smoothly correct small errors
          entity.position.x += (reconciledPos.x - entity.position.x) * 0.2;
          entity.position.y += (reconciledPos.y - entity.position.y) * 0.2;
        }
      } else {
        entity.interpolationBuffer.add({ x: serverEntityState.x, y: serverEntityState.y }, msg.tick);
      }
    }
    const serverIds = new Set(Object.keys(msg.players));
    for (const entity of entityManager.getAll()) {
      if (!serverIds.has(entity.id)) {
        console.log('Player left:', entity.id);
        entityManager.remove(entity.id);
      }
    }
  });

  network.connect('ws://192.168.29.71:3001');
  // http://192.168.29.71:5173/

  let lastTime = 0;
  function loop(timestamp: number) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1) || 0.016;
    lastTime = timestamp;
    const now = Date.now();

    const allKeys = new Set([...keys, ...getTouchKeys()]);
    const local = entityManager.getLocal();

    // Update local player and send input
    if (local) {
      if (allKeys.size > 0) {
        updateLocalEntity(local, allKeys, collisionGrid, dt);
        const sequence = predictionBuffer.add(Array.from(allKeys), dt);
        network.sendInput(Array.from(allKeys), dt, sequence);
      }
      updateCamera(camera, local.position.x + local.size.width / 2, local.position.y + local.size.height / 2, dt, 5);
    }

    // Update remote entities with interpolation
    for (const entity of entityManager.getRemotes()) {
      updateRemoteEntity(entity, now);
    }

    if (canvas.width !== window.innerWidth * dpr || canvas.height !== window.innerHeight * dpr) resize();
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

main().catch(err => console.error('Game failed to start:', err));