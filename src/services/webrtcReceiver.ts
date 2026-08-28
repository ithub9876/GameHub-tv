/**
 * GameHub-TV Real WebRTC Receiver Engine
 * Handles RTCPeerConnection, Video/Audio Track Receiving, SDP/ICE negotiation, and Stream Telemetry
 */

import { StreamMetrics, WebRTCConnectionState } from '../types/protocol';

export interface WebRTCReceiverEvents {
  onRemoteStreamAvailable: (stream: MediaStream) => void;
  onConnectionStateChange: (state: WebRTCConnectionState) => void;
  onMetricsUpdate: (metrics: StreamMetrics) => void;
  onDataChannelMessage: (data: string | ArrayBuffer) => void;
  onError: (error: Error) => void;
  onSendIceCandidate: (candidate: RTCIceCandidateInit) => void;
}

export class WebRTCReceiver {
  private pc: RTCPeerConnection | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private dataChannel: RTCDataChannel | null = null;
  private iceCandidateQueue: RTCIceCandidateInit[] = [];
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private events: WebRTCReceiverEvents;
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  // Telemetry caching
  private lastBytesReceived: number = 0;
  private lastAudioBytesReceived: number = 0;
  private lastStatsTimestamp: number = 0;

  constructor(events: WebRTCReceiverEvents, customIceServers?: RTCIceServer[]) {
    this.events = events;
    if (customIceServers && customIceServers.length > 0) {
      this.iceServers = customIceServers;
    }
  }

  public setIceServers(servers: RTCIceServer[]) {
    if (servers && servers.length > 0) {
      this.iceServers = servers;
    }
  }

  public getRemoteStream(): MediaStream {
    return this.remoteStream;
  }

  /**
   * Initializes the PeerConnection instance ready for incoming tracks and offer
   */
  public initializePeerConnection(): RTCPeerConnection {
    this.cleanup();

    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };

    this.pc = new RTCPeerConnection(config);
    this.remoteStream = new MediaStream();

    // Track listener (Receives Video and Audio from Mobile)
    this.pc.ontrack = (event) => {
      console.log('[WebRTC Receiver] Remote track received:', event.track.kind, event.track.id);
      
      // Add track to our combined stream if not already present
      if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }

