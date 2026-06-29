import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { bookingLimiter, bookingPerUserLimiter, sessionOtpVerifyLimiter } from '../middleware/rateLimit';
import { idempotency } from '../middleware/idempotency';
import { validate } from '../middleware/validate';
import { createBookingSchema } from '../validations/booking.validation';
import { bookingController } from '../controllers/booking.controller';
import { invoiceController } from '../controllers/invoice.controller';

// Invoice GET is registered separately — it authenticates inside the controller
// because it accepts either a signed_token (no session JWT needed) or the legacy
// ?token= query param. All other routes go through authenticate middleware.
const publicRouter = Router();
publicRouter.get('/:id/invoice', invoiceController.download);

const router = Router();
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
router.put('/:id/payment-received', bookingController.markPaymentReceived);
router.put('/:id/release', bookingController.releaseSpace);
router.post('/:id/verification', bookingController.submitVerification);
router.get('/:id/verification', bookingController.getVerification);
router.put('/:id/verification/accept', bookingController.acceptVerification);
router.post('/:id/consent', bookingController.recordBookingConsent);
router.get('/:id/consent', bookingController.getBookingConsent);

// Invoice token: requires auth — POST /:id/invoice-token issues a 60s single-use token
router.post('/:id/invoice-token', invoiceController.issueToken);

export { publicRouter };
export default router;
