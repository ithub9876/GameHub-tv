/**
 * GameHub-TV Production Express & WebSocket Signaling Server
 * Coordinates TV Launcher & Android Mobile Engine Pairing, WebRTC Signaling, and Protocol RPC
 */

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const HOST = '0.0.0.0';

interface TvSession {
  sessionId: string;
  pinCode: string;
  tvSocket: WebSocket | null;
  mobileSocket: WebSocket | null;
  paired: boolean;
  deviceInfo: any | null;
  createdAt: number;
  lastActivity: number;
  activeGame: any | null;
}

const sessions = new Map<string, TvSession>();

// Cleanup stale sessions older than 4 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > 4 * 60 * 60 * 1000) {
      sessions.delete(id);
    }
  }
}, 60 * 1000);

function generateSessionId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GH-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePinCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  // API Routes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'GameHub-TV Signaling Engine',
      activeSessions: sessions.size,
      timestamp: Date.now(),
    });
  });

  app.get('/api/session/:sessionId/status', (req: Request, res: Response) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({
      sessionId: session.sessionId,
      paired: session.paired,
      hasTv: !!session.tvSocket && session.tvSocket.readyState === WebSocket.OPEN,
      hasMobile: !!session.mobileSocket && session.mobileSocket.readyState === WebSocket.OPEN,
      deviceInfo: session.deviceInfo,
    });
  });

  // WebSocket Signaling Broker
  wss.on('connection', (ws: WebSocket, req) => {
    let boundSessionId: string | null = null;
    let boundRole: 'tv' | 'mobile' | null = null;

    ws.on('message', (rawData: string) => {
      try {
        const msg = JSON.parse(rawData.toString());
        const { type, sessionId } = msg;

        // 1. TV REGISTRATION
        if (type === 'REGISTER_TV') {
          boundRole = 'tv';
          let targetSessionId = sessionId;

          if (!targetSessionId || !sessions.has(targetSessionId)) {
            targetSessionId = generateSessionId();
            const pin = generatePinCode();
            sessions.set(targetSessionId, {
              sessionId: targetSessionId,
              pinCode: pin,
              tvSocket: ws,
              mobileSocket: null,
              paired: false,
              deviceInfo: null,
              createdAt: Date.now(),
              lastActivity: Date.now(),
              activeGame: null,
            });
          } else {
            const existing = sessions.get(targetSessionId)!;
            existing.tvSocket = ws;
            existing.lastActivity = Date.now();
          }

          boundSessionId = targetSessionId;
          const currentSession = sessions.get(targetSessionId)!;

          const origin = req.headers.host || `localhost:${PORT}`;
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const baseUrl = `${protocol}://${origin}`;
          const pairingUrl = `${baseUrl}/?pair=${targetSessionId}&pin=${currentSession.pinCode}`;
          const qrPayload = JSON.stringify({
            protocol: 'gamehub-v1',
            type: 'pair',
            sessionId: targetSessionId,
            pin: currentSession.pinCode,
            host: baseUrl,
          });

          ws.send(
            JSON.stringify({
              type: 'TV_REGISTERED',
              sessionId: targetSessionId,
              pinCode: currentSession.pinCode,
              pairingUrl,
              qrPayload,
              stunServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
              ],
              timestamp: Date.now(),
              sender: 'server',
            })
          );
          return;
        }

        // Validate session exists for subsequent messages
        const session = sessions.get(sessionId || boundSessionId || '');
        if (!session) {
          ws.send(
            JSON.stringify({
              type: 'ERROR',
              code: 'SESSION_NOT_FOUND',
              message: 'Invalid or expired TV session.',
              timestamp: Date.now(),
              sender: 'server',
            })
          );
          return;
        }

        session.lastActivity = Date.now();

        // 2. MOBILE PAIR REQUEST
        if (type === 'PAIR_REQUEST') {
          boundRole = 'mobile';
          boundSessionId = session.sessionId;
          session.mobileSocket = ws;
          session.deviceInfo = msg.deviceInfo || { model: 'Android Device' };

          // Verify PIN
          if (msg.pinCode && msg.pinCode !== session.pinCode) {
            ws.send(
              JSON.stringify({
                type: 'PAIR_REJECT',
                sessionId: session.sessionId,
                reason: 'INVALID_PIN',
                timestamp: Date.now(),
                sender: 'server',
              })
            );
            return;
          }

          // Forward pair request to TV
          if (session.tvSocket && session.tvSocket.readyState === WebSocket.OPEN) {
            session.tvSocket.send(JSON.stringify(msg));
          }
          return;
        }

        // 3. TV PAIR ACCEPT
        if (type === 'PAIR_ACCEPT') {
          session.paired = true;
          if (session.mobileSocket && session.mobileSocket.readyState === WebSocket.OPEN) {
            session.mobileSocket.send(JSON.stringify(msg));
          }
          return;
        }

        // 4. TV PAIR REJECT
        if (type === 'PAIR_REJECT') {
          session.paired = false;
          if (session.mobileSocket && session.mobileSocket.readyState === WebSocket.OPEN) {
            session.mobileSocket.send(JSON.stringify(msg));
          }
          return;
        }

        // 5. HEARTBEAT PING
        if (type === 'HEARTBEAT_PING') {
          ws.send(
            JSON.stringify({
              type: 'HEARTBEAT_PONG',
              sessionId: session.sessionId,
              sequence: msg.sequence,
              originalTimestamp: msg.timestamp,
              timestamp: Date.now(),
              sender: 'server',
            })
          );
          return;
        }

        // 6. ROUTE ALL OTHER MESSAGES BETWEEN TV AND MOBILE
        const targetSocket = msg.sender === 'tv' ? session.mobileSocket : session.tvSocket;

        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify(msg));
        }
      } catch (err) {
        console.error('[Signaling Server] Error processing message:', err);
      }
    });

    ws.on('close', () => {
      if (boundSessionId) {
        const session = sessions.get(boundSessionId);
        if (session) {
          if (boundRole === 'tv') {
            session.tvSocket = null;
            if (session.mobileSocket && session.mobileSocket.readyState === WebSocket.OPEN) {
              session.mobileSocket.send(
                JSON.stringify({
                  type: 'DISCONNECT',
                  sessionId: boundSessionId,
                  sender: 'tv',
                  timestamp: Date.now(),
                })
              );
            }
          } else if (boundRole === 'mobile') {
            session.mobileSocket = null;
            session.paired = false;
            if (session.tvSocket && session.tvSocket.readyState === WebSocket.OPEN) {
              session.tvSocket.send(
                JSON.stringify({
                  type: 'DISCONNECT',
                  sessionId: boundSessionId,
                  sender: 'mobile',
                  timestamp: Date.now(),
                })
              );
            }
          }
        }
      }
    });
  });

  // Vite middleware in dev, static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[GameHub-TV] Production Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[GameHub-TV] Fatal startup error:', err);
  process.exit(1);
});
