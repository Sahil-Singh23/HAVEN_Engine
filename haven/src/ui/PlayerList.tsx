// src/ui/PlayerList.tsx

import { useState } from 'react';
import type { GameState } from '../game/GameState';

interface PlayerListProps {
  gameState: GameState;
}

export function PlayerList({ gameState }: PlayerListProps) {
  const [expanded, setExpanded] = useState(true);

  const localPlayer = gameState.getLocalPlayer();
  const nearbyPlayers = gameState.getNearbyPlayers();
  const roomPlayers = localPlayer ? gameState.getRoomPlayers(localPlayer.room) : [];
  const allPlayers = Array.from(gameState.players.values());

  return (
    <div className="fixed top-3 right-3 w-[200px] bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-xl pointer-events-auto shadow-sm overflow-hidden transition-all duration-200">
      <div 
        className="flex justify-between items-center px-3.5 py-2.5 text-gray-800 text-xs font-bold cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <span>Players ({allPlayers.length})</span>
        <svg 
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      
      {/* Animated content wrapper using grid-rows trick */}
      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto border-t border-gray-100">
            {/* Nearby section */}
            <div className="py-1.5">
              <h4 className="px-3.5 py-1 text-gray-400 text-[9px] font-bold uppercase tracking-wider">Nearby ({nearbyPlayers.length})</h4>
              {nearbyPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3.5 py-1.5 text-gray-700 text-xs whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {p.name}
                    {p.id === gameState.localId && ' (you)'}
                  </span>
                </div>
              ))}
            </div>

            {/* Current room section */}
            {localPlayer?.room && (
              <div className="py-1.5 border-t border-gray-100">
                <h4 className="px-3.5 py-1 text-gray-400 text-[9px] font-bold uppercase tracking-wider">In {localPlayer.room}</h4>
                {roomPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3.5 py-1.5 text-gray-700 text-xs whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* All players */}
            <div className="py-1.5 border-t border-gray-100">
              <h4 className="px-3.5 py-1 text-gray-400 text-[9px] font-bold uppercase tracking-wider">All</h4>
              {allPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3.5 py-1.5 text-gray-700 text-xs whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
