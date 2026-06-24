import rateLimit from 'express-rate-limit';

// OTP requests: 20 per 15 min per IP in dev, 5 per hour in prod
const isDev = process.env.NODE_ENV !== 'production';
export const otpLimiter = rateLimit({
  windowMs: isDev ? 15 * 60 * 1000 : 60 * 60 * 1000,
  max: isDev ? 20 : 5,
  message: { error: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verification: 10 attempts per 15 min (prevents brute-force)
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many OTP verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Arrival-OTP verification: 15 attempts per 10 min per IP. Backstop on top of
// the per-booking attempt lock in the service (defends a 4-digit code).
export const sessionOtpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { error: 'Too many OTP attempts. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking creation: 10 per 5 min per IP (prevents booking spam)
export const bookingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { error: 'Too many booking attempts. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Booking creation — PER USER: 5 per 5 min keyed on the authenticated user id.
// The IP-based limiter above can't stop one logged-in account spamming bookings
// from a dedicated IP, and unfairly groups many users behind one shared/NAT IP.
// This sits alongside it (must run AFTER `authenticate` so req.user is set).
export const bookingPerUserLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'You are booking too frequently. Please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Key on user id when authenticated; fall back to IP otherwise.
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : (req.ip || 'unknown')),
});

// Space creation: 5 per hour per IP (prevents fake listing spam)
export const spaceCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many space creation attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Abuse report: 3 per hour per IP (prevents report spam)
export const abuseReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many reports submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit: 100 req/min per IP (DDoS protection)
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  // Production stays tight (DDoS protection). Dev is polling-heavy (Expo Go runs
  // multiple screens that each poll every ~8-10s + event-driven refetches), so a
  // 100/min cap was tripping the 429 during normal testing — raise it for dev.
  max: isDev ? 600 : 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});
