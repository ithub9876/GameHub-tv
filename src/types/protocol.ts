/**
 * GameHub-TV Protocol Specifications (PROTOCOL.md)
 * TV ↔ Mobile Communication Contract
 */

export type ProtocolVersion = '1.0.0';

export type SessionState =
  | 'IDLE_UNPAIRED'
  | 'PAIRING_WAITING'
  | 'HANDSHAKING_WEBRTC'
  | 'CONNECTED_STANDBY'
  | 'GAME_LAUNCHING'
  | 'GAME_STREAMING'
  | 'RECONNECTING'
  | 'ERROR';

export type WebRTCConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export interface DeviceInfo {
  deviceId: string;
  model: string;
  manufacturer?: string;
  osVersion: string;
  batteryLevel?: number; // 0 - 100
  isCharging?: boolean;
  networkType?: 'wifi_5ghz' | 'wifi_2.4ghz' | 'ethernet' | 'cellular' | 'unknown';
  localIp?: string;
  screenResolution?: { width: number; height: number };
}

export interface StreamQualityConfig {
  targetResolution: '1080p' | '720p' | '4k' | 'auto';
  targetFps: 30 | 60 | 90 | 120;
  maxBitrateKbps: number;
  codec: 'VP8' | 'VP9' | 'H264' | 'AV1';
  audioEnabled: boolean;
  audioBitrateKbps?: number;
}

export interface StreamMetrics {
  fps: number;
  width: number;
  height: number;
  bitrateKbps: number;
  audioBitrateKbps: number;
  roundTripTimeMs: number;
  jitterMs: number;
  packetLossPercent: number;
  packetsLostTotal: number;
  framesDecoded: number;
  framesDropped: number;
  currentCodec: string;
  connectionType: string;
}

export interface GameLaunchPayload {
  gameId: string;
  title: string;
  packageName: string;
  launchIntent?: string;
  extraParams?: Record<string, string | number | boolean>;
  preferredOrientation?: 'landscape' | 'portrait' | 'sensor_landscape';
  qualityPreset?: 'performance' | 'balanced' | 'quality';
  controllerProfile?: string;
}

export type GameLaunchState =
  | 'IDLE'
  | 'DISPATCHED'
  | 'STARTING_ENGINE'
  | 'INITIALIZING_CAPTURE'
  | 'STREAM_READY'
  | 'RUNNING'
  | 'FAILED'
  | 'TERMINATED';

export interface GameLaunchStatusPayload {
  gameId: string;
  state: GameLaunchState;
  progressPercent?: number;
  message?: string;
  errorCode?: string;
  errorDetails?: string;
}

// Signaling Messages
export type SignalingMessageType =
  | 'REGISTER_TV'
  | 'TV_REGISTERED'
  | 'PAIR_REQUEST'
  | 'PAIR_ACCEPT'
  | 'PAIR_REJECT'
  | 'DISCONNECT'
  | 'SIGNAL_OFFER'
  | 'SIGNAL_ANSWER'
  | 'SIGNAL_ICE_CANDIDATE'
  | 'LAUNCH_GAME'
  | 'GAME_LAUNCH_STATUS'
  | 'TERMINATE_GAME'
  | 'REQUEST_QUALITY_CHANGE'
  | 'HEARTBEAT_PING'
  | 'HEARTBEAT_PONG'
  | 'CONTROLLER_INPUT'
  | 'ERROR';

export interface BaseSignalingMessage {
  type: SignalingMessageType;
  sessionId: string;
  sender: 'tv' | 'mobile' | 'server';
  timestamp: number;
  version?: ProtocolVersion;
}

export interface RegisterTvMessage extends BaseSignalingMessage {
  type: 'REGISTER_TV';
  tvInfo: {
    tvName: string;
    screenResolution: { width: number; height: number };
    appVersion: string;
  };
}

export interface TvRegisteredMessage extends BaseSignalingMessage {
  type: 'TV_REGISTERED';
  pinCode: string;
  pairingUrl: string;
  qrPayload: string;
  stunServers: RTCIceServer[];
}

export interface PairRequestMessage extends BaseSignalingMessage {
  type: 'PAIR_REQUEST';
  pinCode: string;
  deviceInfo: DeviceInfo;
}

export interface PairAcceptMessage extends BaseSignalingMessage {
  type: 'PAIR_ACCEPT';
  token: string;
  tvCapabilities: {
    supportedResolutions: string[];
    maxFps: number;
    supportedCodecs: string[];
  };
}

export interface PairRejectMessage extends BaseSignalingMessage {
  type: 'PAIR_REJECT';
  reason: 'INVALID_PIN' | 'SESSION_EXPIRED' | 'DEVICE_UNSUPPORTED' | 'ALREADY_PAIRED';
}

export interface SignalOfferMessage extends BaseSignalingMessage {
  type: 'SIGNAL_OFFER';
  sdp: RTCSessionDescriptionInit;
}

export interface SignalAnswerMessage extends BaseSignalingMessage {
  type: 'SIGNAL_ANSWER';
  sdp: RTCSessionDescriptionInit;
}

export interface SignalIceCandidateMessage extends BaseSignalingMessage {
  type: 'SIGNAL_ICE_CANDIDATE';
  candidate: RTCIceCandidateInit;
}

export interface LaunchGameMessage extends BaseSignalingMessage {
  type: 'LAUNCH_GAME';
  payload: GameLaunchPayload;
}

export interface GameLaunchStatusMessage extends BaseSignalingMessage {
  type: 'GAME_LAUNCH_STATUS';
  payload: GameLaunchStatusPayload;
}

export interface TerminateGameMessage extends BaseSignalingMessage {
  type: 'TERMINATE_GAME';
  gameId: string;
  reason?: string;
}

export interface RequestQualityChangeMessage extends BaseSignalingMessage {
  type: 'REQUEST_QUALITY_CHANGE';
  quality: StreamQualityConfig;
}

export interface HeartbeatPingMessage extends BaseSignalingMessage {
  type: 'HEARTBEAT_PING';
  sequence: number;
}

export interface HeartbeatPongMessage extends BaseSignalingMessage {
  type: 'HEARTBEAT_PONG';
  sequence: number;
  originalTimestamp: number;
}

export interface ControllerInputMessage extends BaseSignalingMessage {
  type: 'CONTROLLER_INPUT';
  input: {
    buttons: Record<string, boolean>;
    axes: {
      leftStickX: number;
      leftStickY: number;
      rightStickX: number;
      rightStickY: number;
      leftTrigger: number;
      rightTrigger: number;
    };
    timestamp: number;
  };
}

export interface DisconnectMessage extends BaseSignalingMessage {
  type: 'DISCONNECT';
  reason?: string;
}

export interface ProtocolErrorMessage extends BaseSignalingMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export type SignalingMessage =
  | RegisterTvMessage
  | TvRegisteredMessage
  | PairRequestMessage
  | PairAcceptMessage
  | PairRejectMessage
  | DisconnectMessage
  | SignalOfferMessage
  | SignalAnswerMessage
  | SignalIceCandidateMessage
  | LaunchGameMessage
  | GameLaunchStatusMessage
  | TerminateGameMessage
  | RequestQualityChangeMessage
  | HeartbeatPingMessage
  | HeartbeatPongMessage
  | ControllerInputMessage
  | ProtocolErrorMessage;
