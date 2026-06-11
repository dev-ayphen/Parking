import { Request, Response } from 'express';
import { spaceService } from '../services/space.service';
import { createSpaceSchema, createSpaceBaseSchema } from '../validations/space.validation';
import { emitToAdmin } from '../app';
import { logEvent } from '../services/log.service';
import { sendError, Unauthorized, assertAuth } from '../utils/errors';
import { getRequestIdentity } from '../utils/requestIdentity';
import { auditService } from '../services/audit.service';
import { db } from '../config/database';

export const spaceController = {
  searchSpaces: async (req: Request, res: Response) => {
    try {
      // req.query is already parsed/coerced by validate(searchSpacesQuerySchema, 'query')
      const result = await spaceService.searchSpaces(req.query as any);
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSpace: async (req: Request, res: Response) => {
    try {
      const result = await spaceService.getSpace(parseInt(req.params.id));
      res.status(200).json({ success: true, space: result });
    } catch (error) {
      sendError(res, error);
    }
  },

  /** POST /spaces/:id/media — multipart: frontPhoto, areaPhoto, areaVideo (any subset) */
  uploadMedia: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const spaceId = parseInt(req.params.id, 10);
      const f = req.files as Record<string, Express.Multer.File[]> | undefined;
      const pick = (name: string) => (f?.[name]?.[0] ? f[name][0] : undefined);
      const result = await spaceService.uploadMedia(spaceId, req.user.id, {
        frontPhoto: pick('frontPhoto'),
        areaPhoto: pick('areaPhoto'),
        areaVideo: pick('areaVideo'),
      });
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  createSpace: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const validatedData = createSpaceSchema.parse(req.body);
      const userId = req.user.id;
      const result = await spaceService.createSpace(userId, validatedData);

      emitToAdmin('spaces', 'space:new', {
        id: (result as any).id,
        name: (result as any).name,
        ownerId: userId,
        status: (result as any).status,
      });
      await logEvent('INFO', 'spaces', `New space submitted by user ${userId}`, { spaceId: (result as any).id }, userId);

      // Notify owner that their space is under review
      await db.notification.create({
        data: {
          userId,
          title: 'Space Submitted ✅',
          message: `Your space "${(result as any).name}" has been submitted and is pending admin review. We'll notify you once it's approved.`,
          category: 'SPACE',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Space created successfully. Verification in progress.',
        space: result,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  updateSpace: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const validatedData = createSpaceBaseSchema.partial().parse(req.body);
      const result = await spaceService.updateSpace(parseInt(req.params.id), req.user.id, validatedData);
      res.status(200).json({
        success: true,
        message: 'Space updated successfully',
        space: result,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  deleteSpace: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const spaceId = parseInt(req.params.id);
      const result = await spaceService.deleteSpace(spaceId, req.user.id, req.user.role);
      // If an ADMIN deleted the space, log it as moderation action.
      if (req.user.role === 'ADMIN') {
        await auditService.logAdminAction({
          adminId: req.user.id, action: 'SPACE_DELETED', targetType: 'SPACE', targetId: spaceId, req,
        });
      }
      res.status(200).json({
        success: true,
        message: 'Space deleted successfully',
        space: result,
      });
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('active bookings')) {
        return res.status(409).json({ error: message });
      }
      res.status(500).json({ error: message });
    }
  },

  // Owner: Get my own spaces
  getMySpaces: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const ownerId = req.user.id;
      const result = await spaceService.getMySpaces(ownerId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      sendError(res, error);
    }
  },

  // Admin: Get all spaces with optional filters
  getAllSpaces: async (req: Request, res: Response) => {
    try {
      const { status, search } = req.query;
      const result = await spaceService.getAllSpaces({
        status: status as string,
        search: search as string,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  // Admin: Approve a space
  approveSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await spaceService.updateSpaceStatus(spaceId, 'VERIFIED');
      res.status(200).json({
        success: true,
        message: 'Space approved successfully',
        space: result,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  // Admin: Reject a space
  rejectSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const { reason } = req.body;
      const result = await spaceService.updateSpaceStatus(spaceId, 'REJECTED', reason);
      res.status(200).json({
        success: true,
        message: 'Space rejected successfully',
        space: result,
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  getSpaceBookings: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const spaceId = parseInt(req.params.id);
      const ownerId = req.user.id;
      const bookings = await spaceService.getSpaceBookings(spaceId, ownerId);
      res.status(200).json({ success: true, bookings });
    } catch (error) {
      sendError(res, error);
    }
  },

  getSpaceAnalytics: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const spaceId = parseInt(req.params.id);
      const ownerId = req.user.id;
      const analytics = await spaceService.getSpaceAnalytics(spaceId, ownerId);
      res.status(200).json({ success: true, analytics });
    } catch (error) {
      sendError(res, error);
    }
  },

  recordOwnerConsent: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const identity = getRequestIdentity(req);
      const result = await spaceService.recordOwnerConsent(spaceId, {
        ...req.body,
        userId: req.user?.id ?? null,
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  recordRoadsideAcknowledgment: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const spaceId = parseInt(req.params.id);
      const identity = getRequestIdentity(req);
      const result = await spaceService.recordRoadsideAcknowledgment(spaceId, {
        userId: req.user.id,
        bookingId: req.body.bookingId ?? null,
        warningText: req.body.warningText || 'This parking space is near a public/open roadside area. By proceeding, you acknowledge the risks and accept responsibility for verifying local parking rules.',
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent,
        appVersion: req.body.appVersion,
        platform: req.body.platform,
      });
      res.status(201).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getOwnerConsent: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await spaceService.getOwnerConsent(spaceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
