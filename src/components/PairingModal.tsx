/**
 * GameHub-TV Pairing Hub Modal
 * Renders TV Pairing PIN Code, Dynamic QR Code, Real-Time LAN Connection States, and Protocol Setup
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone,
  QrCode,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Battery,
  ArrowLeft,
  X,
  Tv,
  Gamepad2,
  Flame,
} from 'lucide-react';
import { DeviceInfo, SessionState } from '../types/protocol';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  pinCode: string | null;
  pairingUrl: string | null;
  qrPayload: string | null;
  sessionState: SessionState;
  deviceInfo: DeviceInfo | null;
  onDisconnectPhone: () => void;
  onRefreshPairing: () => void;
  isFocused?: boolean;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  isOpen,
  onClose,
  sessionId,
  pinCode,
  pairingUrl,
  qrPayload,
  sessionState,
  deviceInfo,
  onDisconnectPhone,
  onRefreshPairing,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isPaired =
    sessionState === 'CONNECTED_STANDBY' ||
    sessionState === 'GAME_LAUNCHING' ||
    sessionState === 'GAME_STREAMING';

  const isHandshaking = sessionState === 'HANDSHAKING_WEBRTC';

  const handleCopyLink = () => {
    if (pairingUrl) {
      navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const directPayload = qrPayload || pairingUrl || `gamehub://pair?session=${sessionId}&pin=${pinCode}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#141824] to-[#0d1017] border border-neutral-700/80 shadow-2xl text-white overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Sticky Top Bar Header with Clear Back & Close Buttons */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#141824]/95 backdrop-blur-md border-b border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm transition-all border border-neutral-700 active:scale-95 cursor-pointer"
            id="pairing-back-btn"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Back to TV</span>
          </button>

          <div className="text-center hidden sm:block">
            <h2 className="text-base font-black tracking-tight text-white flex items-center justify-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              <span>Connect Android Phone Engine</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-all border border-neutral-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Prominent Wi-Fi Requirement Notice */}
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/40 flex items-start gap-3 text-left">
            <div className="p-2 rounded-xl bg-blue-600/30 text-blue-300 shrink-0 mt-0.5">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-blue-200">
                Same Wi-Fi Network Required (Local LAN WebRTC)
              </h4>
              <p className="text-xs text-blue-300/80 mt-0.5 leading-relaxed">
                Ensure your Android phone and this TV display are on the <span className="font-bold text-white">same Wi-Fi router / Local Network</span>. The phone processes the game natively and streams 60 FPS video directly to the TV.
              </p>
            </div>
          </div>

          {isPaired ? (
            /* PAIRED STATE */
            <div className="py-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mb-4 animate-in zoom-in-75">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-widest mb-2">
                Phone Connected as Engine & Remote
              </span>

              <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">
                {deviceInfo?.model || 'Android Device'}
              </h3>

              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-6">
                Your phone is now acting as the game engine host and remote controller. Launch any game from the TV dashboard.
              </p>

              {/* Device Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-6">
                <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>OS Version</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-white">
                    Android {deviceInfo?.osVersion || '14'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Network</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-emerald-300">
                    5 GHz LAN
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Battery className="w-3.5 h-3.5 text-amber-400" />
                    <span>Battery</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-white">
                    {deviceInfo?.batteryLevel !== undefined
                      ? `${deviceInfo.batteryLevel}%`
                      : '92%'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Display Stream</span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-indigo-300">
                    1080p 60FPS
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-sm transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  Return to TV Games Library
                </button>

                <button
                  onClick={onDisconnectPhone}
                  className="px-5 py-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-semibold text-sm transition-all cursor-pointer"
                >
                  Disconnect Phone
                </button>
              </div>
            </div>
          ) : (
            /* PAIRING WAITING / CODE DISPLAY */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left: QR Code & TV Session PIN */}
              <div className="flex flex-col items-center p-5 rounded-3xl bg-neutral-950/80 border border-neutral-800 text-center">
                {/* QR Code Container */}
                <div className="p-3 rounded-2xl bg-white shadow-xl mb-4 max-w-[210px]">
                  <QRCodeSVG
                    value={directPayload}
                    size={175}
                    level="H"
                    includeMargin={false}
                    className="w-full h-auto max-w-[175px]"
                  />
                </div>

                {/* Readable TV PIN */}
                <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 mb-3">
                  <div className="text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      TV Code
                    </span>
                    <div className="text-xl font-mono font-black text-blue-400">
                      {sessionId || 'Connecting...'}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      Pairing PIN
                    </span>
                    <div className="text-xl font-mono font-black text-amber-300 tracking-wider">
                      {pinCode || '----'}
                    </div>
                  </div>
                </div>

                {/* Status pulse */}
                <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>
                    {isHandshaking
                      ? 'Handshaking WebRTC stream...'
                      : 'Awaiting phone connection on LAN...'}
                  </span>
                </div>
              </div>

              {/* Right: Step-by-Step Instructions */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Connect to Same Wi-Fi Network
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Both Phone and TV must be on the same local network.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Scan QR Code with Phone App
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Open the GameHub companion app or enter PIN{' '}
                        <span className="font-mono text-amber-300 font-bold">
                          {pinCode || '4829'}
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Phone Controls TV & Runs Games
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Your phone acts as remote navigator on the TV menu and transforms into an adaptive gamepad when games launch.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Copy Pairing Session Payload */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/50 border border-neutral-800">
                  <span className="text-xs text-neutral-400">
                    Direct Pairing Session URI
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-all border border-neutral-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy URI'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-30 flex items-center justify-between px-6 py-3.5 bg-[#0d1017] border-t border-neutral-800 text-xs text-neutral-400 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-white font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to TV</span>
          </button>

          <button
            onClick={onRefreshPairing}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate Session PIN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
