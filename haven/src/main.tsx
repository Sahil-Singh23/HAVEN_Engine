// src/main.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { NetworkClient } from './network/NetworkClient';
import { GameState } from './game/GameState';
import { Landing } from './ui/Landing';
import { NicknameModal } from './ui/NicknameModal';
import { GameOverlay } from './ui/GameOverlay';
import { EntityManager } from './entities/EntityManager';
import { createLocalEntity, createRemoteEntity } from './entities/Entity';
import { updateLocalEntity } from './entities/LocalController';
import { updateRemoteEntity } from './entities/RemoteController';
import { renderEntities } from './entities/EntityRenderer';
import { MapRenderer } from './engine/Renderer';
import { type Camera, updateCamera } from './engine/Camera';
import { buildCollisionGrid } from './engine/Collision';
import { loadMap } from './map/MapLoader';
import { loadTileset } from './map/TilesetLoader';
import { PredictionBuffer } from './network/PredictionBuffer';
import { initTouchInput, type TouchInput } from './input/TouchInput';
import type { ChatMode } from './shared/types';
import { loadSpriteSheet } from './entities/SpriteRenderer';

type Screen = 'landing' | 'nickname' | 'game';

// Check for /join/:code in the URL before React renders anything
const joinMatch = window.location.pathname.match(/^\/join\/([A-Za-z0-9]{6})$/);
const pendingJoinCode = joinMatch ? joinMatch[1].toUpperCase() : null;
if (pendingJoinCode) {
  window.history.replaceState(null, '', '/');
}

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'ws://localhost:5010';
  }
  return `${protocol}//${window.location.hostname}:5010`;
};

// ── Eager asset preloader ──────────────────────────────────────────────────
// Starts downloading map + tileset assets immediately when the JS bundle
// loads (on Landing page or NicknameModal), so they're ready by the time
// the user clicks Join/Create.
const assetPreloader = (() => {
  type Listener = (progress: number) => void;
  let result: { map: any; tilesets: any[] } | null = null;
  let error: Error | null = null;
  let progress = 0;
  const listeners = new Set<Listener>();

  const notify = () => listeners.forEach(l => l(progress));

  const promise = (async () => {
    const map = await loadMap('/maps/final_map.tmj');
    progress = 10;
    notify();

    const validTilesets = map.tilesets.filter((ts: any) => ts.source);
    const totalTilesets = validTilesets.length;
    const tilesets: any[] = [];

    for (let i = 0; i < validTilesets.length; i++) {
      const ts = validTilesets[i];
      const loaded = await loadTileset(ts.source, '/maps/');
      (loaded as any).firstgid = ts.firstgid;
      tilesets.push(loaded);
      progress = 10 + Math.round(((i + 1) / totalTilesets) * 85);
      notify();
    }

    progress = 96;
    notify();

    // Preload default sprite sheet
    await loadSpriteSheet('8D actor1-1[VS8]').catch(() => { });
    progress = 98;
    notify();

    result = { map, tilesets };
    return result;
  })().catch(err => {
    error = err;
    console.error('Asset preloader failed:', err);
    throw err;
  });

  return {
    /** Already-resolved result (null if still loading) */
    getResult: () => result,
    getProgress: () => progress,
    getError: () => error,
    /** Await the full preload */
    wait: () => promise,
    /** Subscribe to progress updates (0–98). Returns unsubscribe fn. */
    onProgress: (fn: Listener) => {
      listeners.add(fn);
      // Immediately fire current progress so late subscribers catch up
      fn(progress);
      return () => { listeners.delete(fn); };
    },
  };
})();

