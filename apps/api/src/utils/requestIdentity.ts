import { Request } from 'express';

export interface RequestIdentity {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Extract IP address and user-agent from an Express request for legal logging.
 * Honors `X-Forwarded-For` chain when behind a proxy (app must trust proxy).
 */
export const getRequestIdentity = (req: Request): RequestIdentity => {
  const forwarded = req.headers['x-forwarded-for'];
  const xff = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const ipFromXff = xff ? xff.split(',')[0]?.trim() : undefined;
  const ipAddress =
    ipFromXff ||
    req.ip ||
    (req.socket && (req.socket as any).remoteAddress) ||
    null;
  const ua = req.headers['user-agent'];
  return {
    ipAddress: ipAddress || null,
    userAgent: typeof ua === 'string' ? ua : null,
  };
};
