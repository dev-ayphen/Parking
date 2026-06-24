import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from './config/env';
import apiRoutes from './routes';
import { generalApiLimiter } from './middleware/rateLimit';

// Load type augmentations
import './middleware/auth';

const app: Express = express();

// Parse CORS origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Tolerate empty / malformed-empty JSON bodies. Some clients (e.g. React Native
// fetch) send `Content-Type: application/json` even for bodyless calls like
// PUT /bookings/:id/accept, with an empty or NUL payload that express.json()
// rejects as "Unexpected token '\x00' is not valid JSON" (400). If the parse
// failed only because the body was effectively empty, recover with req.body = {}
// instead of 400ing a perfectly valid bodyless request.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.type === 'entity.parse.failed') {
    const raw = typeof err.body === 'string' ? err.body.replace(/\x00/g, '').trim() : '';
    if (raw === '') {
      req.body = {};
      return next();
    }
  }
  return next(err);
});

// NOTE: Files are now stored in Supabase Storage (see services/storage.service.ts),
// not on local disk — the legacy `/uploads` static handler has been removed.

// ============================================================================
// ROUTES
// ============================================================================

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: '🅿️ ParkSwift API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      api: 'All routes under /api',
      auth: ['POST /api/auth/request-otp', 'POST /api/auth/verify-otp', 'POST /api/auth/logout'],
      docs: 'See PARKSWIFT_IMPLEMENTATION_ROADMAP.md',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes — global rate limit (DDoS protection); per-route limiters add stricter caps
app.use('/api', generalApiLimiter, apiRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE (Must be last)
// ============================================================================

const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err.statusCode ?? err.status ?? 500;
  console.error('❌ Error:', {
    message: err.message,
    status,
    code: err.code,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
      status,
      ...(err.details ? { details: err.details } : {}),
    },
  });
};

app.use(errorHandler);

// ============================================================================
// SOCKET.IO SETUP (exported for use in index.ts)
// ============================================================================

// Exported singleton for emitting events from controllers/services
let socketServer: SocketIOServer | null = null;
export const getIO = (): SocketIOServer | null => socketServer;

export const setupSocketIO = (server: any): SocketIOServer => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });
  socketServer = io;

  // JWT auth middleware — runs on every socket connection
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth && (socket.handshake.auth as any).token) ||
      (socket.handshake.query && (socket.handshake.query as any).token);
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      (socket as any).data.user = {
        id: parseInt(String(decoded.sub ?? decoded.id), 10),
        role: decoded.role || 'PARKER',
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`✅ Socket connected: ${socket.id} (user ${(socket as any).data?.user?.id})`);

    // Enforce: users can only join their own room or admin rooms (if ADMIN)
    const authUser = (socket as any).data?.user;

    // Client joins a ticket room to receive real-time replies
    socket.on('support:join', (ticketId: string | number) => {
      const room = `support_ticket_${ticketId}`;
      socket.join(room);
    });

    socket.on('support:leave', (ticketId: string | number) => {
      socket.leave(`support_ticket_${ticketId}`);
    });

    // User joins their own room — server enforces that the requested userId matches the JWT
    socket.on('user:join', (userId: string | number) => {
      if (!authUser || Number(userId) !== authUser.id) return;
      socket.join(`user_${userId}`);
    });
    socket.on('user:leave', (userId: string | number) => {
      if (!authUser || Number(userId) !== authUser.id) return;
      socket.leave(`user_${userId}`);
    });

    // Admin joins global rooms — only if JWT role is ADMIN
    socket.on('admin:join', () => {
      if (!authUser || authUser.role !== 'ADMIN') return;
      socket.join('admin_support');
      socket.join('admin_bookings');
      socket.join('admin_spaces');
      socket.join('admin_users');
      socket.join('admin_payments');
      socket.join('admin_moderation');
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// ── Centralized event emitters ────────────────────────────────────────────
export const emitToUser = (userId: number, event: string, payload: any) => {
  const io = getIO();
  if (!io) return;
  io.to(`user_${userId}`).emit(event, payload);
};

export const emitToAdmin = (room: 'support' | 'bookings' | 'spaces' | 'users' | 'payments' | 'moderation', event: string, payload: any) => {
  const io = getIO();
  if (!io) return;
  io.to(`admin_${room}`).emit(event, payload);
};

export default app;
