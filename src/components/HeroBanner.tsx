/**
 * GameHub-TV Featured Game Hero Banner
 * High-impact cinematic showcase with instant launch and game inspection triggers
 */

import React, { useState } from 'react';
import {
  Play,
  Info,
  Gamepad,
  Sparkles,
  Smartphone,
  Zap,
} from 'lucide-react';
import { GameMetadata } from '../types/models';
import { SessionState } from '../types/protocol';

interface HeroBannerProps {
  game: GameMetadata;
  sessionState: SessionState;
  onLaunchGame: (game: GameMetadata) => void;
  onInspectGame: (game: GameMetadata) => void;
  isFocused?: boolean;
  focusedButtonIndex: number; // 0 = Play, 1 = Info
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  game,
  sessionState,
  onLaunchGame,
  onInspectGame,
  isFocused = false,
  focusedButtonIndex = 0,
}) => {
  const [imgError, setImgError] = useState(false);

  const isPaired =
    sessionState === 'CONNECTED_STANDBY' ||
    sessionState === 'GAME_LAUNCHING' ||
    sessionState === 'GAME_STREAMING';

  return (
    <div className="relative w-full min-h-[420px] lg:h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-neutral-800/80 bg-neutral-950 transition-all duration-300 flex flex-col justify-end">
      {/* Background Hero Artwork */}
      <div className="absolute inset-0">
        {!imgError ? (
          <img
            src={game.heroImage}
            alt={game.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center filter brightness-90 transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-blue-950 to-neutral-950" />
        )}
        {/* Multi-layered cinematic gradient shadows */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080c] via-[#07080c]/80 to-transparent w-full md:w-3/4" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 p-6 md:p-10 max-w-4xl">
        {/* Badges */}
        <div className="flex items-center flex-wrap gap-2 mb-3">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-blue-600/30 text-blue-300 border border-blue-500/50 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            FEATURED GAME
          </span>

          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-900/80 text-neutral-300 border border-neutral-700/80 backdrop-blur-md">
            {game.category}
          </span>

          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-900/80 text-neutral-400 border border-neutral-700/80 backdrop-blur-md">
            {game.rating}
          </span>

          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 backdrop-blur-md">
            <Gamepad className="w-3.5 h-3.5" />
            {game.controllerMapping.supportsBluetoothGamepad
              ? 'Gamepad & Touch'
              : 'Touch Overlay'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md mb-2">
          {game.title}
        </h1>

        {/* Tagline */}
        <p className="text-sm md:text-base text-blue-200 font-medium line-clamp-1 mb-2">
          {game.tagline}
        </p>

        {/* Description */}
        <p className="text-xs md:text-sm text-neutral-300 font-normal line-clamp-2 max-w-2xl mb-6 leading-relaxed">
          {game.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Primary Launch / Play Button */}
          <button
            onClick={() => onLaunchGame(game)}
            className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm md:text-base transition-all duration-200 cursor-pointer shadow-xl active:scale-95 ${
              isFocused && focusedButtonIndex === 0
                ? 'bg-blue-500 text-white scale-105 ring-4 ring-blue-400/80 ring-offset-4 ring-offset-[#0a0b0e] shadow-blue-500/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-102 shadow-blue-600/30'
            }`}
          >
            {isPaired ? (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Launch on TV</span>
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4 text-white" />
                <span>Pair Phone & Play</span>
              </>
            )}
          </button>

          {/* Secondary Info Button */}
          <button
            onClick={() => onInspectGame(game)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm md:text-base transition-all duration-200 cursor-pointer backdrop-blur-md border active:scale-95 ${
              isFocused && focusedButtonIndex === 1
                ? 'bg-neutral-700/90 text-white scale-105 ring-4 ring-white/60 ring-offset-4 ring-offset-[#0a0b0e] border-white/60'
                : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 border-neutral-700/80 hover:scale-102'
            }`}
          >
            <Info className="w-4 h-4 text-neutral-300" />
            <span>Details & Controls</span>
          </button>
        </div>
      </div>

      {/* Target Specs Pill in Bottom-Right */}
      <div className="absolute bottom-6 right-8 hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-xs text-neutral-400 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
          <Zap className="w-4 h-4" />
          <span>1080p 60 FPS</span>
        </div>
      </div>
    </div>
  );
};
