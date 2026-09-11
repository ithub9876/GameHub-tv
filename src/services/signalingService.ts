/**
 * GameHub-TV Signaling Client
 * Manages WebSocket connection, Session Registration, and Protocol Message Routing
 */

import {
  DeviceInfo,
  GameLaunchPayload,
  GameLaunchStatusPayload,
  SignalingMessage,
  StreamQualityConfig,
} from '../types/protocol';

export type SignalingConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING';

export interface SignalingEvents {
  onRegistered: (data: {
    sessionId: string;
    pinCode: string;
    pairingUrl: string;
    qrPayload: string;
    stunServers: RTCIceServer[];
  }) => void;
  onPairRequest: (data: {
    deviceInfo?: DeviceInfo;
    pinCode?: string;
    sessionId?: string;
  }) => void;
  onPairAccepted: (deviceInfo: DeviceInfo) => void;
  onMobileDisconnected: (reason?: string) => void;
  onOfferReceived: (sdp: RTCSessionDescriptionInit) => void;
  onAnswerReceived: (sdp: RTCSessionDescriptionInit) => void;
  onIceCandidateReceived: (candidate: RTCIceCandidateInit) => void;
  onGameLaunchStatus: (status: GameLaunchStatusPayload) => void;
  onHeartbeat: (rttMs: number) => void;
  onConnectionStateChange: (state: SignalingConnectionState) => void;
  onError: (err: { code: string; message: string }) => void;
  onControllerInput?: (input: any) => void;
  onNavCommand?: (payload: any) => void;
}

