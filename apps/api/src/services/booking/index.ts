import { bookingCoreService } from './booking.core.service';
import { bookingSessionService } from './booking.session.service';
import { bookingVerificationService } from './booking.verification.service';

// Re-export under the original name so all existing imports are unchanged.
export const bookingService = {
  ...bookingCoreService,
  ...bookingSessionService,
  ...bookingVerificationService,
};
