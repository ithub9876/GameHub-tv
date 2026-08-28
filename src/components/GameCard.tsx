/**
 * GameHub-TV Console Game Tile Card
 * Rich cover artwork, graceful fallback, focus ring, remote activation, and metadata tags
 */

import React, { useState } from 'react';
import { Gamepad2, Play, Clock, Sparkles } from 'lucide-react';
import { GameMetadata } from '../types/models';

interface GameCardProps {
  game: GameMetadata;
  isFocused: boolean;
  onSelect: (game: GameMetadata) => void;
  onInspect: (game: GameMetadata) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isFocused,
  onSelect,
  onInspect,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelect(game)}
      onContextMenu={(e) => {
        e.preventDefault();
        onInspect(game);
      }}
      className={`group relative flex-shrink-0 w-64 md:w-72 lg:w-80 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 select-none bg-neutral-900 border ${
        isFocused
          ? 'scale-105 z-20 ring-4 ring-blue-500 ring-offset-4 ring-offset-[#0a0b0e] border-blue-400 shadow-2xl shadow-blue-500/30'
          : 'border-neutral-800/80 hover:border-neutral-700 hover:scale-102 opacity-95 hover:opacity-100'
      }`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-950">
        {!imgError ? (
          <img
            src={game.coverImage}
            alt={game.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-blue-950 p-4 text-center">
            <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-2">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <span className="text-sm font-black text-white">{game.title}</span>
            <span className="text-[11px] text-neutral-400">{game.category}</span>
          </div>
        )}

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/30" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-neutral-200 border border-white/10">
            {game.category}
          </span>
        </div>

        {/* Rating / Gamepad Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-900/80 text-neutral-300 border border-neutral-700">
            {game.rating}
          </span>
        </div>

        {/* Play Icon Trigger Indicator on Focus/Hover */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg shadow-blue-600/50 border border-white/20 transform scale-110">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Details Footer */}
      <div className="p-4 bg-gradient-to-b from-neutral-900 to-neutral-950">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-bold text-white tracking-tight truncate">
            {game.title}
          </h3>
          <span className="text-[11px] font-medium text-neutral-400 whitespace-nowrap">
            {game.releaseYear}
          </span>
        </div>

        <p className="text-xs text-neutral-400 line-clamp-1 mb-3">
          {game.tagline}
        </p>

        {/* Sub-bar */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[120px]">
              {game.controllerMapping.supportsBluetoothGamepad
                ? 'Gamepad'
                : 'Touch Screen'}
            </span>
          </div>

          {game.lastPlayed ? (
            <div className="flex items-center gap-1 text-emerald-400 font-medium">
              <Clock className="w-3 h-3" />
              <span>{game.lastPlayed}</span>
            </div>
          ) : (
            <span className="text-neutral-500">60 FPS Native</span>
          )}
        </div>
      </div>
    </div>
  );
};
