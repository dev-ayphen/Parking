import { Request, Response } from 'express';
import { adminService } from '../../services/admin.service';
import { adminExportService } from '../../services/adminExport.service';
import { emitToUser, emitToAdmin } from '../../app';
import { logEvent } from '../../services/log.service';
import { auditService } from '../../services/audit.service';
import { db } from '../../config/database';
import { sendError } from '../../utils/errors';

export const adminSystemController = {
  getAnalyticsOverview: async (req: Request, res: Response) => {
    try {
      const range = typeof req.query.range === 'string' ? req.query.range : undefined;
      const result = await adminService.getAnalyticsOverview(range);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSidebarCounts: async (_req: Request, res: Response) => {
    try {
      const result = await adminService.getSidebarCounts();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  broadcastNotification: async (req: Request, res: Response) => {
    try {
      const result = await adminService.broadcastNotification(req.body);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  sendBroadcast: async (req: Request, res: Response) => {
    try {
      const result = await adminService.broadcastNotification(req.body || {});
      if ((result as any).sent > 0) {
        const audience = (req.body?.audience || 'ALL') as 'ALL' | 'PARKERS' | 'OWNERS';
        const where: any = { status: 'ACTIVE' };
        if (audience === 'PARKERS') where.role = 'PARKER';
        else if (audience === 'OWNERS') where.role = 'OWNER';
        const users = await db.user.findMany({ where, select: { id: true } });
        users.forEach((u: any) => emitToUser(u.id, 'notification:new', { title: req.body?.title, message: req.body?.message }));
      }
      await logEvent('INFO', 'notifications', `Broadcast sent to ${(result as any).sent} users`, { audience: req.body?.audience }, req.user?.id);
      // Live-refresh the admin Communications page.
      emitToAdmin('users', 'broadcast:new', { title: req.body?.title, sent: (result as any).sent });
      if (req.user?.id) await auditService.logAdminAction({
        adminId: req.user.id, action: 'BROADCAST_SENT', targetType: 'BROADCAST',
        targetId: (result as any)?.broadcastId ?? 'inline',
        payload: { audience: req.body?.audience, title: req.body?.title, recipients: (result as any).sent }, req,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listBroadcastHistory: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listBroadcastHistory(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // ── Broadcast templates (DB-backed; replaces the old localStorage store) ──
  listBroadcastTemplates: async (_req: Request, res: Response) => {
    try {
      const templates = await db.broadcastTemplate.findMany({ orderBy: { createdAt: 'desc' } });
      res.json({ success: true, templates });
    } catch (error) {
      sendError(res, error);
    }
  },

  createBroadcastTemplate: async (req: Request, res: Response) => {
    try {
      const { name, title, body, audience, category } = req.body || {};
      if (!name?.trim() || !title?.trim() || !body?.trim()) {
        res.status(400).json({ error: 'Name, title and body are required' });
        return;
      }
      const template = await db.broadcastTemplate.create({
        data: {
          name: String(name).trim(),
          title: String(title).trim(),
          body: String(body).trim(),
          audience: ['ALL', 'PARKERS', 'OWNERS'].includes(audience) ? audience : 'ALL',
          category: ['GENERAL', 'BOOKING', 'PAYMENT', 'SPACE', 'SUPPORT', 'SYSTEM'].includes(category) ? category : 'GENERAL',
          createdBy: req.user?.id ?? null,
        },
      });
      res.status(201).json({ success: true, template });
    } catch (error) {
      sendError(res, error);
    }
  },

  deleteBroadcastTemplate: async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) { res.status(400).json({ error: 'Invalid template id' }); return; }
      await db.broadcastTemplate.delete({ where: { id } }).catch(() => {});
      res.json({ success: true });
    } catch (error) {
      sendError(res, error);
    }
  },

  listSystemLogs: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listSystemLogs(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listAuditLogs: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listAuditLogs({
        action: req.query.action as string,
        targetType: req.query.targetType as string,
        search: req.query.search as string,
        from: (req.query.startDate ?? req.query.from) as string,
        to: (req.query.endDate ?? req.query.to) as string,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  exportAuditLogs: async (req: Request, res: Response) => {
    try {
      const { logs } = await adminService.listAuditLogs({
        action: req.query.action as string,
        targetType: req.query.targetType as string,
        search: req.query.search as string,
        from: (req.query.startDate ?? req.query.from) as string,
        to: (req.query.endDate ?? req.query.to) as string,
        page: 1, limit: 10000,
      });
      const esc = (v: any) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ['id', 'timestamp', 'adminId', 'adminEmail', 'action', 'targetType', 'targetId', 'reason', 'metadata', 'ipAddress'];
      const rows = (logs as any[]).map((l) => [
        l.id,
        l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
        l.adminId ?? '',
        l.admin?.email ?? '',
        l.action, l.targetType, l.targetId,
        l.reason ?? '',
        l.payload ? JSON.stringify(l.payload) : '',
        l.ipAddress ?? '',
      ].map(esc).join(','));
      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="admin-audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      sendError(res, error);
    }
  },

  listLegalDocuments: async (_req: Request, res: Response) => {
    try {
      const result = await adminService.listLegalDocuments();
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  upsertLegalDocument: async (req: Request, res: Response) => {
    try {
      const result = await adminService.upsertLegalDocument(req.params.slug, req.body || {});
      await logEvent('INFO', 'admin', `Legal doc ${req.params.slug} updated`, { version: req.body?.version }, req.user?.id);
      emitToAdmin('moderation', 'legal:update', { slug: req.params.slug });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listComplianceLogs: async (req: Request, res: Response) => {
    try {
      const result = await adminService.listComplianceLogs(req.query);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  updateComplianceLog: async (req: Request, res: Response) => {
    try {
      const result = await adminService.updateComplianceLog(parseInt(req.params.id), req.body?.status, req.body?.notes);
      emitToAdmin('moderation', 'compliance:update', { id: parseInt(req.params.id), status: req.body?.status });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  exportLogs: async (req: Request, res: Response) => {
    try {
      const csv = await adminExportService.logsCsv({
        level: req.query.level as string,
        source: req.query.source as string,
        search: req.query.search as string,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="system-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (error) {
      sendError(res, error);
    }
  },
};
