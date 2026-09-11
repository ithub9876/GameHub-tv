/**
 * GameHub-TV Console Main Application
 * TV Launcher & Real WebRTC Game Display Receiver
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { GameRow } from './components/GameRow';
import { PairingModal } from './components/PairingModal';
import { GameDetailModal } from './components/GameDetailModal';
import { GameLaunchingScreen } from './components/GameLaunchingScreen';
import { StreamPlaybackView } from './components/StreamPlaybackView';
import { DiagnosticsDrawer } from './components/DiagnosticsDrawer';

import { INITIAL_GAMES, CATEGORIES } from './services/gameCatalog';
import { SignalingService } from './services/signalingService';
import { WebRTCReceiver } from './services/webrtcReceiver';
import { soundEffects } from './services/soundEffects';
import { useTvRemote } from './hooks/useTvRemote';

import { GameMetadata, GameCategory } from './types/models';
import {
  DeviceInfo,
  GameLaunchPayload,
  GameLaunchStatusPayload,
  SessionState,
  StreamMetrics,
  StreamQualityConfig,
  WebRTCConnectionState,
} from './types/protocol';

type FocusZone = 'HERO' | 'CATEGORIES' | 'RECENT_GAMES' | 'ALL_GAMES';

export default function App() {
  // Session & Connection States
  const [sessionState, setSessionState] = useState<SessionState>('PAIRING_WAITING');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [latencyMs, setLatencyMs] = useState<number>(14);

  // WebRTC States
  const [webrtcState, setWebrtcState] = useState<WebRTCConnectionState>('new');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [metrics, setMetrics] = useState<StreamMetrics>({
    fps: 0,
    width: 1920,
    height: 1080,
    bitrateKbps: 0,
    audioBitrateKbps: 0,
    roundTripTimeMs: 14,
    jitterMs: 1,
    packetLossPercent: 0,
    packetsLostTotal: 0,
    framesDecoded: 0,
    framesDropped: 0,
    currentCodec: 'H.264',
    connectionType: 'LAN Direct',
  });

  // Game & Navigation States
  const [games, setGames] = useState<GameMetadata[]>(INITIAL_GAMES);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('All');
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [inspectedGame, setInspectedGame] = useState<GameMetadata | null>(null);
  const [launchStatus, setLaunchStatus] = useState<GameLaunchStatusPayload | null>(null);

  // Modals & Drawers
  const [isPairingModalOpen, setIsPairingModalOpen] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Spatial TV D-Pad Focus System
  const [activeFocusZone, setActiveFocusZone] = useState<FocusZone>('HERO');
  const [heroButtonIndex, setHeroButtonIndex] = useState<number>(0); // 0 = Play, 1 = Info
  const [categoryIndex, setCategoryIndex] = useState<number>(0);
  const [recentGameIndex, setRecentGameIndex] = useState<number>(0);
  const [allGameIndex, setAllGameIndex] = useState<number>(0);

  // Services References
  const signalingRef = useRef<SignalingService | null>(null);
  const webrtcRef = useRef<WebRTCReceiver | null>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 50)]);
  }, []);

  // Filtered games based on category
  const filteredGames = useMemo(() => {
    if (selectedCategory === 'All') return games;
    return games.filter((g) => g.category === selectedCategory);
  }, [games, selectedCategory]);

  const recentGames = useMemo(() => {
    return games.filter((g) => g.lastPlayed);
  }, [games]);

  const featuredGame = useMemo(() => {
    return games[0] || INITIAL_GAMES[0];
  }, [games]);

  // Initialize Signaling & WebRTC Receiver
  useEffect(() => {
    // 1. Instantiate WebRTC Receiver
    const receiver = new WebRTCReceiver({
      onRemoteStreamAvailable: (stream) => {
        addLog(`WebRTC Remote stream track active (${stream.getTracks().length} tracks)`);
        setRemoteStream(stream);
        setSessionState('GAME_STREAMING');
      },
      onConnectionStateChange: (state) => {
        addLog(`WebRTC Receiver state: ${state}`);
        setWebrtcState(state);
        if (state === 'connected') {
          soundEffects.playPairSuccess();
        } else if (state === 'disconnected' || state === 'failed') {
          setSessionState((prev) =>
            prev === 'GAME_STREAMING' ? 'RECONNECTING' : prev
          );
        }
      },
      onMetricsUpdate: (streamMetrics) => {
        setMetrics(streamMetrics);
      },
      onDataChannelMessage: (data) => {
        addLog(`DataChannel RPC: ${typeof data === 'string' ? data : 'binary'}`);
      },
      onError: (err) => {
        addLog(`WebRTC Error: ${err.message}`);
      },
      onSendIceCandidate: (candidate) => {
        signalingRef.current?.sendIceCandidate(candidate);
      },
    });

    webrtcRef.current = receiver;

    let lastStickNavTime = 0;

    // 2. Instantiate Signaling Service
    const signaling = new SignalingService({
      onRegistered: (data) => {
        setSessionId(data.sessionId);
        setPinCode(data.pinCode);
        setPairingUrl(data.pairingUrl);
        setQrPayload(data.qrPayload);
        receiver.setIceServers(data.stunServers);
        addLog(`TV Registered with session: ${data.sessionId}, PIN: ${data.pinCode}`);
      },

      onPairRequest: ({ deviceInfo: incomingDev, pinCode: incomingPin }) => {
        addLog(`Incoming pairing request from ${incomingDev.model}`);
        // Auto-accept valid PIN pairing from mobile
        signaling.acceptPairing(incomingDev);
      },

      onPairAccepted: (dev) => {
        setDeviceInfo(dev);
        setSessionState('CONNECTED_STANDBY');
        soundEffects.playPairSuccess();
        addLog(`Pairing Confirmed with ${dev.model}`);
      },

      onMobileDisconnected: (reason) => {
        addLog(`Mobile disconnected: ${reason || 'Session ended'}`);
        setDeviceInfo(null);
        setSessionState('PAIRING_WAITING');
        setRemoteStream(null);
        receiver.cleanup();
      },

      onOfferReceived: async (offerSdp) => {
        addLog('Received WebRTC SDP Offer from mobile sender');
        setSessionState('HANDSHAKING_WEBRTC');
        try {
          const answerSdp = await receiver.handleOffer(offerSdp);
          signaling.sendAnswer(answerSdp);
          addLog('Sent WebRTC SDP Answer to mobile sender');
        } catch (e) {
          addLog(`SDP Answer generation failed: ${e}`);
        }
      },

      onAnswerReceived: async (answerSdp) => {
        addLog('Received SDP Answer');
        await receiver.handleAnswer(answerSdp);
      },

      onIceCandidateReceived: async (candidate) => {
        await receiver.addIceCandidate(candidate);
      },

      onGameLaunchStatus: (status) => {
        addLog(`Game Launch Status: ${status.state} - ${status.message || ''}`);
        setLaunchStatus(status);

        if (status.state === 'RUNNING' || status.state === 'STREAM_READY') {
          soundEffects.playLaunchChime();
          setSessionState('GAME_STREAMING');
        } else if (status.state === 'FAILED') {
          soundEffects.playError();
          alert(`Game launch failed: ${status.errorDetails || status.message || 'Unknown error'}`);
          setSessionState('CONNECTED_STANDBY');
        }
      },

      onHeartbeat: (rtt) => {
        setLatencyMs(rtt);
      },

      onNavCommand: (payload: any) => {
        if (!payload) return;
        const raw =
          typeof payload === 'string'
            ? payload
            : payload.direction ||
              payload.command ||
              payload.action ||
              payload.key ||
              payload.type ||
              '';
        const cmd = String(raw).toUpperCase().trim();
        if (cmd === 'UP' || cmd === 'ARROWUP' || cmd === 'DPAD_UP' || cmd === 'MOVE_UP') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        } else if (cmd === 'DOWN' || cmd === 'ARROWDOWN' || cmd === 'DPAD_DOWN' || cmd === 'MOVE_DOWN') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        } else if (cmd === 'LEFT' || cmd === 'ARROWLEFT' || cmd === 'DPAD_LEFT' || cmd === 'MOVE_LEFT') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        } else if (cmd === 'RIGHT' || cmd === 'ARROWRIGHT' || cmd === 'DPAD_RIGHT' || cmd === 'MOVE_RIGHT') {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        } else if (
          cmd === 'SELECT' ||
          cmd === 'ENTER' ||
          cmd === 'CONFIRM' ||
          cmd === 'CLICK' ||
          cmd === 'A' ||
          cmd === 'BUTTON_A' ||
          cmd === 'START' ||
          cmd === 'OK'
        ) {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        } else if (
          cmd === 'BACK' ||
          cmd === 'ESCAPE' ||
          cmd === 'CANCEL' ||
          cmd === 'B' ||
          cmd === 'BUTTON_B' ||
          cmd === 'CLOSE'
        ) {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }
      },

      onControllerInput: (input: any) => {
        if (!input) return;

        // 1. Direct string or command payload
        if (typeof input === 'string') {
          const s = input.toUpperCase().trim();
          if (s.includes('UP')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
          } else if (s.includes('DOWN')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          } else if (s.includes('LEFT')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
          } else if (s.includes('RIGHT')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
          } else if (s.includes('ENTER') || s.includes('SELECT') || s === 'A') {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          } else if (s.includes('BACK') || s.includes('ESCAPE') || s === 'B') {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
          return;
        }

        // 2. Individual button event
        if (input.button && input.pressed !== false && input.state !== 'up') {
          const btn = String(input.button).toUpperCase().trim();
          if (btn === 'UP' || btn === 'DPAD_UP' || btn === 'ARROWUP') {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
          } else if (btn === 'DOWN' || btn === 'DPAD_DOWN' || btn === 'ARROWDOWN') {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          } else if (btn === 'LEFT' || btn === 'DPAD_LEFT' || btn === 'ARROWLEFT') {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
          } else if (btn === 'RIGHT' || btn === 'DPAD_RIGHT' || btn === 'ARROWRIGHT') {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
          } else if (
            btn === 'A' ||
            btn === 'BUTTON_A' ||
            btn === 'SELECT' ||
            btn === 'START' ||
            btn === 'ENTER'
          ) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          } else if (btn === 'B' || btn === 'BUTTON_B' || btn === 'BACK' || btn === 'ESCAPE') {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
          return;
        }

        // 3. Controller state report: buttons dictionary
        if (input.buttons && typeof input.buttons === 'object') {
          const b = input.buttons;
          if (b.dpadUp || b.up || b.ArrowUp || b.DPAD_UP) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
          }
          if (b.dpadDown || b.down || b.ArrowDown || b.DPAD_DOWN) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
          }
          if (b.dpadLeft || b.left || b.ArrowLeft || b.DPAD_LEFT) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
          }
          if (b.dpadRight || b.right || b.ArrowRight || b.DPAD_RIGHT) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
          }
          if (b.a || b.A || b.cross || b.south || b.select || b.start || b.enter || b.BUTTON_A) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
          if (b.b || b.B || b.circle || b.east || b.back || b.escape || b.BUTTON_B) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
        }

        // 4. Joystick axes movement
        if (input.axes && typeof input.axes === 'object') {
          const now = Date.now();
          const lx = input.axes.leftStickX ?? input.axes.x ?? 0;
          const ly = input.axes.leftStickY ?? input.axes.y ?? 0;
          if (now - lastStickNavTime > 200) {
            if (ly < -0.5) {
              lastStickNavTime = now;
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
            } else if (ly > 0.5) {
              lastStickNavTime = now;
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
            } else if (lx < -0.5) {
              lastStickNavTime = now;
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
            } else if (lx > 0.5) {
              lastStickNavTime = now;
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            }
          }
        }
      },

      onError: (err) => {
        addLog(`Signaling error: ${err.message}`);
      },
    });

    signalingRef.current = signaling;
    signaling.connect();

    return () => {
      receiver.cleanup();
      signaling.disconnect();
    };
  }, [addLog]);

  // Handle Game Launch Request
  const handleLaunchGame = useCallback(
    (game: GameMetadata, qualityConfig?: StreamQualityConfig) => {
      // If phone is not paired, open the pairing hub first
      if (
        sessionState !== 'CONNECTED_STANDBY' &&
        sessionState !== 'GAME_LAUNCHING' &&
        sessionState !== 'GAME_STREAMING'
      ) {
        setIsPairingModalOpen(true);
        return;
      }

      setActiveGame(game);
      setSessionState('GAME_LAUNCHING');
      soundEffects.playSelect();

      // Dynamically track played game in session state
      setGames((prev) =>
        prev.map((g) =>
          g.id === game.id
            ? { ...g, lastPlayed: 'Just now', playTimeMinutes: (g.playTimeMinutes || 0) + 1 }
            : g
        )
      );

      // Dispatch real protocol LAUNCH_GAME RPC message to phone
      const payload: GameLaunchPayload = {
        gameId: game.id,
        title: game.title,
        packageName: game.packageName,
        preferredOrientation: game.orientation,
        qualityPreset: 'quality',
        controllerProfile: game.controllerMapping.profileName,
      };

      signalingRef.current?.launchGame(payload);
      addLog(`Dispatched LAUNCH_GAME RPC for ${game.title} (${game.packageName})`);
    },
    [sessionState, addLog]
  );

  // Handle Game Stop / Termination
  const handleExitGame = useCallback(() => {
    if (activeGame) {
      signalingRef.current?.terminateGame(activeGame.id, 'User exited from TV launcher');
      addLog(`Terminated game ${activeGame.title}`);
    }
    webrtcRef.current?.cleanup();
    setRemoteStream(null);
    setActiveGame(null);
    setSessionState('CONNECTED_STANDBY');
    soundEffects.playBack();
  }, [activeGame, addLog]);

  // Handle Remote Control D-Pad Key Bindings
  const handleRemoteUp = useCallback(() => {
    if (isPairingModalOpen || isDiagnosticsOpen || inspectedGame) return false;
    if (sessionState === 'GAME_STREAMING') return false;

    if (activeFocusZone === 'ALL_GAMES') {
      setActiveFocusZone('RECENT_GAMES');
      return true;
    }
    if (activeFocusZone === 'RECENT_GAMES') {
      setActiveFocusZone('CATEGORIES');
      return true;
    }
    if (activeFocusZone === 'CATEGORIES') {
      setActiveFocusZone('HERO');
      return true;
    }
    return false;
  }, [
    isPairingModalOpen,
    isDiagnosticsOpen,
    inspectedGame,
    sessionState,
    activeFocusZone,
  ]);

  const handleRemoteDown = useCallback(() => {
    if (isPairingModalOpen || isDiagnosticsOpen || inspectedGame) return false;
    if (sessionState === 'GAME_STREAMING') return false;

    if (activeFocusZone === 'HERO') {
      setActiveFocusZone('CATEGORIES');
      return true;
    }
    if (activeFocusZone === 'CATEGORIES') {
      setActiveFocusZone('RECENT_GAMES');
      return true;
    }
    if (activeFocusZone === 'RECENT_GAMES') {
      setActiveFocusZone('ALL_GAMES');
      return true;
    }
    return false;
  }, [
    isPairingModalOpen,
    isDiagnosticsOpen,
    inspectedGame,
    sessionState,
    activeFocusZone,
  ]);

  const handleRemoteLeft = useCallback(() => {
    if (isPairingModalOpen || isDiagnosticsOpen || inspectedGame) return false;
    if (sessionState === 'GAME_STREAMING') return false;

    if (activeFocusZone === 'HERO') {
      setHeroButtonIndex((prev) => Math.max(0, prev - 1));
      return true;
    }
    if (activeFocusZone === 'CATEGORIES') {
      setCategoryIndex((prev) => {
        const next = Math.max(0, prev - 1);
        setSelectedCategory(CATEGORIES[next]);
        return next;
      });
      return true;
    }
    if (activeFocusZone === 'RECENT_GAMES') {
      setRecentGameIndex((prev) => Math.max(0, prev - 1));
      return true;
    }
    if (activeFocusZone === 'ALL_GAMES') {
      setAllGameIndex((prev) => Math.max(0, prev - 1));
      return true;
    }
    return false;
  }, [
    isPairingModalOpen,
    isDiagnosticsOpen,
    inspectedGame,
    sessionState,
    activeFocusZone,
  ]);

  const handleRemoteRight = useCallback(() => {
    if (isPairingModalOpen || isDiagnosticsOpen || inspectedGame) return false;
    if (sessionState === 'GAME_STREAMING') return false;

    if (activeFocusZone === 'HERO') {
      setHeroButtonIndex((prev) => Math.min(1, prev + 1));
      return true;
    }
    if (activeFocusZone === 'CATEGORIES') {
      setCategoryIndex((prev) => {
        const next = Math.min(CATEGORIES.length - 1, prev + 1);
        setSelectedCategory(CATEGORIES[next]);
        return next;
      });
      return true;
    }
    if (activeFocusZone === 'RECENT_GAMES') {
      setRecentGameIndex((prev) => Math.min(recentGames.length - 1, prev + 1));
      return true;
    }
    if (activeFocusZone === 'ALL_GAMES') {
      setAllGameIndex((prev) => Math.min(filteredGames.length - 1, prev + 1));
      return true;
    }
    return false;
  }, [
    isPairingModalOpen,
    isDiagnosticsOpen,
    inspectedGame,
    sessionState,
    activeFocusZone,
    recentGames.length,
    filteredGames.length,
  ]);

  const handleRemoteSelect = useCallback(() => {
    if (isPairingModalOpen || isDiagnosticsOpen) return false;

    if (inspectedGame) {
      handleLaunchGame(inspectedGame);
      setInspectedGame(null);
      return true;
    }

    if (sessionState === 'GAME_STREAMING') {
      return false;
    }

    if (activeFocusZone === 'HERO') {
      if (heroButtonIndex === 0) {
        handleLaunchGame(featuredGame);
      } else {
        setInspectedGame(featuredGame);
      }
      return true;
    }

    if (activeFocusZone === 'CATEGORIES') {
      setSelectedCategory(CATEGORIES[categoryIndex]);
      return true;
    }

    if (activeFocusZone === 'RECENT_GAMES') {
      const g = recentGames[recentGameIndex];
      if (g) handleLaunchGame(g);
      return true;
    }

    if (activeFocusZone === 'ALL_GAMES') {
      const g = filteredGames[allGameIndex];
      if (g) handleLaunchGame(g);
      return true;
    }

    return false;
  }, [
    isPairingModalOpen,
    isDiagnosticsOpen,
    inspectedGame,
    sessionState,
    activeFocusZone,
    heroButtonIndex,
    featuredGame,
    categoryIndex,
    recentGames,
    recentGameIndex,
    filteredGames,
    allGameIndex,
    handleLaunchGame,
  ]);

  const handleRemoteBack = useCallback(() => {
    if (isDiagnosticsOpen) {
      setIsDiagnosticsOpen(false);
      return true;
    }
    if (isPairingModalOpen) {
      setIsPairingModalOpen(false);
      return true;
    }
    if (inspectedGame) {
      setInspectedGame(null);
      return true;
    }
    if (sessionState === 'GAME_STREAMING') {
      handleExitGame();
      return true;
    }
    if (sessionState === 'GAME_LAUNCHING') {
      setSessionState('CONNECTED_STANDBY');
      return true;
    }
    return false;
  }, [
    isDiagnosticsOpen,
    isPairingModalOpen,
    inspectedGame,
    sessionState,
    handleExitGame,
  ]);

  // TV Remote Key Hooks
  useTvRemote({
    onUp: handleRemoteUp,
    onDown: handleRemoteDown,
    onLeft: handleRemoteLeft,
    onRight: handleRemoteRight,
    onSelect: handleRemoteSelect,
    onBack: handleRemoteBack,
    onPairingShortcut: () => {
      setIsPairingModalOpen((prev) => !prev);
      return true;
    },
    onDiagnosticsShortcut: () => {
      setIsDiagnosticsOpen((prev) => !prev);
      return true;
    },
  });

  return (
    <div className="relative min-h-screen w-full bg-[#07080c] text-white flex flex-col overflow-x-hidden select-none">
      {/* Dynamic Console Ambient Lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none tv-glow" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none tv-glow" />

      {/* 1. TV Console Header */}
      <Header
        sessionState={sessionState}
        sessionId={sessionId}
        pinCode={pinCode}
        deviceInfo={deviceInfo}
        latencyMs={latencyMs}
        onOpenPairing={() => setIsPairingModalOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenSettings={() => setIsPairingModalOpen(true)}
      />

      {/* 2. Main TV Console Dashboard Layout */}
      <main className="flex-1 px-8 py-4 max-w-7xl w-full mx-auto space-y-8 z-10">
        {/* Featured Hero Banner */}
        <HeroBanner
          game={featuredGame}
          sessionState={sessionState}
          onLaunchGame={handleLaunchGame}
          onInspectGame={(g) => setInspectedGame(g)}
          isFocused={activeFocusZone === 'HERO'}
          focusedButtonIndex={heroButtonIndex}
        />

        {/* Category Selector Pills */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            soundEffects.playSelect();
          }}
          isFocused={activeFocusZone === 'CATEGORIES'}
          focusedCategoryIndex={categoryIndex}
        />

        {/* Recently Played Games Row */}
        {recentGames.length > 0 && (
          <GameRow
            id="row-recent"
            title="Recently Played"
            subtitle="Quick resume from connected phone storage"
            badge="Fast Launch"
            games={recentGames}
            focusedIndex={activeFocusZone === 'RECENT_GAMES' ? recentGameIndex : null}
            onSelectGame={handleLaunchGame}
            onInspectGame={(g) => setInspectedGame(g)}
          />
        )}

        {/* Main Games Collection Row / Grid */}
        <GameRow
          id="row-all"
          title={selectedCategory === 'All' ? 'Google Play Official Games' : `${selectedCategory} Games`}
          subtitle="Processed on phone engine • 60 FPS TV WebRTC projection"
          games={filteredGames}
          focusedIndex={activeFocusZone === 'ALL_GAMES' ? allGameIndex : null}
          onSelectGame={handleLaunchGame}
          onInspectGame={(g) => setInspectedGame(g)}
        />
      </main>

      {/* 3. Game Launching Transition Screen */}
      {sessionState === 'GAME_LAUNCHING' && activeGame && (
        <GameLaunchingScreen
          game={activeGame}
          deviceInfo={deviceInfo}
          launchStatus={launchStatus}
          onCancelLaunch={() => setSessionState('CONNECTED_STANDBY')}
        />
      )}

      {/* 4. Fullscreen Remote Gameplay Display Receiver */}
      {sessionState === 'GAME_STREAMING' && activeGame && (
        <StreamPlaybackView
          game={activeGame}
          remoteStream={remoteStream}
          webrtcState={webrtcState}
          metrics={metrics}
          deviceInfo={deviceInfo}
          onExitGame={handleExitGame}
          onRequestQuality={(q) => signalingRef.current?.requestQuality(q)}
        />
      )}

      {/* 5. Modals & Overlays */}
      <PairingModal
        isOpen={isPairingModalOpen}
        onClose={() => setIsPairingModalOpen(false)}
        sessionId={sessionId}
        pinCode={pinCode}
        pairingUrl={pairingUrl}
        qrPayload={qrPayload}
        sessionState={sessionState}
        deviceInfo={deviceInfo}
        onDisconnectPhone={() => signalingRef.current?.disconnect()}
        onRefreshPairing={() => signalingRef.current?.connect()}
      />

      <GameDetailModal
        game={inspectedGame}
        isOpen={!!inspectedGame}
        onClose={() => setInspectedGame(null)}
        sessionState={sessionState}
        onLaunchGame={handleLaunchGame}
        onPairRequested={() => setIsPairingModalOpen(true)}
      />

      <DiagnosticsDrawer
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        sessionState={sessionState}
        webrtcState={webrtcState}
        metrics={metrics}
        deviceInfo={deviceInfo}
        sessionId={sessionId}
        pinCode={pinCode}
        logs={logs}
      />
    </div>
  );
}
