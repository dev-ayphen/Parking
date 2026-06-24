import { Request, Response } from 'express';
import { bookingService } from '../services/booking.service';
import { emitToAdmin, emitToUser } from '../app';
import { adminService } from '../services/admin.service';
import { logEvent } from '../services/log.service';
import { sendError, Unauthorized, assertAuth } from '../utils/errors';
import { getRequestIdentity } from '../utils/requestIdentity';

export const bookingController = {
  createBooking: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.createBooking(req.user.id, req.body, req);

      // Notify admin dashboard in real-time
      emitToAdmin('bookings', 'booking:new', {
        id: result.id,
        space: result.space?.name ?? 'Unknown',
        parker: req.user.id,
        status: result.status,
        amount: result.totalAmount,
      });

      // Notify the space owner
      const ownerId = (result as any)?.space?.ownerId;
      if (ownerId) {
        emitToUser(ownerId, 'booking:new', { bookingId: result.id, status: result.status });
        await adminService.notifyUser(ownerId, {
          title: 'New Booking Request',
          message: `A parker has requested ${result.duration ?? ''}h on ${result.space?.name || 'your space'}.`,
          category: 'BOOKING',
          metadata: { bookingId: result.id, target: 'OWNER' },
        });
      }
      await logEvent('INFO', 'bookings', `Booking ${result.id} created`, { parkerId: req.user.id, spaceId: result.spaceId }, req.user.id);

      res.status(201).json({ success: true, booking: result });
    } catch (error) {
      sendError(res, error);
    }
  },

  getMyBookings: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const limit = parseInt(req.query.limit as string) || 10;
      const bookings = await bookingService.getMyBookings(req.user.id, limit);
      res.json({ success: true, bookings });
    } catch (error) {
      sendError(res, error);
    }
  },

  getLiveSessions: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const sessions = await bookingService.getLiveSessions(req.user.id);
      res.json({ success: true, sessions });
    } catch (error) {
      sendError(res, error);
    }
  },

  getBooking: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.getBooking(req.params.id, req.user.id, req.user.role);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  acceptBooking: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.acceptBooking(req.params.id, req.user.id, req);
      emitToAdmin('bookings', 'booking:update', { bookingId: req.params.id, status: 'APPROVED' });
      const parkerId = (result as any)?.booking?.parkerId;
      if (parkerId) {
        emitToUser(parkerId, 'booking:approved', { bookingId: req.params.id, status: 'APPROVED' });
        await adminService.notifyUser(parkerId, {
          title: 'Booking Approved',
          message: 'Your parking booking has been approved. You can now proceed.',
          category: 'BOOKING',
          metadata: { bookingId: req.params.id },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  declineBooking: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const reason = req.body?.reason?.trim() || 'Booking was declined by the owner';
      const result = await bookingService.declineBooking(req.params.id, req.user.id, req);
      emitToAdmin('bookings', 'booking:update', { bookingId: req.params.id, status: 'REJECTED' });
      const parkerId = (result as any)?.booking?.parkerId;
      if (parkerId) {
        emitToUser(parkerId, 'booking:rejected', { bookingId: req.params.id, status: 'REJECTED', reason });
        await adminService.notifyUser(parkerId, {
          title: 'Booking Rejected',
          message: `Your booking was declined. Reason: ${reason}`,
          category: 'BOOKING',
          metadata: { bookingId: req.params.id, reason },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  cancelBooking: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const reason = req.body?.reason?.trim() || undefined;
      const result = await bookingService.cancelBooking(req.params.id, req.user.id, req.user.role, reason, req);
      emitToAdmin('bookings', 'booking:update', { bookingId: req.params.id, status: 'CANCELLED' });

      const { ownerId, parkerId, spaceName, cancelledBy } = result as any;
      const bookingId = req.params.id;

      // Notify the OTHER party — DB notification (inbox) + push + live socket.
      // Whoever did NOT initiate the cancel gets told. This is the fix for the
      // "owner's app closed, parker cancels, owner never finds out" gap.
      if (cancelledBy === 'PARKER' && ownerId) {
        emitToUser(ownerId, 'booking:cancelled', { bookingId });
        await adminService.notifyUser(ownerId, {
          title: 'Booking Cancelled',
          message: `The parker cancelled their booking for ${spaceName}.${reason ? ` Reason: ${reason}` : ''}`,
          category: 'BOOKING',
          metadata: { bookingId },
        });
      } else if (cancelledBy === 'OWNER' && parkerId) {
        emitToUser(parkerId, 'booking:cancelled', { bookingId });
        await adminService.notifyUser(parkerId, {
          title: 'Booking Cancelled by Owner',
          message: `The owner cancelled your booking for ${spaceName}.${reason ? ` Reason: ${reason}` : ''} Please book another space.`,
          category: 'BOOKING',
          metadata: { bookingId },
        });
      } else if (cancelledBy === 'ADMIN') {
        // Admin cancellation — tell both sides.
        if (ownerId) {
          emitToUser(ownerId, 'booking:cancelled', { bookingId });
          await adminService.notifyUser(ownerId, {
            title: 'Booking Cancelled',
            message: `A booking for ${spaceName} was cancelled by support.`,
            category: 'BOOKING',
            metadata: { bookingId },
          });
        }
        if (parkerId) {
          emitToUser(parkerId, 'booking:cancelled', { bookingId });
          await adminService.notifyUser(parkerId, {
            title: 'Booking Cancelled',
            message: `Your booking for ${spaceName} was cancelled by support.`,
            category: 'BOOKING',
            metadata: { bookingId },
          });
        }
      }

      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  verifySessionOtp: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.verifySessionOtp(req.params.id, req.body, req.user.id, req);
      // Notify parker that session has started — triggers auto-navigation on their screen
      const parkerId = (result as any)?.booking?.parkerId;
      if (parkerId) {
        emitToUser(parkerId, 'session:started', { bookingId: req.params.id });
        await adminService.notifyUser(parkerId, {
          title: 'Session Started',
          message: 'Your parking session is now active. Enjoy your spot!',
          category: 'BOOKING',
          metadata: { bookingId: req.params.id },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  markLeavingSession: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.markLeavingSession(req.params.id, req.user.id, req);
      const ownerId = (result as any)?.ownerId;
      if (ownerId) {
        emitToUser(ownerId, 'parker:leaving', {
          bookingId: req.params.id,
          parkerName: (result as any)?.parkerName,
          spaceName: (result as any)?.spaceName,
        });
        await adminService.notifyUser(ownerId, {
          title: 'Parker is Leaving',
          message: `${(result as any)?.parkerName} is leaving ${(result as any)?.spaceName}. Complete the session to calculate the amount.`,
          category: 'BOOKING',
          metadata: { bookingId: req.params.id },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  selfCompleteBooking: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.selfCompleteBooking(req.params.id, req.user.id, req);
      const bookingId = req.params.id;
      const totalAmount = (result as any)?.booking?.totalAmount;
      // The parker force-completed the session. Tell the OWNER in realtime so their
      // open Exit Verification screen can close — the session is already finalized,
      // so the owner no longer needs to enter an exit time. Also refresh admin.
      const ownerId = (result as any)?.booking?.ownerId ?? (result as any)?.ownerId;
      emitToAdmin('bookings', 'booking:update', { bookingId, status: 'COMPLETED' });
      if (ownerId) {
        emitToUser(ownerId, 'session:completed', { bookingId, status: 'COMPLETED', totalAmount, byParker: true });
        await adminService.notifyUser(ownerId, {
          title: 'Session completed by parker',
          message: 'The parker completed the parking session because the exit wasn\'t confirmed in time. No action is needed.',
          category: 'BOOKING',
          metadata: { bookingId },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  releaseSpace: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.releaseSpace(req.params.id, req.user.id, req.body, req);
      emitToAdmin('bookings', 'booking:update', { bookingId: req.params.id, status: 'COMPLETED' });
      // Notify parker that session is complete — triggers navigation to session-complete screen
      const parkerId = (result as any)?.booking?.parkerId ?? (result as any)?.parkerId;
      if (parkerId) {
        const totalAmount = (result as any)?.booking?.totalAmount ?? (result as any)?.totalAmount;
        emitToUser(parkerId, 'session:completed', { bookingId: req.params.id, totalAmount });
        await adminService.notifyUser(parkerId, {
          title: 'Session Complete',
          message: `Your parking session ended.${totalAmount != null ? ` Total: ₹${totalAmount}.` : ''} Download your invoice from the booking.`,
          category: 'BOOKING',
          metadata: { bookingId: req.params.id },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  submitVerification: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.submitVerification(req.params.id, req.user.id, req.body, req);
      const parkerId = (result as any)?.parkerId;
      if (parkerId) {
        emitToUser(parkerId, 'verification:ready', {
          bookingId: req.params.id,
          requiresAcknowledgement: (result as any)?.requiresAcknowledgement,
        });
        // Push too — the parker may have the app closed and must acknowledge the
        // owner's condition report before they can generate the OTP / start.
        await adminService.notifyUser(parkerId, {
          title: 'Space condition report ready',
          message: (result as any)?.requiresAcknowledgement
            ? 'The owner logged the space condition. Review and acknowledge it to continue.'
            : 'The owner recorded the space condition for your booking.',
          category: 'BOOKING',
          metadata: { bookingId: req.params.id },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  acceptVerification: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.acceptVerification(req.params.id, req.user.id, req);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getVerification: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.getVerification(req.params.id, req.user.id, req.user.role);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getOwnerRequests: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.getOwnerRequests(req.user.id);
      res.json({ success: true, bookings: result });
    } catch (error) {
      sendError(res, error);
    }
  },

  markParkerArrived: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.markParkerArrived(req.params.id, req.user.id, req);
      if (result.ownerId) {
        emitToUser(result.ownerId, 'parker:arrived', {
          bookingId: result.bookingId,
          parkerName: result.parkerName,
          vehicleNumber: result.vehicleNumber,
          spaceName: result.spaceName,
        });
        await adminService.notifyUser(result.ownerId, {
          title: 'Parker Has Arrived',
          message: `${result.parkerName} has arrived at ${result.spaceName}. Vehicle: ${result.vehicleNumber}`,
          category: 'BOOKING',
          metadata: { bookingId: result.bookingId },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateEta: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const { eta } = req.body;
      if (!eta) return res.status(400).json({ success: false, error: 'eta is required' });
      const result = await bookingService.updateEta(req.params.id, req.user.id, new Date(eta), req);
      if (result.ownerId) {
        const etaTime = new Date(result.eta).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        emitToUser(result.ownerId, 'parker:eta-update', {
          bookingId: req.params.id,
          eta: result.eta,
          parkerName: (result as any)?.parkerName,
          spaceName: (result as any)?.spaceName,
        });
        await adminService.notifyUser(result.ownerId, {
          title: 'Updated Arrival Time',
          message: `${(result as any)?.parkerName} now expects to arrive by ${etaTime} at ${(result as any)?.spaceName}.`,
          category: 'BOOKING',
          metadata: { bookingId: req.params.id },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  generateSessionOtp: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await bookingService.generateSessionOtp(req.params.id, req.user.id, req);
      // Let the owner's screen know the parker's arrival OTP is ready to enter
      const ownerId = (result as any)?.ownerId;
      if (ownerId) {
        emitToUser(ownerId, 'verification:ready', { bookingId: req.params.id });
        // Push too — the parker is at the gate with an OTP; the owner must verify
        // it to start the session, and may not have the app open.
        await adminService.notifyUser(ownerId, {
          title: 'Parker at the gate',
          message: `${(result as any)?.parkerName || 'A parker'} is ready to start their session. Verify their OTP to begin.`,
          category: 'BOOKING',
          metadata: { bookingId: req.params.id, target: 'OWNER', action: 'verify' },
        });
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  recordBookingConsent: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const { id } = req.params;
      await bookingService.assertConsentAccess(id, { id: req.user.id, role: req.user.role });
      const { verifiedSurroundings, acceptLocalParkingRules, acceptFineResponsibility, acceptPlatformDisclaimer, acceptParkingTerms } = req.body;
      const identity = getRequestIdentity(req);
      const result = await bookingService.recordBookingConsent(id, {
        userId: req.user?.id ?? null,
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent,
        tcVersion: req.body.tcVersion ?? null,
        verifiedSurroundings: !!verifiedSurroundings,
        acceptLocalParkingRules: !!acceptLocalParkingRules,
        acceptFineResponsibility: !!acceptFineResponsibility,
        acceptPlatformDisclaimer: !!acceptPlatformDisclaimer,
        acceptParkingTerms: !!acceptParkingTerms,
        platform: req.body.platform,
        appVersion: req.body.appVersion,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getBookingConsent: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      await bookingService.assertConsentAccess(req.params.id, { id: req.user.id, role: req.user.role });
      const result = await bookingService.getBookingConsent(req.params.id);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
