import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

/**
 * Standardized application error.
 * All thrown errors that flow to the error handler should be AppError instances
 * so the response shape is consistent.
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Convenience constructors
export const BadRequest = (msg = 'Bad request', code = 'BAD_REQUEST', details?: any) =>
  new AppError(msg, 400, code, details);
export const Unauthorized = (msg = 'Unauthorized', code = 'AUTH_REQUIRED') =>
  new AppError(msg, 401, code);
export const Forbidden = (msg = 'Forbidden', code = 'AUTH_FORBIDDEN') =>
  new AppError(msg, 403, code);
export const NotFound = (msg = 'Not found', code = 'NOT_FOUND') =>
  new AppError(msg, 404, code);
export const Conflict = (msg = 'Conflict', code = 'CONFLICT') =>
  new AppError(msg, 409, code);
export const TooManyRequests = (msg = 'Too many requests', code = 'RATE_LIMITED') =>
  new AppError(msg, 429, code);

/**
 * Asserts that the request is authenticated (req.user populated by
 * the authenticate middleware). After calling assertAuth(req), TypeScript
 * knows req.user is non-null for the remainder of the function.
 * Throws AppError if missing — bubbles to the catch which calls sendError.
 *
 * Usage:
 *   assertAuth(req);
 *   // req.user.id is now safely accessible
 *   const result = await service.doThing(req.user.id);
 */
export interface AuthUser {
  id: number;
  phone: string;
  role: string;
}
export function assertAuth(req: Request): asserts req is Request & { user: AuthUser } {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  }
}

/**
 * Send a consistent error response. Use from inside controller catch blocks
 * when you cannot let the error propagate to the global handler.
 */
export const sendError = (res: Response, err: any): Response => {
  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        status: 400,
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        status: err.statusCode,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Legacy thrown error with statusCode attached.
  // Never expose raw err.message in production — it may contain Prisma query
  // details, stack fragments, or internal paths.
  const status = err?.statusCode ?? err?.status ?? 500;
  const isProd = env.NODE_ENV === 'production';
  const message = isProd && status >= 500
    ? 'Internal server error'
    : (err?.message || 'Internal server error');
  return res.status(status).json({
    success: false,
    error: {
      message,
      code: err?.code || 'INTERNAL_ERROR',
      status,
    },
  });
};