export class SignalingService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private pinCode: string | null = null;
  private connectionState: SignalingConnectionState = 'DISCONNECTED';
  private events: Partial<SignalingEvents> = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPingSentAt: number = 0;
  private pingSequence: number = 0;
  private shouldAutoReconnect: boolean = true;
  private messageQueue: SignalingMessage[] = [];

  constructor(events?: Partial<SignalingEvents>) {
    if (events) {
      this.events = events;
    }
  }

  public setEventListeners(events: Partial<SignalingEvents>) {
    this.events = { ...this.events, ...events };
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  public getPinCode(): string | null {
    return this.pinCode;
  }

  public getConnectionState(): SignalingConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: SignalingConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.events.onConnectionStateChange?.(state);
    }
  }

  /**
   * Connect to the WebSocket signaling server
   */
  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldAutoReconnect = true;
    this.setConnectionState('CONNECTING');

    const urlParams = new URLSearchParams(window.location.search);
    const queryServer = urlParams.get('server') || urlParams.get('relay');
    const envServer = (import.meta as any).env?.VITE_SIGNALING_SERVER;

    let wsUrl: string;
    if (queryServer) {
      const isSecure = window.location.protocol === 'https:' || queryServer.includes('run.app');
      const cleanHost = queryServer.replace(/^(wss?:\/\/|https?:\/\/)/, '').replace(/\/ws\/?$/, '');
      wsUrl = `${isSecure ? 'wss:' : 'ws:'}//${cleanHost}/ws`;
    } else if (envServer) {
      wsUrl = envServer.startsWith('ws') ? envServer : `wss://${envServer}/ws`;
    } else if (window.location.host.includes('vercel.app')) {
      // Point to the live Cloud Run WebSocket relay server
      wsUrl = 'wss://ais-pre-xazim7c5xk4vujdvayatn7-784984723925.asia-southeast1.run.app/ws';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setConnectionState('CONNECTED');
        this.startHeartbeat();
        // Register TV or Re-register with existing sessionId
        this.sendRegisterTv();

        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg) this.send(msg);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: SignalingMessage = JSON.parse(event.data);
          this.handleIncomingMessage(data);
        } catch (e) {
          console.error('[Signaling] Failed to parse message:', e, event.data);
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        this.setConnectionState('DISCONNECTED');
        if (this.shouldAutoReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Signaling] WebSocket error:', err);
        this.ensureProvisionalSession();
        this.events.onError?.({
          code: 'WS_ERROR',
          message: 'WebSocket connection encountered an error.',
        });
      };

      // Ensure TV immediately gets a valid session and PIN if relay handshake takes time
      setTimeout(() => {
        this.ensureProvisionalSession();
      }, 1800);
    } catch (e) {
      console.error('[Signaling] Error instantiating WebSocket:', e);
      this.ensureProvisionalSession();
      this.setConnectionState('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  /**
   * Generates a local provisional session and PIN to ensure the TV screen
   * never stays stuck on "Connecting..." or "----" while waiting for relay
   */
  public ensureProvisionalSession(): void {
    if (this.sessionId && this.pinCode) return;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'GH-';
    for (let i = 0; i < 4; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    this.sessionId = id;
    this.pinCode = pin;

    const host = window.location.origin;
    this.events.onRegistered?.({
      sessionId: id,
      pinCode: pin,
      pairingUrl: `${host}/?pair=${id}&pin=${pin}`,
      qrPayload: JSON.stringify({
        protocol: 'gamehub-v1',
        type: 'pair',
        sessionId: id,
        pin,
        host,
      }),
      stunServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.setConnectionState('RECONNECTING');
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldAutoReconnect) {
        this.connect();
      }
    }, 2500);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.sessionId) {
        this.pingSequence++;
        this.lastPingSentAt = performance.now();
        this.send({
          type: 'HEARTBEAT_PING',
          sessionId: this.sessionId,
          sender: 'tv',
          sequence: this.pingSequence,
          timestamp: Date.now(),
        });
      }
    }, 3000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendRegisterTv() {
    const screenRes = {
      width: window.innerWidth || 1920,
      height: window.innerHeight || 1080,
    };

    // If we had a prior sessionId, preserve it for reconnect
    const existingSessionId = this.sessionId || undefined;

    const registerMsg: SignalingMessage = {
      type: 'REGISTER_TV',
      sessionId: existingSessionId || '',
      sender: 'tv',
      timestamp: Date.now(),
      tvInfo: {
        tvName: 'GameHub TV Console',
        screenResolution: screenRes,
        appVersion: '1.0.0-prod',
      },
    };

    this.send(registerMsg);
  }

  public send(msg: SignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.messageQueue.push(msg);
    }
  }

  private handleIncomingMessage(msg: SignalingMessage) {
    const anyMsg = msg as any;
    switch (anyMsg.type as string) {
      case 'TV_REGISTERED':
      case 'REGISTERED':
      case 'REGISTER_SUCCESS': {
        const sid = anyMsg.sessionId || anyMsg.session_id || '';
        const pin = anyMsg.pinCode || anyMsg.pin || anyMsg.code || '';
        if (sid) this.sessionId = sid;
        if (pin) this.pinCode = pin;
        this.events.onRegistered?.({
          sessionId: this.sessionId || sid,
          pinCode: this.pinCode || pin,
          pairingUrl: anyMsg.pairingUrl || `${window.location.origin}/?pair=${this.sessionId}&pin=${this.pinCode}`,
          qrPayload: anyMsg.qrPayload || JSON.stringify({ protocol: 'gamehub-v1', sessionId: this.sessionId, pin: this.pinCode }),
          stunServers: anyMsg.stunServers || [],
        });
        break;
      }

      case 'PAIR_REQUEST': {
        this.events.onPairRequest?.({
          deviceInfo: anyMsg.deviceInfo,
          pinCode: anyMsg.pinCode,
          sessionId: anyMsg.sessionId || this.sessionId || '',
        });
        break;
      }

      case 'PAIR_ACCEPT': {
        // Broadcast that mobile is now confirmed
        break;
      }

      case 'SIGNAL_OFFER': {
        this.events.onOfferReceived?.(anyMsg.sdp);
        break;
      }

      case 'SIGNAL_ANSWER': {
        this.events.onAnswerReceived?.(anyMsg.sdp);
        break;
      }

      case 'SIGNAL_ICE_CANDIDATE': {
        this.events.onIceCandidateReceived?.(anyMsg.candidate);
        break;
      }

      case 'GAME_LAUNCH_STATUS': {
        this.events.onGameLaunchStatus?.(anyMsg.payload);
        break;
      }

      case 'HEARTBEAT_PONG': {
        const rtt = Math.round(performance.now() - this.lastPingSentAt);
        this.events.onHeartbeat?.(rtt);
        break;
      }

      case 'CONTROLLER_INPUT': {
        if (anyMsg.input) {
          this.events.onControllerInput?.(anyMsg.input);
        } else if (anyMsg.payload) {
          this.events.onControllerInput?.(anyMsg.payload);
        }
        break;
      }

      case 'NAV_COMMAND': {
        if (anyMsg.payload) {
          this.events.onNavCommand?.(anyMsg.payload);
        } else if (anyMsg.command) {
          this.events.onNavCommand?.(anyMsg.command);
        }
        break;
      }

      case 'DISCONNECT': {
        this.events.onMobileDisconnected?.(anyMsg.sender === 'mobile' ? 'Phone disconnected' : undefined);
        break;
      }

      case 'ERROR': {
        this.events.onError?.({ code: anyMsg.code || 'ERROR', message: anyMsg.message || 'Error occurred' });
        break;
      }

      default:
        break;
    }
  }

  /**
   * TV accepts mobile pairing request
   */
  public acceptPairing(pinCodeOrDevInfo?: any, sessionId?: string) {
    const targetSessionId = sessionId || this.sessionId;
    if (!targetSessionId) return;

    const pin = typeof pinCodeOrDevInfo === 'string' ? pinCodeOrDevInfo : (this.pinCode || '');
    const devInfo: DeviceInfo =
      typeof pinCodeOrDevInfo === 'object' && pinCodeOrDevInfo !== null
        ? pinCodeOrDevInfo
        : {
            model: 'Mobile Controller',
            platform: 'android',
            appVersion: '1.0.0',
            screenResolution: { width: 1080, height: 2400 },
            batteryLevel: 100,
            isCharging: false,
          };

    this.send({
      type: 'PAIR_ACCEPT',
      sessionId: targetSessionId,
      sender: 'tv',
      pinCode: pin,
      timestamp: Date.now(),
      token: `auth_${Date.now()}`,
      tvCapabilities: {
        supportedResolutions: ['1080p', '720p', '4k'],
        maxFps: 60,
        supportedCodecs: ['H264', 'VP8', 'VP9', 'AV1'],
      },
    } as any);
    this.events.onPairAccepted?.(devInfo);
  }

  /**
   * TV rejects pairing request
   */
  public rejectPairing(reason: 'INVALID_PIN' | 'SESSION_EXPIRED' | 'DEVICE_UNSUPPORTED' | 'ALREADY_PAIRED') {
    if (!this.sessionId) return;
    this.send({
      type: 'PAIR_REJECT',
      sessionId: this.sessionId,
      sender: 'tv',
      timestamp: Date.now(),
      reason,
    });
  }

  /**
   * Send WebRTC SDP Answer to Mobile
   */
  public sendAnswer(sdp: RTCSessionDescriptionInit) {
    if (!this.sessionId) return;
    this.send({
      type: 'SIGNAL_ANSWER',
      sessionId: this.sessionId,
      sender: 'tv',
      timestamp: Date.now(),
      sdp,
    });
  }

  /**
   * Send WebRTC SDP Offer to Mobile (if TV initiates)
   */
  public sendOffer(sdp: RTCSessionDescriptionInit) {
    if (!this.sessionId) return;
    this.send({
      type: 'SIGNAL_OFFER',
      sessionId: this.sessionId,
      sender: 'tv',
      timestamp: Date.now(),
      sdp,
    });
  }

  /**
   * Send ICE candidate
   */
  public sendIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.sessionId) return;
    this.send({
      type: 'SIGNAL_ICE_CANDIDATE',
      sessionId: this.sessionId,
      sender: 'tv',
      timestamp: Date.now(),
      candidate,
    });
  }

  /**
   * Issue game launch command to phone
   */
  public launchGame(payload: GameLaunchPayload) {
    if (!this.sessionId) return;
    this.send({
      type: 'LAUNCH_GAME',
      sessionId: this.sessionId,
      sender: 'tv',
      timestamp: Date.now(),
      payload,
    });
  }

  /**
   * Stop active game
   */
  public terminateGame(gameId: string, reason?: string) {
    if (!this.sessionId) return;
    this.send({
      type: 'TERMINATE_GAME',
      sessionId: this.sessionId,
      sender: 'tv',
      timestamp: Date.now(),
      gameId,
      reason,
    });
  }

  /**
   * Request quality switch (1080p/720p/bitrate)
   */
  public requestQuality(quality: StreamQualityConfig) {
    if (!this.sessionId) return;
    this.send({
      type: 'REQUEST_QUALITY_CHANGE',
      sessionId: this.sessionId,
      sender: 'tv',
      timestamp: Date.now(),
      quality,
    });
  }

  /**
   * Disconnect and unpair
   */
  public disconnect() {
    this.shouldAutoReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      if (this.sessionId && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'DISCONNECT',
          sessionId: this.sessionId,
          sender: 'tv',
          timestamp: Date.now(),
        });
      }
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('DISCONNECTED');
  }
}
