// src/ui/GameOverlay.tsx

import { useState } from 'react';
import { GameState } from '../game/GameState';
import type { ChatMode } from '../shared/types';
import { CodeHud } from './CodeHud';
import { PlayerList } from './PlayerList';
import { ChatPanel } from './ChatPanel';
import { ShareModal } from './ShareModal';

interface GameOverlayProps {
  gameState: GameState;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  onSendChat: (text: string) => void;
  uiTick: number;
  onExitRoom: () => void;
  isGameReady: boolean;
}

export function GameOverlay({ 
  gameState, 
  chatMode, 
  onChatModeChange, 
  onSendChat,
  uiTick,
  onExitRoom,
  isGameReady
}: GameOverlayProps) {
  const [showShareModal, setShowShareModal] = useState(true);
  const localPlayer = gameState.getLocalPlayer();

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-10" data-tick={uiTick}>
      <CodeHud 
        instanceCode={gameState.instanceCode ?? ''} 
        onExit={onExitRoom}
      />

      <PlayerList gameState={gameState} />

      <ChatPanel
        messages={gameState.chatMessages}
        chatMode={chatMode}
        onChatModeChange={onChatModeChange}
        onSendChat={onSendChat}
      />

      {/* Room indicator — compact capsule with smooth transition */}
      <div className={`fixed bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-gray-200/60 text-[#635bff] px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm pointer-events-none transition-all duration-300 ease-in-out ${
        localPlayer?.room 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
      }`}>
        {localPlayer?.room ?? ''}
      </div>

      {isGameReady && showShareModal && (
        <ShareModal 
          instanceCode={gameState.instanceCode ?? ''} 
          onClose={() => setShowShareModal(false)} 
        />
      )}
    </div>
  );
}
