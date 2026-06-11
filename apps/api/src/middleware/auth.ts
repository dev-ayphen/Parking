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
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Also accept ?token= query param (used for PDF invoice direct browser downloads)
  const token = req.headers.authorization?.split(' ')[1] || (req.query.token as string | undefined);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
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
      res.status(401).json({ error: 'Session expired or logged out' });
      return;
    }

    req.user = {
      id: userId,
      phone: decoded.phone || '',
      role: decoded.role || 'PARKER',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    console.error('[AUTH] Unexpected error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
