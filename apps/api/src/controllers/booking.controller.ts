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
          metadata: { bookingId: result.id },
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
      const result = await bookingService.cancelBooking(req.params.id, req.user.id, req.user.role, req);
      // Notify the space owner so they can dismiss any open request modal
      const ownerId = (result as any)?.ownerId;
      if (ownerId) {
        emitToUser(ownerId, 'booking:cancelled', { bookingId: req.params.id });
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
      }
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  markLeavingSession: async (req: Request, res: Response) => {
    try {
      const result = await bookingService.markLeavingSession(req.params.id, req);
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

  releaseSpace: async (req: Request, res: Response) => {
    try {
      const result = await bookingService.releaseSpace(req.params.id, req.body, req);
      // Notify parker that session is complete — triggers navigation to session-complete screen
      const parkerId = (result as any)?.booking?.parkerId ?? (result as any)?.parkerId;
      if (parkerId) {
        emitToUser(parkerId, 'session:completed', {
          bookingId: req.params.id,
          totalAmount: (result as any)?.booking?.totalAmount ?? (result as any)?.totalAmount,
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
      if (ownerId) emitToUser(ownerId, 'verification:ready', { bookingId: req.params.id });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  recordBookingConsent: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
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
      const result = await bookingService.getBookingConsent(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  },
};
