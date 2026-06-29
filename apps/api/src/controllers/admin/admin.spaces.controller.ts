import { Request, Response } from 'express';
import { adminService } from '../../services/admin.service';
import { emitToUser, emitToAdmin } from '../../app';
import { logEvent } from '../../services/log.service';
import { auditService } from '../../services/audit.service';
import { sendError, NotFound } from '../../utils/errors';
import { ErrorCode } from '../../utils/errorCodes';

export const adminSpacesController = {
  listSpaces: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listSpaces(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSpaceForAdmin: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      if (Number.isNaN(spaceId)) return res.status(400).json({ error: 'Invalid space id' });
      const result = await adminService.getSpaceForAdmin(spaceId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const { name, address, hourlyRate, description, capacity } = req.body ?? {};
      const result = await adminService.updateSpace(spaceId, { name, address, hourlyRate, description, capacity });
      emitToAdmin('spaces', 'space:updated', { spaceId });
      await logEvent('INFO', 'spaces', `Space ${spaceId} edited by admin`, { name, address, hourlyRate, capacity }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_UPDATED', targetType: 'SPACE', targetId: spaceId,
        payload: { name, address, hourlyRate, capacity }, req,
      });
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Space not found') return sendError(res, NotFound(msg, ErrorCode.SPACE_NOT_FOUND));
      sendError(res, error);
    }
  },

  approveSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await adminService.approveSpace(spaceId);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:status', { spaceId, status: 'VERIFIED' });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'VERIFIED' });
      await logEvent('SUCCESS', 'spaces', `Space ${spaceId} approved`, { ownerId }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_APPROVED', targetType: 'SPACE', targetId: spaceId, payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  rejectSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const reason = req.body?.reason;
      const result = await adminService.rejectSpace(spaceId, reason);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:rejected', { spaceId, status: 'REJECTED', reason: (result as any)?.space?.rejectionReason });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'REJECTED' });
      await logEvent('WARN', 'spaces', `Space ${spaceId} rejected`, { ownerId, reason }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_REJECTED', targetType: 'SPACE', targetId: spaceId, reason: req.body?.reason, payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Soft "please upload this document" request — notifies the owner, no status change.
  requestSpaceDocument: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const { documentLabel, message } = req.body ?? {};
      const result = await adminService.requestSpaceDocument(spaceId, documentLabel, message);
      emitToAdmin('spaces', 'space:updated', { spaceId });
      await logEvent('INFO', 'spaces', `Document requested for space ${spaceId}`, { documentLabel, message }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_DOC_REQUESTED', targetType: 'SPACE', targetId: spaceId, reason: message, payload: { documentLabel }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  blockSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await adminService.blockSpace(spaceId);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:status', { spaceId, status: 'BLOCKED' });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'BLOCKED' });
      await logEvent('WARN', 'spaces', `Space ${spaceId} blocked`, { ownerId }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_BLOCKED', targetType: 'SPACE', targetId: spaceId, reason: req.body?.reason, payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  unblockSpace: async (req: Request, res: Response) => {
    try {
      const spaceId = parseInt(req.params.id);
      const result = await adminService.unblockSpace(spaceId);
      const ownerId = (result as any)?.space?.ownerId ?? (result as any)?.ownerId;
      if (ownerId) emitToUser(ownerId, 'space:status', { spaceId, status: 'VERIFIED' });
      emitToAdmin('spaces', 'space:updated', { spaceId, status: 'VERIFIED' });
      await logEvent('INFO', 'spaces', `Space ${spaceId} unblocked`, { ownerId }, req.user?.id);
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'SPACE_UNBLOCKED', targetType: 'SPACE', targetId: spaceId, payload: { ownerId }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
