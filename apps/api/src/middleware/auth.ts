import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/database';

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        phone: string;
        role: string;
        adminRole?: string; // 'SUPER_ADMIN' | 'SUPPORT_AGENT' — set for admin JWT tokens
      };
    }
  }
}

/**
 * Authenticate middleware
 * 1. Verifies JWT token signature
 * 2. Checks if session is still valid in database
 * 3. Prevents use of invalidated/logged-out tokens
 */
/**
 * Role-based authorization middleware.
 * Must be used AFTER authenticate so req.user is set.
 */
export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: 'Authentication required', code: 'AUTH_REQUIRED', status: 401 } });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: { message: 'Forbidden: Insufficient permissions', code: 'FORBIDDEN', status: 403 } });
      return;
    }
    next();
  };

/**
 * Restrict an endpoint to SUPER_ADMIN only.
 * Must be used AFTER authenticate + requireRole('ADMIN').
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.adminRole !== 'SUPER_ADMIN') {
    res.status(403).json({ success: false, error: { message: 'Forbidden: Super-admin access required', code: 'FORBIDDEN', status: 403 } });
    return;
  }
  next();
};

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // The Authorization header is the only token source for normal requests.
  // A ?token= query param is accepted ONLY for direct browser PDF downloads
  // (the invoice route), because <a href>/window.open can't set headers. Query
  // tokens leak into access logs / Referer, so we never honor them elsewhere.
  const headerToken = req.headers.authorization?.split(' ')[1];
  const isInvoiceDownload = req.path.endsWith('/invoice');
  const queryToken = isInvoiceDownload ? (req.query.token as string | undefined) : undefined;
  const token = headerToken || queryToken;

  if (!token) {
    res.status(401).json({ success: false, error: { message: 'No token provided', code: 'AUTH_REQUIRED', status: 401 } });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    const userId = parseInt(String(decoded.sub ?? decoded.id), 10);

    // Verify session still exists in DB — catches logged-out tokens
    const session = await db.session.findFirst({
      where: { token, userId, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (!session) {
      res.status(401).json({ success: false, error: { message: 'Session expired or logged out', code: 'SESSION_EXPIRED', status: 401 } });
      return;
    }

    // Reject banned or soft-deleted users even with a valid unexpired session
    const userRecord = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, deletedAt: true, status: true },
    });
    if (!userRecord || userRecord.deletedAt || userRecord.status === 'BANNED') {
      res.status(401).json({ success: false, error: { message: 'Account is not active', code: 'ACCOUNT_INACTIVE', status: 401 } });
      return;
    }

    req.user = {
      id: userId,
      phone: decoded.phone || '',
      role: userRecord.role || decoded.role || 'PARKER',
      adminRole: decoded.adminRole, // 'SUPER_ADMIN' | 'SUPPORT_AGENT' | undefined
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: { message: 'Token expired', code: 'TOKEN_EXPIRED', status: 401 } });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: { message: 'Invalid token', code: 'INVALID_TOKEN', status: 401 } });
      return;
    }
    console.error('[AUTH] Unexpected error:', error);
    res.status(500).json({ success: false, error: { message: 'Authentication failed', code: 'AUTH_ERROR', status: 500 } });
  }
};
