import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { bookingLimiter, bookingPerUserLimiter, sessionOtpVerifyLimiter } from '../middleware/rateLimit';
import { idempotency } from '../middleware/idempotency';
import { validate } from '../middleware/validate';
import { createBookingSchema } from '../validations/booking.validation';
import { bookingController } from '../controllers/booking.controller';
import { invoiceController } from '../controllers/invoice.controller';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// Booking creation: rate-limited (per-IP + per-user) + idempotent + validated
router.post(
  '/',
  bookingLimiter,
  bookingPerUserLimiter,
  idempotency,
  validate(createBookingSchema),
  bookingController.createBooking,
);
router.get('/my', bookingController.getMyBookings);
router.get('/live-sessions', bookingController.getLiveSessions);
router.get('/owner-requests', bookingController.getOwnerRequests);
router.get('/:id', bookingController.getBooking);

// Owner-only: accept/decline (ownership check happens in service layer)
router.put('/:id/accept', bookingController.acceptBooking);
router.put('/:id/decline', bookingController.declineBooking);

// Parker or admin: cancel (authorship check happens in service layer)
router.put('/:id/cancel', bookingController.cancelBooking);

// Session lifecycle — authenticated
router.put('/:id/arrived', bookingController.markParkerArrived);
router.put('/:id/eta', bookingController.updateEta);
router.get('/:id/otp', bookingController.generateSessionOtp);
router.post('/:id/verify-otp', sessionOtpVerifyLimiter, bookingController.verifySessionOtp);
router.put('/:id/leaving', bookingController.markLeavingSession);
router.put('/:id/self-complete', bookingController.selfCompleteBooking);
router.put('/:id/release', bookingController.releaseSpace);
router.post('/:id/verification', bookingController.submitVerification);
router.get('/:id/verification', bookingController.getVerification);
router.put('/:id/verification/accept', bookingController.acceptVerification);
router.post('/:id/consent', bookingController.recordBookingConsent);
router.get('/:id/consent', bookingController.getBookingConsent);

// Invoice PDF download
router.get('/:id/invoice', invoiceController.download);

export default router;
