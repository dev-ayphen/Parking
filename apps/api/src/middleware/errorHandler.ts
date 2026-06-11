/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

export interface ErrorResponse {
  success: false;
  error: string;
  status: number;
  stack?: string;
  message?: string;
}

/**
 * Error handling middleware
 * Should be the LAST middleware in the Express app
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && { status: error.status }),
    });
  }

  // Handle AppError
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: error.message,
      status: error.status,
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    return res.status(error.status).json(response);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      status: 401,
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      status: 401,
    });
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      status: 422,
      ...(process.env.NODE_ENV === 'development' && { details: error }),
    });
  }

  // Handle unknown errors (operational errors)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Unhandled Error:', error);
  }

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    status: 500,
    ...(process.env.NODE_ENV === 'development' && { message: error.message, stack: error.stack }),
  });
};

/**
 * Async error wrapper for express route handlers
 * Catches async errors and passes them to error handler
 *
 * @example
 * ```typescript
 * router.post('/example', asyncHandler(async (req, res) => {
 *   // Your async code here
 *   // Errors will be automatically caught and passed to errorHandler
 * }));
 * ```
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
