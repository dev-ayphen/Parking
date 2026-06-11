/**
 * Custom Application Error Class
 * Provides consistent error handling across the application
 */

export class AppError extends Error {
  public readonly status: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    status: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = status;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * Common application errors
 */
export const AppErrors = {
  // Client errors (4xx)
  badRequest: (message: string = 'Bad request') => new AppError(message, 400),
  unauthorized: (message: string = 'Unauthorized') => new AppError(message, 401),
  forbidden: (message: string = 'Forbidden') => new AppError(message, 403),
  notFound: (message: string = 'Not found') => new AppError(message, 404),
  conflict: (message: string = 'Conflict') => new AppError(message, 409),
  unprocessable: (message: string = 'Unprocessable entity') => new AppError(message, 422),
  tooManyRequests: (message: string = 'Too many requests') => new AppError(message, 429),

  // Server errors (5xx)
  internal: (message: string = 'Internal server error') => new AppError(message, 500, false),
  notImplemented: (message: string = 'Not implemented') => new AppError(message, 501, false),
  serviceUnavailable: (message: string = 'Service unavailable') => new AppError(message, 503, false),
};
