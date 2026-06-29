import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { otpLimiter, otpVerifyLimiter, adminLoginLimiter } from '../middleware/rateLimit';
import { otpStore } from '../services/auth.service';
import { env } from '../config/env';

const router = Router();

router.post('/request-otp', otpLimiter, authController.requestOtp);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyOtp);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/accept-terms', authenticate, authController.acceptTerms);

// Admin login with email + password — rate limited, credentials from env.
router.post('/admin-login', adminLoginLimiter, authController.adminLogin);

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
