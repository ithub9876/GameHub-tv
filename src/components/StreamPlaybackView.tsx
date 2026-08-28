/**
 * GameHub-TV Fullscreen Game Display Receiver & On-Screen TV HUD
 * Real HTML5 <video> renderer for incoming WebRTC video/audio stream with stream telemetry HUD
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Sliders,
  Activity,
  LogOut,
  Wifi,
  Smartphone,
  Battery,
  Zap,
  Info,
  Tv,
  Gamepad,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { GameMetadata } from '../types/models';
import {
  DeviceInfo,
  StreamMetrics,
  StreamQualityConfig,
  WebRTCConnectionState,
} from '../types/protocol';

interface StreamPlaybackViewProps {
  game: GameMetadata;
  remoteStream: MediaStream | null;
  webrtcState: WebRTCConnectionState;
  metrics: StreamMetrics;
  deviceInfo: DeviceInfo | null;
  onExitGame: () => void;
  onRequestQuality: (quality: StreamQualityConfig) => void;
}

export const StreamPlaybackView: React.FC<StreamPlaybackViewProps> = ({
  game,
  remoteStream,
  webrtcState,
  metrics,
  deviceInfo,
  onExitGame,
  onRequestQuality,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showHud, setShowHud] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover'>('contain');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hudAutoHideTimer, setHudAutoHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Attach real MediaStream to <video> element
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      console.log('[StreamPlaybackView] Attaching stream to video element', remoteStream.getTracks());
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch((err) => {
        console.warn('[StreamPlaybackView] Video auto-play prevented:', err);
      });
    }
  }, [remoteStream]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  // Auto-hide HUD after 6 seconds of inactivity
  const resetHudTimer = () => {
    setShowHud(true);
    if (hudAutoHideTimer) clearTimeout(hudAutoHideTimer);
    const timer = setTimeout(() => {
      setShowHud(false);
    }, 6000);
    setHudAutoHideTimer(timer);
  };

  useEffect(() => {
    resetHudTimer();
    return () => {
      if (hudAutoHideTimer) clearTimeout(hudAutoHideTimer);
    };
  }, []);

  const handleMouseMove = () => {
    resetHudTimer();
  };

  const isStreamActive = webrtcState === 'connected' && remoteStream && remoteStream.getVideoTracks().length > 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-40 bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* Real WebRTC Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full object-${aspectMode} transition-all duration-300`}
      />

      {/* Fallback Overlay if Stream is Negotiating */}
      {!isStreamActive && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-neutral-950/90 text-white p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mb-4 animate-spin">
            <RefreshCw className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-2xl font-black mb-2">Connecting WebRTC Media Stream</h3>
          <p className="text-sm text-neutral-400 max-w-md mb-6">
            Negotiating 60 FPS direct LAN video pipeline with {deviceInfo?.model || 'phone engine'}...
          </p>
          <div className="px-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400">
            WebRTC State: <span className="text-amber-400 font-bold uppercase">{webrtcState}</span>
          </div>
        </div>
      )}

      {/* On-Screen TV HUD Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 flex flex-col justify-between p-8 ${
          showHud ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top HUD Bar */}
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Game Title & Phone Model */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-neutral-800/80 shadow-2xl">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-400/50" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white">{game.title}</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/40">
                  LIVE STREAM
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Rendered on {deviceInfo?.model || 'Connected Mobile Engine'}
              </p>
            </div>
          </div>

          {/* Telemetry Pills */}
          <div className="flex items-center gap-2.5">
            {/* FPS Pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-neutral-800 text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 shadow-xl">
              <Zap className="w-3.5 h-3.5" />
              <span>{metrics.fps || 60} FPS</span>
            </div>

            {/* Resolution */}
            <div className="px-3.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-neutral-800 text-xs font-mono font-bold text-neutral-200 shadow-xl">
              <span>{metrics.width}x{metrics.height}</span>
            </div>

            {/* Latency */}
            <div className="px-3.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-neutral-800 text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5 shadow-xl">
              <Wifi className="w-3.5 h-3.5" />
              <span>{metrics.roundTripTimeMs}ms RTT</span>
            </div>

            {/* Bitrate */}
            <div className="px-3.5 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-neutral-800 text-xs font-mono text-neutral-300 shadow-xl">
              <span>{(metrics.bitrateKbps / 1000).toFixed(1)} Mbps</span>
            </div>

            {/* Codec */}
            <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-neutral-800 text-xs font-mono text-indigo-300 uppercase shadow-xl">
              <span>{metrics.currentCodec || 'H.264'}</span>
            </div>
          </div>
        </div>

        {/* Bottom HUD Bar & Quick Controls */}
        <div className="flex items-end justify-between pointer-events-auto">
          {/* Remote Controller Hints */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-neutral-800 text-xs text-neutral-300 shadow-2xl">
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded border border-neutral-700 text-[10px] font-mono">
                Menu / I
              </kbd>
              <span>Toggle HUD</span>
            </span>
            <span className="text-neutral-600">•</span>
            <span className="flex items-center gap-1 font-medium">
              <kbd className="px-1.5 py-0.5 bg-neutral-800 text-neutral-200 rounded border border-neutral-700 text-[10px] font-mono">
                Back / Esc
              </kbd>
              <span>Exit Game</span>
            </span>
          </div>

          {/* Quick TV Actions */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-neutral-800 shadow-2xl">
            {/* Audio Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 transition-all border border-neutral-700 cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Fit / Fill Mode */}
            <button
              onClick={() => setAspectMode(aspectMode === 'contain' ? 'cover' : 'contain')}
              className="px-3 py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-all border border-neutral-700 cursor-pointer"
              title="Toggle Fit / Fill scaling"
            >
              {aspectMode === 'contain' ? 'Fit 16:9' : 'Fill Screen'}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 transition-all border border-neutral-700 cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>

            {/* Exit Stream Button */}
            <button
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs transition-all shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Game</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-lg animate-in fade-in">
          <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-700 max-w-md w-full text-center text-white shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/40">
              <LogOut className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black mb-2">Exit {game.title}?</h3>
            <p className="text-sm text-neutral-400 mb-6">
              This will stop the remote display stream and return to the GameHub TV launcher.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm transition-all cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExitGame();
                }}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all shadow-xl shadow-red-600/40 cursor-pointer"
              >
                Exit to Launcher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
