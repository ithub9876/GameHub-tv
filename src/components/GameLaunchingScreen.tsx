/**
 * GameHub-TV Cinematic Game Launching Screen
 * Displays loading state, mobile engine handshake, and stream negotiation steps
 */

import React, { useEffect, useState } from 'react';
import {
  Gamepad2,
  Smartphone,
  Wifi,
  Zap,
  RotateCw,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { GameMetadata } from '../types/models';
import { DeviceInfo, GameLaunchStatusPayload } from '../types/protocol';

interface GameLaunchingScreenProps {
  game: GameMetadata;
  deviceInfo: DeviceInfo | null;
  launchStatus: GameLaunchStatusPayload | null;
  onCancelLaunch: () => void;
}

export const GameLaunchingScreen: React.FC<GameLaunchingScreenProps> = ({
  game,
  deviceInfo,
  launchStatus,
  onCancelLaunch,
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const progressPercent = launchStatus?.progressPercent || Math.min(95, elapsedSec * 15 + 20);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e] select-none">
      {/* Background Game Art with Heavy Blur */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={game.heroImage}
          alt={game.title}
          className="w-full h-full object-cover filter blur-2xl opacity-25 transform scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/80 to-[#07090e]" />
      </div>

      {/* Center Console Modal */}
      <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-xl w-full">
        {/* Game Cover in Floating Console Frame */}
        <div className="relative w-36 h-36 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-blue-500/50 border border-white/20 mb-6 animate-pulse">
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Title */}
        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">
          Launching {game.title}
        </h2>

        <p className="text-sm text-neutral-400 font-medium mb-8">
          Targeting <span className="text-blue-400 font-semibold">{deviceInfo?.model || 'Connected Phone'}</span> Engine • 1080p 60 FPS
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden border border-neutral-800 mb-6">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Status Steps */}
        <div className="w-full p-5 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-left space-y-3 mb-8">
          <div className="flex items-center gap-3 text-xs">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
              ✓
            </div>
            <span className="text-neutral-300">
              Dispatched launch RPC command to mobile engine
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] animate-spin">
              <RotateCw className="w-2.5 h-2.5" />
            </div>
            <span className="text-white font-semibold">
              {launchStatus?.message ||
                `Android initializing ${game.packageName}...`}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center font-bold text-[10px]">
              3
            </div>
            <span>Locking 60 FPS WebRTC display stream...</span>
          </div>
        </div>

        {/* Timeout / Cancel Action */}
        <div className="flex items-center gap-4">
          <button
            onClick={onCancelLaunch}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-neutral-400" />
            <span>Cancel Launch</span>
          </button>
        </div>

        {elapsedSec > 15 && (
          <div className="flex items-center gap-2 mt-4 text-xs text-amber-400/90">
            <AlertTriangle className="w-4 h-4" />
            <span>
              Phone taking longer than expected. Ensure GameHub mobile has screen capture permission.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
