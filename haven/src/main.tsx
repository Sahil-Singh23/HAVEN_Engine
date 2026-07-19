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
import type{ ChatMode } from './shared/types';

type Screen = 'landing' | 'nickname' | 'loading' | 'game';

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
    return 'ws://localhost:3001';
  }
  return `${protocol}//${window.location.host}`;
};

function GameApp() {
  const [screen, setScreen] = useState<Screen>(pendingJoinCode ? 'loading' : 'landing');
  const [chatMode, setChatMode] = useState<ChatMode>('global');
  const [uiTick, setUiTick] = useState(0);

  // Toggle body class for game-mode (disables touch scrolling & overflow)
  useEffect(() => {
    if (screen === 'game' || screen === 'loading') {
      document.body.classList.add('game-mode');
      document.body.style.background = '#1d1110';
    } else {
      document.body.classList.remove('game-mode');
      document.body.style.background = '#F9F9FB';
    }
  }, [screen]);
  
  // Asset preloading states
  const [preloadedMap, setPreloadedMap] = useState<any>(null);
  const [preloadedTilesets, setPreloadedTilesets] = useState<any[]>([]);
  const [isGameReady, setIsGameReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const gameStateRef = useRef(new GameState());
  const networkRef = useRef(new NetworkClient());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pendingCodeRef = useRef(pendingJoinCode);

  // Preload map assets when the game screen starts
  useEffect(() => {
    if (screen === 'game') {
      setIsGameReady(false);
      setLoadProgress(0);
      let active = true;
      const preload = async () => {
        try {

          const map = await loadMap('/maps/final_map.tmj');
          if (!active) return;
          setLoadProgress(10);

          const validTilesets = map.tilesets.filter((ts: any) => ts.source);
          const totalTilesets = validTilesets.length;
          const tilesets = [];

          for (let i = 0; i < validTilesets.length; i++) {
            const ts = validTilesets[i];
            if (!active) return;

            const loaded = await loadTileset(ts.source, '/maps/');
            (loaded as any).firstgid = ts.firstgid;
            tilesets.push(loaded);
            if (active) {
              // Map JSON = 10%, tilesets share remaining 90%
              const tilesetProgress = 10 + Math.round(((i + 1) / totalTilesets) * 85);
              setLoadProgress(tilesetProgress);
            }
          }

          if (active) {

            setLoadProgress(98);
            setPreloadedMap(map);
            setPreloadedTilesets(tilesets);
            // Small delay so user sees 100% before overlay fades
            await new Promise(r => setTimeout(r, 200));
            if (active) setLoadProgress(100);
          }
        } catch (err) {
          console.error("Failed to preload map assets:", err);

        }
      };
      preload();
      return () => {
        active = false;
      };
    }
  }, [screen]);

  // Start game loop when entering game screen
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

    // Game systems
    let renderer: MapRenderer;
    let collisionGrid: ReturnType<typeof buildCollisionGrid>;
    let entityManager: EntityManager;
    let predictionBuffer: PredictionBuffer;
    let camera: Camera;
    let touchInput: TouchInput;
    let animationId: number;

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

    // Network handlers
    const setupNetwork = () => {
      network.on('init', (msg) => {
        gameState.setLocalId(msg.yourId);
        gameState.setInstanceCode(msg.code);
        gameState.setZones(msg.zones);

        // Populate players
        for (const [id, state] of Object.entries(msg.players)) {
          gameState.updatePlayer(id, state);
          
          if (id === msg.yourId) {
            const local = createLocalEntity(state.x, state.y);
            local.id = id;
            entityManager.add(local);
          } else {
            entityManager.add(createRemoteEntity(id, state.x, state.y));
          }
        }

        // Load chat history
        for (const chatMsg of msg.chatHistory) {
          gameState.addChatMessage(chatMsg);
        }

        setScreen('game');
      });

      network.on('state', (msg) => {
        // Update remote players
        for (const [id, state] of Object.entries(msg.players)) {
          gameState.updatePlayer(id, state);
          const entity = entityManager.get(id);
          if (entity && entity.type === 'remote') {
            entity.interpolationBuffer.add(
              { x: state.x, y: state.y },
              msg.tick
            );
          }
        }

        // Reconcile local player
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
            // Large error: snap
            localEntity.position.x = corrected.x;
            localEntity.position.y = corrected.y;
          } else if (errorDist > 0.1) {
            // Small error: smooth
            localEntity.position.x += errorX * 0.3;
            localEntity.position.y += errorY * 0.3;
          }
          // Tiny error: ignore
        }

        // Trigger UI redraw for remote players' movements and local player reconciliation
        setUiTick(t => t + 1);
      });

      network.on('playerJoined', (msg) => {
        gameState.updatePlayer(msg.player.id, msg.player);
        entityManager.add(createRemoteEntity(msg.player.id, msg.player.x, msg.player.y));
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
    };

    // Game loop
    let lastTime = 0;
    let lastInputSeq = 0;

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;

      const localPlayer = gameState.getLocalPlayer();
      
      if (localPlayer) {
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

        // Update camera
        if (localEntity) {
          updateCamera(
            camera,
            localEntity.position.x + 16,
            localEntity.position.y + 16,
            dt
          );
        }
      }

      // Update remote entities with interpolation
      const now = Date.now();
      for (const remote of entityManager.getRemotes()) {
        updateRemoteEntity(remote, now);
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

    // Initialize
    const init = async () => {
      try {
        if (!preloadedMap || !preloadedTilesets || preloadedTilesets.length === 0) {
          return;
        }

        const map = preloadedMap;
        const tilesets = preloadedTilesets;

        renderer = new MapRenderer(map, tilesets);
        collisionGrid = buildCollisionGrid(map);
        entityManager = new EntityManager();
        predictionBuffer = new PredictionBuffer();
        camera = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, zoom: 2.1 };
        touchInput = initTouchInput();

        setupNetwork();

        // Start loop
        animationId = requestAnimationFrame(loop);
        setIsGameReady(true);
      } catch (err) {
        console.error('Failed to initialize game:', err);
      }
    };

    init();

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
      if (touchInput) touchInput.destroy();
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [screen, preloadedMap, preloadedTilesets]);

  // Landing handlers
  const handleCreate = useCallback((name: string) => {
    const network = networkRef.current;
    network.connect(getWsUrl());

    network.on('instanceCreated', (msg) => {
      network.joinInstance(msg.code, name)
      ;
      setScreen('loading');
    });

    network.on('init', () => {
      setScreen('game');
    });

    network.onOpen(() => {
      network.createInstance(name);
    });
  }, []);

  const handleJoin = useCallback((code: string, name: string) => {
    const network = networkRef.current;
    network.connect(getWsUrl());

    network.on('init', () => {
      setScreen('game');
    });

    network.on('joinFailed', (msg) => {
      alert(msg.reason);
    });

    network.onOpen(() => {
      network.joinInstance(code, name);
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
    setPreloadedMap(null);
    setPreloadedTilesets([]);
    setScreen('landing');
  }, []);

  if (screen === 'landing') {
    return <Landing onCreate={handleCreate} />;
  }

  if (screen === 'nickname') {
    return (
      <NicknameModal onSubmit={(name) => {
        const code = joinMatch ? joinMatch[1].toUpperCase() : '';
        handleJoin(code, name);
        setScreen('loading');
      }} />
    );
  }

  if (screen === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a192f] text-[#ccd6f6] font-semibold text-xl">
        <h2>Connecting to space...</h2>
      </div>
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
