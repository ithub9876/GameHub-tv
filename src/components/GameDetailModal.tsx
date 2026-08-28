/**
 * GameHub-TV Game Details & Google Play Store Modal (PS5-Style Console Hub)
 */

import React, { useState } from 'react';
import {
  Play,
  X,
  Gamepad,
  Smartphone,
  Cpu,
  Tv,
  ArrowLeft,
  ExternalLink,
  Download,
  CheckCircle,
  Share2,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { GameMetadata } from '../types/models';
import { SessionState, StreamQualityConfig } from '../types/protocol';

interface GameDetailModalProps {
  game: GameMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  sessionState: SessionState;
  onLaunchGame: (game: GameMetadata, qualityConfig?: StreamQualityConfig) => void;
  onPairRequested: () => void;
}

export const GameDetailModal: React.FC<GameDetailModalProps> = ({
  game,
  isOpen,
  onClose,
  sessionState,
  onLaunchGame,
  onPairRequested,
}) => {
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '720p'>('1080p');
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !game) return null;

  const isPaired =
    sessionState === 'CONNECTED_STANDBY' ||
    sessionState === 'GAME_LAUNCHING' ||
    sessionState === 'GAME_STREAMING';

  const handleLaunch = () => {
    const quality: StreamQualityConfig = {
      ...game.recommendedQuality,
      targetResolution: selectedQuality,
      maxBitrateKbps: selectedQuality === '1080p' ? 15000 : 8000,
    };
    onLaunchGame(game, quality);
  };

  const playStoreLink =
    game.playStoreUrl ||
    `https://play.google.com/store/apps/details?id=${game.packageName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0b0e14] border border-neutral-700/80 shadow-2xl text-white overflow-hidden">
        {/* Sticky Header with Back and Close */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#10141e]/95 backdrop-blur-md border-b border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-all border border-neutral-700 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Back to TV</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950/60 text-blue-300 border border-blue-500/40">
              Google Play Official
            </span>
            <span className="text-xs font-mono text-neutral-400 hidden sm:inline">
              {game.packageName}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {/* PS5-Style Hero Artwork Banner */}
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-neutral-950">
            {!imgError ? (
              <img
                src={game.heroImage}
                alt={game.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/60 to-transparent" />

            {/* Title & Metadata on Hero */}
            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-blue-600/60 text-white border border-blue-400/40">
                    {game.category}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-neutral-900/90 text-neutral-200 border border-neutral-700">
                    {game.rating}
                  </span>
                  <span className="text-xs text-neutral-300">
                    By {game.developer} ({game.releaseYear})
                  </span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-lg">
                  {game.title}
                </h2>
              </div>

              {/* Action Buttons in Hero */}
              <div className="flex items-center gap-3">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/30 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Get on Play Store</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                {isPaired ? (
                  <button
                    onClick={handleLaunch}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black text-white text-sm shadow-xl shadow-blue-600/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>Launch on TV</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onPairRequested();
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 font-bold text-white text-sm shadow-xl shadow-amber-600/40 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-white" />
                    <span>Connect Phone</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Tagline & Description */}
            <div>
              <p className="text-base sm:text-lg font-semibold text-blue-300 mb-1.5">
                {game.tagline}
              </p>
              <p className="text-xs sm:text-sm md:text-base text-neutral-300 leading-relaxed max-w-4xl">
                {game.description}
              </p>
            </div>

            {/* Direct Play Store Link Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Official Android Package on Google Play
                  </h4>
                  <p className="text-xs text-neutral-400">
                    If this game is not installed on your connected phone, download it directly from Google Play.
                  </p>
                </div>
              </div>

              <a
                href={playStoreLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition-all shrink-0 cursor-pointer shadow-md"
              >
                <span>Open Google Play</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Controller Map & Phone Requirements Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Controller Layout */}
              <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
                <div className="flex items-center gap-2 mb-3.5 text-blue-400 font-bold text-sm">
                  <Gamepad className="w-4 h-4" />
                  <span>Phone Remote / Gamepad Mapping</span>
                </div>

                <div className="space-y-2 text-xs">
                  {Object.entries(game.controllerMapping.buttonHints).map(
                    ([btnKey, hint]) => (
                      <div
                        key={btnKey}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80"
                      >
                        <span className="font-mono font-bold text-amber-300 uppercase">
                          {btnKey}
                        </span>
                        <span className="text-neutral-300">{hint}</span>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-3.5 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                  <span>Profile: {game.controllerMapping.profileName}</span>
                  <span className="text-blue-400 font-semibold">
                    {game.controllerMapping.supportsBluetoothGamepad
                      ? 'Bluetooth Gamepad & Virtual Touch'
                      : 'Virtual Touch Overlay'}
                  </span>
                </div>
              </div>

              {/* Host Engine Specs & Quality Config */}
              <div className="space-y-4">
                {/* Requirements Card */}
                <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
                  <div className="flex items-center gap-2 mb-3 text-indigo-400 font-bold text-sm">
                    <Cpu className="w-4 h-4" />
                    <span>Android Phone Engine Host Specs</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-neutral-400 block mb-0.5">Package ID</span>
                      <span className="font-mono text-white text-[11px] truncate block">
                        {game.packageName}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-neutral-400 block mb-0.5">Min Android OS</span>
                      <span className="font-bold text-white">
                        Android {game.minAndroidVersion}+
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-neutral-400 block mb-0.5">Target Display</span>
                      <span className="font-bold text-emerald-400">
                        {game.recommendedQuality.targetResolution} @ 60 FPS
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                      <span className="text-neutral-400 block mb-0.5">Max Stream Bitrate</span>
                      <span className="font-bold text-blue-400">
                        {Math.round(game.recommendedQuality.maxBitrateKbps / 1000)} Mbps
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stream Resolution Selector */}
                <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
                  <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-sm">
                    <Tv className="w-4 h-4" />
                    <span>TV Stream Display Quality</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedQuality('1080p')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                        selectedQuality === '1080p'
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      1080p (Full HD 60 FPS)
                    </button>
                    <button
                      onClick={() => setSelectedQuality('720p')}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                        selectedQuality === '720p'
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      720p (Ultra Low Latency)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-800">
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm transition-all border border-neutral-700 cursor-pointer"
              >
                Back to Library
              </button>

              <div className="flex items-center gap-3">
                <a
                  href={playStoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-bold text-sm transition-all border border-emerald-500/30 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Google Play Store</span>
                </a>

                {isPaired ? (
                  <button
                    onClick={handleLaunch}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-xl shadow-blue-600/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <Play className="w-5 h-5 fill-white text-white" />
                    <span>Launch on TV</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onPairRequested();
                    }}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 font-bold text-white shadow-xl shadow-amber-600/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
                  >
                    <Smartphone className="w-5 h-5 text-white" />
                    <span>Connect Phone to Play</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
