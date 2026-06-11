import { Request, Response, NextFunction } from 'express';

interface CachedResponse {
  statusCode: number;
  body: any;
  expiresAt: number;
}

// In-memory store. For multi-instance prod, swap with Redis.
const store = new Map<string, CachedResponse>();
const TTL_MS = 5 * 60 * 1000; // 5 min

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (val.expiresAt <= now) store.delete(key);
  }
}, 60 * 1000);

/**
 * Idempotency middleware.
 * Clients send `Idempotency-Key: <uuid>` header. If the same key has been
 * processed in the last 5 minutes, the cached response is returned instead
 * of executing the handler again. Use on POST endpoints like booking creation.
 */
export const idempotency = (req: Request, res: Response, next: NextFunction): void => {
  const rawKey = req.headers['idempotency-key'];
  if (!rawKey || typeof rawKey !== 'string') {
    next();
    return;
  }
  const userId = req.user?.id ?? 'anon';
  const key = `${userId}:${req.method}:${req.path}:${rawKey}`;

  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.status(cached.statusCode).json(cached.body);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.set(key, {
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + TTL_MS,
      });
    }
    return originalJson(body);
  }) as any;

  next();
};