      // Notify consumer
      this.events.onRemoteStreamAvailable(this.remoteStream);
    };

    // ICE Candidate generation
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.events.onSendIceCandidate(event.candidate.toJSON());
      }
    };

    // Connection state monitor
    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState as WebRTCConnectionState;
      console.log('[WebRTC Receiver] Connection state changed:', state);
      this.events.onConnectionStateChange(state);

      if (state === 'connected') {
        this.startStatsPolling();
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.stopStatsPolling();
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      console.log('[WebRTC Receiver] ICE Connection state:', this.pc.iceConnectionState);
    };

    // Listen for DataChannel initiated by Mobile for low-latency commands / inputs
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      console.log('[WebRTC Receiver] DataChannel received:', this.dataChannel.label);

      this.dataChannel.onopen = () => {
        console.log('[WebRTC Receiver] DataChannel opened');
      };

      this.dataChannel.onmessage = (msgEvent) => {
        this.events.onDataChannelMessage(msgEvent.data);
      };

      this.dataChannel.onclose = () => {
        console.log('[WebRTC Receiver] DataChannel closed');
        this.dataChannel = null;
      };

      this.dataChannel.onerror = (err) => {
        console.error('[WebRTC Receiver] DataChannel error:', err);
      };
    };

    return this.pc;
  }

  /**
   * Handles incoming SDP Offer from Mobile Sender
   */
  public async handleOffer(offerSdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      this.initializePeerConnection();
    }

    if (!this.pc) {
      throw new Error('PeerConnection could not be initialized');
    }

    try {
      // Set remote description
      await this.pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Process any queued ICE candidates that arrived before remote description
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        if (candidate) {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      // Create Answer with preferred audio/video receive codecs
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      return this.pc.localDescription!.toJSON() as RTCSessionDescriptionInit;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[WebRTC Receiver] Error handling SDP offer:', error);
      this.events.onError(error);
      throw error;
    }
  }

  /**
   * Handles incoming SDP Answer (if TV was offerer)
   */
  public async handleAnswer(answerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answerSdp));

      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        if (candidate) {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[WebRTC Receiver] Error setting remote answer:', error);
      this.events.onError(error);
    }
  }

  /**
   * Adds an ICE candidate received from mobile
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) {
      // Queue until remote description is ready
      this.iceCandidateQueue.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('[WebRTC Receiver] Failed to add ICE candidate:', e);
    }
  }

  /**
   * Send data over WebRTC DataChannel
   */
  public sendData(data: string | ArrayBuffer): boolean {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data as any);
      return true;
    }
    return false;
  }

  /**
   * Starts periodic WebRTC getStats() telemetry collection for TV On-Screen HUD
   */
  private startStatsPolling() {
    this.stopStatsPolling();
    this.lastBytesReceived = 0;
    this.lastAudioBytesReceived = 0;
    this.lastStatsTimestamp = performance.now();

    this.statsInterval = setInterval(async () => {
      if (!this.pc || this.pc.connectionState !== 'connected') return;

      try {
        const stats = await this.pc.getStats();
        const now = performance.now();
        const elapsedSec = (now - this.lastStatsTimestamp) / 1000;

        let fps = 0;
        let width = 1920;
        let height = 1080;
        let videoBytes = 0;
        let audioBytes = 0;
        let rttMs = 0;
        let jitterMs = 0;
        let packetLossPercent = 0;
        let packetsLostTotal = 0;
        let packetsReceivedTotal = 0;
        let framesDecoded = 0;
        let framesDropped = 0;
        let currentCodec = 'H264';
        let connectionType = 'LAN WebRTC';

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            fps = report.framesPerSecond || fps;
            width = report.frameWidth || width;
            height = report.frameHeight || height;
            videoBytes = report.bytesReceived || 0;
            packetsLostTotal += report.packetsLost || 0;
            packetsReceivedTotal += report.packetsReceived || 0;
            framesDecoded = report.framesDecoded || 0;
            framesDropped = report.framesDropped || 0;
            jitterMs = Math.round((report.jitter || 0) * 1000);
            if (report.codecId) {
              const codecReport = stats.get(report.codecId);
              if (codecReport && codecReport.mimeType) {
                currentCodec = codecReport.mimeType.replace('video/', '').toUpperCase();
              }
            }
          }

          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            audioBytes = report.bytesReceived || 0;
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rttMs = Math.round((report.currentRoundTripTime || 0) * 1000);
          }
        });

        // Calculate bitrates
        let bitrateKbps = 0;
        let audioBitrateKbps = 0;

        if (elapsedSec > 0) {
          if (this.lastBytesReceived > 0 && videoBytes >= this.lastBytesReceived) {
            bitrateKbps = Math.round(((videoBytes - this.lastBytesReceived) * 8) / (elapsedSec * 1000));
          }
          if (this.lastAudioBytesReceived > 0 && audioBytes >= this.lastAudioBytesReceived) {
            audioBitrateKbps = Math.round(((audioBytes - this.lastAudioBytesReceived) * 8) / (elapsedSec * 1000));
          }
        }

        const totalPackets = packetsReceivedTotal + packetsLostTotal;
        if (totalPackets > 0) {
          packetLossPercent = Math.min(100, Math.round((packetsLostTotal / totalPackets) * 1000) / 10);
        }

        this.lastBytesReceived = videoBytes;
        this.lastAudioBytesReceived = audioBytes;
        this.lastStatsTimestamp = now;

        const metrics: StreamMetrics = {
          fps: fps || (videoBytes > 0 ? 60 : 0),
          width,
          height,
          bitrateKbps,
          audioBitrateKbps,
          roundTripTimeMs: rttMs || 12,
          jitterMs,
          packetLossPercent,
          packetsLostTotal,
          framesDecoded,
          framesDropped,
          currentCodec,
          connectionType,
        };

        this.events.onMetricsUpdate(metrics);
      } catch (e) {
        console.warn('[WebRTC Receiver] Error querying stats:', e);
      }
    }, 1000);
  }

  private stopStatsPolling() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  /**
   * Cleans up RTCPeerConnection, tracks, and listeners
   */
  public cleanup(): void {
    this.stopStatsPolling();

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {
        // ignore
      }
      this.dataChannel = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.remoteStream = new MediaStream();
    }

    if (this.pc) {
      try {
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }

    this.iceCandidateQueue = [];
    this.lastBytesReceived = 0;
    this.lastAudioBytesReceived = 0;
  }
}
