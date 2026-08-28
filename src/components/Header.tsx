/**
 * GameHub-TV Console Top Bar Header
 * Displays Logo, Real-time Connection Status, Remote Shortcuts, and Digital Clock
 */

import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Wifi,
  Smartphone,
  Battery,
  Tv,
  Activity,
  QrCode,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { DeviceInfo, SessionState } from '../types/protocol';

interface HeaderProps {
  sessionState: SessionState;
  sessionId: string | null;
  pinCode: string | null;
  deviceInfo: DeviceInfo | null;
  latencyMs: number;
  onOpenPairing: () => void;
  onOpenDiagnostics: () => void;
  onOpenSettings: () => void;
  isFocused?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sessionState,
  sessionId,
  pinCode,
  deviceInfo,
  latencyMs,
  onOpenPairing,
  onOpenDiagnostics,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const isConnected =
    sessionState === 'CONNECTED_STANDBY' ||
    sessionState === 'GAME_LAUNCHING' ||
    sessionState === 'GAME_STREAMING';

  return (
    <header className="w-full flex items-center justify-between px-8 py-5 select-none z-30 transition-all">
      {/* Brand / Logo */}
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
          <Gamepad2 className="w-6 h-6 text-white animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0b0e]" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-wider text-white">
              GAME<span className="text-blue-400">HUB</span>
            </span>
            <span className="px-2 py-0.5 text-[11px] font-bold tracking-widest uppercase rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
              TV Console
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-medium">
            Phone Engine • TV Display
          </p>
        </div>
      </div>

      {/* Middle: Connection Status & Remote Navigation Shortcuts */}
      <div className="hidden lg:flex items-center gap-5">
        {/* Device / Pairing Status Pill */}
        <button
          onClick={onOpenPairing}
          className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
            isConnected
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300 hover:bg-amber-900/40 hover:border-amber-400'
          }`}
          title="Click to view pairing details"
        >
          {isConnected ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">
                {deviceInfo?.model || 'Connected Phone'}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 pl-1 border-l border-emerald-700/50">
                <Wifi className="w-3.5 h-3.5" />
                <span>{latencyMs > 0 ? `${latencyMs}ms` : '5GHz LAN'}</span>
                {deviceInfo?.batteryLevel !== undefined && (
                  <span className="flex items-center gap-1 ml-1">
                    <Battery className="w-3.5 h-3.5" />
                    {deviceInfo.batteryLevel}%
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Pair Android Phone</span>
              {pinCode && (
                <span className="px-2 py-0.5 rounded bg-black/40 text-xs font-mono font-bold text-amber-200 border border-amber-400/30">
                  PIN {pinCode}
                </span>
              )}
            </>
          )}
        </button>

        {/* Remote Hints */}
        <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-neutral-900/70 border border-neutral-800 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700 font-mono text-[10px]">
              D-Pad
            </kbd>
            <span>Move</span>
          </span>
          <span className="text-neutral-600">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700 font-mono text-[10px]">
              OK
            </kbd>
            <span>Play</span>
          </span>
          <span className="text-neutral-600">•</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700 font-mono text-[10px]">
              P
            </kbd>
            <span>Pair</span>
          </span>
        </div>
      </div>

      {/* Right: Clock & Action Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenPairing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-sm font-medium transition-all hover:scale-105"
        >
          <QrCode className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Pairing QR</span>
        </button>

        <button
          onClick={onOpenDiagnostics}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-sm font-medium transition-all hover:scale-105"
          title="Open WebRTC & Protocol Diagnostics Console (Key: D)"
        >
          <Activity className="w-4 h-4 text-indigo-400" />
          <span className="hidden md:inline">Diagnostics</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-neutral-800/80 text-white font-mono text-sm tracking-widest">
          <span>{timeStr || '12:00 PM'}</span>
        </div>
      </div>
    </header>
  );
};
