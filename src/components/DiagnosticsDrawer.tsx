/**
 * GameHub-TV Developer & Diagnostics Inspection Drawer
 * Real-time WebRTC metrics, ICE states, and Signaling message bus logger
 */

import React from 'react';
import {
  Activity,
  X,
  Radio,
  Terminal,
  Cpu,
  Wifi,
  Layers,
  Zap,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  DeviceInfo,
  SessionState,
  StreamMetrics,
  WebRTCConnectionState,
} from '../types/protocol';

interface DiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionState: SessionState;
  webrtcState: WebRTCConnectionState;
  metrics: StreamMetrics;
  deviceInfo: DeviceInfo | null;
  sessionId: string | null;
  pinCode: string | null;
  logs: string[];
}

export const DiagnosticsDrawer: React.FC<DiagnosticsDrawerProps> = ({
  isOpen,
  onClose,
  sessionState,
  webrtcState,
  metrics,
  deviceInfo,
  sessionId,
  pinCode,
  logs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-[#090b10]/95 backdrop-blur-2xl border-l border-neutral-800 shadow-2xl p-6 flex flex-col text-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Diagnostics Console</h3>
            <p className="text-xs text-neutral-400">
              WebRTC & Protocol Bus Telemetry
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs">
        {/* Session Info Grid */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Session & Architecture
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Session ID</span>
              <span className="font-mono font-bold text-blue-400">
                {sessionId || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Pairing PIN</span>
              <span className="font-mono font-bold text-amber-300">
                {pinCode || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Session State</span>
              <span className="font-mono font-bold text-white uppercase">
                {sessionState}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">WebRTC State</span>
              <span
                className={`font-mono font-bold uppercase ${
                  webrtcState === 'connected'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {webrtcState}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Inbound RTP Stream Metrics */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Inbound Video/Audio RTP Metrics
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Frame Rate</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {metrics.fps} FPS
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Resolution</span>
              <span className="text-sm font-bold text-white font-mono">
                {metrics.width}x{metrics.height}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Bitrate</span>
              <span className="text-sm font-bold text-blue-400 font-mono">
                {(metrics.bitrateKbps / 1000).toFixed(1)} Mbps
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Round Trip (RTT)</span>
              <span className="text-sm font-bold text-white font-mono">
                {metrics.roundTripTimeMs} ms
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Packet Loss</span>
              <span className="text-sm font-bold text-emerald-300 font-mono">
                {metrics.packetLossPercent}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800">
              <span className="text-neutral-500 block mb-0.5">Decoder Codec</span>
              <span className="text-sm font-bold text-indigo-300 font-mono uppercase">
                {metrics.currentCodec || 'H.264'}
              </span>
            </div>
          </div>
        </div>

        {/* Connected Mobile Device Specs */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Mobile Engine Specifications
          </h4>
          <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Model:</span>
              <span className="text-white font-semibold">
                {deviceInfo?.model || 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Android OS:</span>
              <span className="text-white font-semibold">
                Android {deviceInfo?.osVersion || '14'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Battery Level:</span>
              <span className="text-amber-300">
                {deviceInfo?.batteryLevel !== undefined
                  ? `${deviceInfo.batteryLevel}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Network Transport:</span>
              <span className="text-emerald-400">Direct Local Wi-Fi (P2P)</span>
            </div>
          </div>
        </div>

        {/* Live Protocol Logs */}
        <div className="flex-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Signaling & Protocol Event Bus ({logs.length})
          </h4>
          <div className="p-3 rounded-xl bg-black border border-neutral-800 font-mono text-[10px] text-neutral-300 h-48 overflow-y-auto space-y-1 select-text">
            {logs.length === 0 ? (
              <span className="text-neutral-600">No events recorded yet.</span>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-tight break-all">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-neutral-800 text-[11px] text-neutral-500 flex justify-between items-center">
        <span>GameHub TV Architecture 1.0.0</span>
        <span className="text-blue-400">TV = Launcher, Phone = Engine</span>
      </div>
    </div>
  );
};