function GameApp() {
  const [screen, setScreen] = useState<Screen>(pendingJoinCode ? 'nickname' : 'landing');
  const [chatMode, setChatMode] = useState<ChatMode>('global');
  const [uiTick, setUiTick] = useState(0);

  // Toggle body class for game-mode (disables touch scrolling & overflow)
  useEffect(() => {
    if (screen === 'game') {
      document.body.classList.add('game-mode');
      document.body.style.background = '#1d1110';
    } else {
      document.body.classList.remove('game-mode');
      document.body.style.background = '#F9F9FB';
    }
  }, [screen]);

  // Asset preloading — stored in refs so they NEVER trigger effect re-runs.
  // The game-loop effect must only run once per screen='game' transition;
  // re-running it destroys the entity manager and double-registers handlers.
  const preloadedMapRef = useRef<any>(null);
  const preloadedTilesetsRef = useRef<any[]>([]);
  // Callback the game-loop effect registers to be called when assets are ready.
  const onAssetsReadyRef = useRef<(() => void) | null>(null);

  const [isGameReady, setIsGameReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const gameStateRef = useRef(new GameState());
  const networkRef = useRef(new NetworkClient());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pendingCodeRef = useRef(pendingJoinCode);

  // Subscribe to the asset preloader's progress and resolution.
  // Writes results into refs (no state), then fires the game-loop callback.
  useEffect(() => {
    if (screen !== 'game') return;

    setIsGameReady(false);
    let active = true;

    // Subscribe to progress updates from the preloader
    const unsub = assetPreloader.onProgress((p) => {
      if (active) setLoadProgress(p);
    });

    assetPreloader.wait().then(({ map, tilesets }) => {
      if (!active) return;
      // Store in refs — NOT state — so the game-loop effect is not re-triggered.
      preloadedMapRef.current = map;
      preloadedTilesetsRef.current = tilesets;
      // Fire the game-loop's asset-ready callback (if it has registered one).
      onAssetsReadyRef.current?.();
      // Small delay so user sees 100% before overlay fades
      setTimeout(() => {
        if (active) setLoadProgress(100);
      }, 200);
    }).catch(err => {
      console.error('Failed to preload map assets:', err);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [screen]);

  // Start game loop when entering game screen.
  // CRITICAL: depends ONLY on [screen]. Preloaded assets are read from refs,
  // not React state, so this effect runs exactly ONCE per screen='game'
  // transition. Re-running it would destroy the entity manager (which already
  // has entities from the server init message) and double-register handlers.
  useEffect(() => {
    if (screen !== 'game') {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameState = gameStateRef.current;
    const network = networkRef.current;

    // Canvas setup
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Game systems — assigned once assets are ready (see initAssets below)
    let renderer: MapRenderer;
    let collisionGrid: ReturnType<typeof buildCollisionGrid>;
    let predictionBuffer: PredictionBuffer;
    let camera: Camera = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, zoom: 2.1 };
    let touchInput: TouchInput;
    let animationId: number;

    // entityManager lives for the entire screen='game' session.
    // It MUST be created here, before any network handler fires, so that
    // 'init' and 'state' messages can populate it immediately.
    const entityManager = new EntityManager();

    // Input
    const keys = new Set<string>();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore movement key presses if the user is typing in any text input or textarea
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
      }
      keys.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      // Always allow releasing keys to prevent players from continuing to walk forever if they focus the chat while moving
      keys.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ── Network handlers ────────────────────────────────────────────────────
    // Registered immediately — BEFORE assets finish loading — so no server
    // messages are ever dropped while the map is still being parsed.
    network.on('init', (msg) => {
      gameState.setLocalId(msg.yourId);
      gameState.setInstanceCode(msg.code);
      gameState.setZones(msg.zones);

      // Populate players into the already-live entityManager
      for (const [id, state] of Object.entries(msg.players)) {
        gameState.updatePlayer(id, state);

        if (id === msg.yourId) {
          const local = createLocalEntity(state.x, state.y, state.sprite);
          local.id = id;
          entityManager.add(local);
          loadSpriteSheet(state.sprite).catch(() => { });
        } else {
          entityManager.add(createRemoteEntity(id, state.x, state.y, state.sprite));
          loadSpriteSheet(state.sprite).catch(() => { });
        }
      }

      // Load chat history
      for (const chatMsg of msg.chatHistory) {
        gameState.addChatMessage(chatMsg);
      }

      // Ensure screen transitions to game when init arrives
      setScreen('game');
    });

    network.on('state', (msg) => {
      // Feed positions into each remote entity's interpolation buffer
      for (const [id, state] of Object.entries(msg.players)) {
        gameState.updatePlayer(id, state);

        if (id !== gameState.localId) {
          let entity = entityManager.get(id);
          if (!entity) {
            entity = createRemoteEntity(id, state.x, state.y, state.sprite);
            entityManager.add(entity);
            loadSpriteSheet(state.sprite).catch(() => { });
          }
          if (entity && entity.type === 'remote') {
            entity.interpolationBuffer.add(
              { x: state.x, y: state.y },
              Date.now()
            );
          }
        }
      }

      // Reconcile local player — only once collision/prediction are ready
      if (collisionGrid && predictionBuffer) {
        const localEntity = entityManager.getLocal();
        if (localEntity && localEntity.type === 'local' && msg.local) {
          const corrected = predictionBuffer.reconcile(
            {
              position: { x: msg.local.x, y: msg.local.y },
              sequence: msg.local.sequence
            },
            localEntity.size,
            localEntity.speed,
            collisionGrid
          );

          const errorX = corrected.x - localEntity.position.x;
          const errorY = corrected.y - localEntity.position.y;
          const errorDist = Math.sqrt(errorX * errorX + errorY * errorY);

          if (errorDist > 10) {
            localEntity.position.x = corrected.x;
            localEntity.position.y = corrected.y;
          } else if (errorDist > 0.1) {
            localEntity.position.x += errorX * 0.3;
            localEntity.position.y += errorY * 0.3;
          }
        }
      }

      setUiTick(t => t + 1);
    });

    network.on('playerJoined', (msg) => {
      gameState.updatePlayer(msg.player.id, msg.player);
      entityManager.add(createRemoteEntity(msg.player.id, msg.player.x, msg.player.y, msg.player.sprite));
      loadSpriteSheet(msg.player.sprite).catch(() => { });
      setUiTick(t => t + 1);
    });

    network.on('playerLeft', (msg) => {
      gameState.removePlayer(msg.id);
      entityManager.remove(msg.id);
      setUiTick(t => t + 1);
    });

    network.on('statusChanged', (msg) => {
      const player = gameState.players.get(msg.id);
      if (player) {
        player.status = msg.status;
        setUiTick(t => t + 1);
      }
    });

    network.on('chat', (msg) => {
      gameState.addChatMessage(msg.message);
      setUiTick(t => t + 1);
    });

    // Game loop
    let lastTime = 0;
    let lastInputSeq = 0;

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;

      // Skip full update/render until the map renderer is ready
      if (!renderer) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      const localPlayer = gameState.getLocalPlayer();

      if (localPlayer && touchInput && collisionGrid && predictionBuffer) {
        // Merge inputs
        const touchKeys = touchInput.getKeys();
        const allKeys = new Set([...keys, ...touchKeys]);

        // Update local entity
        const localEntity = entityManager.get(localPlayer.id);
        if (localEntity && localEntity.type === 'local') {
          updateLocalEntity(localEntity, allKeys, collisionGrid, dt);

          // Update room and trigger UI updates upon zone boundary crossings
          const oldRoom = gameState.currentRoom;
          const newRoom = gameState.updateLocalRoom(
            localEntity.position.x,
            localEntity.position.y
          );
          if (oldRoom !== newRoom) {
            setUiTick(t => t + 1);
          }

          // Send input to server
          if (allKeys.size > 0 || lastInputSeq === 0) {
            lastInputSeq = predictionBuffer.add(
              Array.from(allKeys),
              dt
            );

            network.sendInput(
              Array.from(allKeys),
              dt,
              lastInputSeq,
              localEntity.position.x,
              localEntity.position.y
            );
          }
        }

        // Update camera — center on entity hitbox
        if (localEntity) {
          updateCamera(
            camera,
            localEntity.position.x + localEntity.size.width / 2,
            localEntity.position.y + localEntity.size.height / 2,
            dt
          );
        }
      }

      // Update remote entities with interpolation
      const now = Date.now();
      for (const remote of entityManager.getRemotes()) {
        updateRemoteEntity(remote, now, dt);
      }

      camera.width = window.innerWidth;
      camera.height = window.innerHeight;

      // Build player names map from game state
      const playerNames = new Map<string, string>();
      for (const [id, p] of gameState.players) {
        playerNames.set(id, p.name);
      }

      // Render
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderer.renderBackground(ctx, camera);
      renderEntities(ctx, entityManager.getAll(), camera, playerNames);
      renderer.renderForeground(ctx, camera);

      animationId = requestAnimationFrame(loop);
    };

    // Start the render loop immediately; it idles until renderer is assigned
    animationId = requestAnimationFrame(loop);

    // ── Asset initialization ─────────────────────────────────────────────────
    // Reads from refs (not state) — calling this never triggers a re-render
    // or re-runs this effect. Called either immediately (if assets are already
    // done) or via the onAssetsReadyRef callback when they finish.
    const initAssets = () => {
      const map = preloadedMapRef.current;
      const tilesets = preloadedTilesetsRef.current;
      if (!map || !tilesets || tilesets.length === 0) return;

      try {
        renderer = new MapRenderer(map, tilesets);
        collisionGrid = buildCollisionGrid(map);
        predictionBuffer = new PredictionBuffer();
        touchInput = initTouchInput();
        setIsGameReady(true);
      } catch (err) {
        console.error('Failed to initialize game assets:', err);
      }
    };

    // Register so the preloader effect can call us when assets finish
    onAssetsReadyRef.current = initAssets;

    // If assets were already loaded before we got here, init immediately
    initAssets();

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      network.heartbeat();
    }, 30000);

    cleanupRef.current = () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId);
      clearInterval(heartbeatInterval);
      onAssetsReadyRef.current = null;
      if (touchInput) touchInput.destroy();
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [screen]);

  const handleCreate = useCallback((name: string, sprite: string) => {
    const network = networkRef.current;
    network.connect(getWsUrl());

    network.on('instanceCreated', (msg) => {
      network.joinInstance(msg.code, name, sprite);
      setScreen('game');
    });

    network.on('init', () => {
      setScreen('game');
    });

    network.onOpen(() => {
      network.createInstance(name, sprite);
    });
  }, []);

  const handleJoin = useCallback((code: string, name: string, sprite: string) => {
    const network = networkRef.current;
    network.connect(getWsUrl());

    network.on('init', () => {
      setScreen('game');
    });

    network.on('joinFailed', (msg) => {
      alert(msg.reason);
    });

    network.onOpen(() => {
      network.joinInstance(code, name, sprite);
      setScreen('game');
    });
  }, []);

  // Auto-join from invite URL (e.g. /join/ABC123)
  // Show nickname modal first so user can pick a name
  useEffect(() => {
    const code = pendingCodeRef.current;
    if (code) {
      pendingCodeRef.current = null;
      setScreen('nickname');
    }
  }, []);

  const handleSendChat = useCallback((text: string) => {
    networkRef.current.sendChat(text, chatMode);
  }, [chatMode]);

  const handleExitRoom = useCallback(() => {
    networkRef.current.disconnect();
    gameStateRef.current.reset();
    setIsGameReady(false);
    // Clear asset refs so initAssets runs fresh on next join
    preloadedMapRef.current = null;
    preloadedTilesetsRef.current = [];
    setScreen('landing');
  }, []);

  if (screen === 'landing') {
    return <Landing onCreate={handleCreate} />;
  }

  if (screen === 'nickname') {
    return (
      <NicknameModal onSubmit={(name, sprite) => {
        const code = joinMatch ? joinMatch[1].toUpperCase() : '';
        // setScreen('game') is called inside handleJoin's network.onOpen —
        // same pattern as handleCreate — so we do NOT call it here.
        handleJoin(code, name, sprite);
      }} />
    );
  }


  return (
    <>
      <canvas id="game" ref={canvasRef} className="block fixed inset-0 w-full h-full z-[1]" />

      {/* Blurred Spawning Overlay */}
      {!isGameReady && (
        <div className="fixed inset-0 z-[2] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500">
          {/* Blurred background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/spawnScreen.webp')",
              filter: "blur(12px) brightness(0.55)"
            }}
          />
          {/* Loading content */}
          <div className="relative z-10 flex flex-col items-center gap-6 text-center px-6">
            <h2
              className="text-3xl md:text-4xl text-white tracking-tight"
              style={{ fontFamily: "'Gilda Display', serif", fontWeight: 200 }}
            >
              Spawning into the world
            </h2>

            {/* Progress bar */}
            <div style={{ width: '280px', maxWidth: '80vw' }}>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${loadProgress}%`,
                    height: '100%',
                    borderRadius: '2px',
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9))',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'right',
                  alignItems: 'right',
                  marginTop: '10px',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.7)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                    fontFamily: '"roobert", "roobert Fallback", sans-serif',
                  }}
                >
                  {loadProgress}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <GameOverlay
        gameState={gameStateRef.current}
        chatMode={chatMode}
        onChatModeChange={setChatMode}
        onSendChat={handleSendChat}
        uiTick={uiTick}
        onExitRoom={handleExitRoom}
        isGameReady={isGameReady}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<GameApp />);
