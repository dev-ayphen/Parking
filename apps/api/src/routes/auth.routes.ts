import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { otpLimiter, otpVerifyLimiter } from '../middleware/rateLimit';
import { otpStore } from '../services/auth.service';
import { env } from '../config/env';
import { db } from '../config/database';
import { sendError, Unauthorized } from '../utils/errors';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/request-otp', otpLimiter, authController.requestOtp);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyOtp);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/accept-terms', authenticate, authController.acceptTerms);

// Admin login with email + password (dev dashboard)
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  if (email !== 'admin@gmail.com' || password !== 'admin') {
    return sendError(res, Unauthorized('Invalid credentials', 'AUTH_INVALID_CREDENTIALS'));
  }

  try {
    // Get or create admin user
    let adminUser = await db.user.findFirst({ where: { email } });
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          phone: 'admin',
          email,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          isProfileComplete: true,
        },
      });
    }

    const token = jwt.sign(
      { sub: adminUser.id, phone: 'admin', role: 'ADMIN', type: 'access' },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create session in DB so authenticate middleware can verify it
    const refreshToken = jwt.sign(
      { sub: adminUser.id, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    await db.session.deleteMany({ where: { userId: adminUser.id } });
    await db.session.create({
      data: {
        userId: adminUser.id,
        token,
        refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'admin-web',
      },
    });

    return res.json({ success: true, token, user: { id: adminUser.id, email, role: 'ADMIN' } });
  } catch (err) {
    console.error('[ADMIN LOGIN]', err);
    return res.status(500).json({ error: (err as Error).message });
  }
});

// 🧪 DEV ONLY: Get stored OTP for testing
router.get('/test/otp/:phone', async (req, res) => {
  if (env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const otpData = await otpStore.get(req.params.phone);

  if (!otpData) {
    return res.status(404).json({ error: 'No OTP found for this phone' });
  }

  res.json({
    phone: req.params.phone,
    otp: otpData.otp,
    attempts: otpData.attempts,
    expiresIn: Math.round((600000 - (Date.now() - otpData.createdAt)) / 1000) + 's'
  });
});

export default router;
