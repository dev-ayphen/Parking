import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

const TTL_SECONDS = 5 * 60; // 5 min
const KEY_PREFIX = 'idem:';

// Marker stored while a request with a given key is still in flight, so a
// concurrent duplicate is rejected rather than executed a second time.
const IN_FLIGHT = '__in_flight__';

/**
 * Idempotency middleware (Redis-backed, atomic, multi-instance safe).
 *
 * Clients send `Idempotency-Key: <uuid>`. We atomically RESERVE the key with
 * SET NX *before* running the handler — so two concurrent requests with the
 * same key can't both execute (the second sees the reservation). On success we
 * overwrite the reservation with the cached response; a later retry replays it.
 * Use on POST endpoints like booking creation.
 */
// UUID v4 pattern — clients must send a proper UUID, not arbitrary strings
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const idempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const rawKey = req.headers['idempotency-key'];
  if (!rawKey || typeof rawKey !== 'string') {
    next();
    return;
  }
  if (!UUID_RE.test(rawKey)) {
    res.status(400).json({ error: 'Idempotency-Key must be a valid UUID v4.' });
    return;
  }
  const userId = req.user?.id ?? 'anon';
  const key = `${KEY_PREFIX}${userId}:${req.method}:${req.path}:${rawKey}`;

  // Atomic reserve: only the FIRST request for this key wins the SET NX.
  let reserved: string | null = null;
  try {
    reserved = await redis.set(key, IN_FLIGHT, 'EX', TTL_SECONDS, 'NX');
  } catch {
    // Redis unavailable — don't block the request; just run without dedup.
    next();
    return;
  }

  if (reserved === null) {
    // Key already exists: either a completed response is cached, or one is
    // still in flight.
    const existing = await redis.get(key).catch(() => null);
    if (existing && existing !== IN_FLIGHT) {
      try {
        const cached = JSON.parse(existing);
        res.status(cached.statusCode).json(cached.body);
        return;
      } catch {
        /* fall through to 409 */
      }
    }
    // Still processing the original — tell the client to retry shortly.
    res.status(409).json({ error: 'A request with this idempotency key is already being processed.' });
    return;
  }

  // We own the reservation — capture the response and store it on 2xx.
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      redis
        .set(key, JSON.stringify({ statusCode: res.statusCode, body }), 'EX', TTL_SECONDS)
        .catch(() => {});
    } else {
      // Non-2xx → release the reservation so the client can legitimately retry.
      redis.del(key).catch(() => {});
    }
    return originalJson(body);
  }) as any;

  next();
};
