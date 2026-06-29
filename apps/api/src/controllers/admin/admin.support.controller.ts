import { Request, Response } from 'express';
import { adminService } from '../../services/admin.service';
import { getIO, emitToAdmin } from '../../app';
import { caseEvidenceService } from '../../services/caseEvidence.service';
import { sendError, NotFound } from '../../utils/errors';

const emitTicketEvent = (event: string, ticketId: number, payload: any) => {
  const io = getIO();
  if (!io) return;
  io.to(`support_ticket_${ticketId}`).emit(event, payload);
};

export const adminSupportController = {
  listSupportTickets: async (req: Request, res: Response) => {
    try {
      // Pass the current admin id so the "My Tickets" filter resolves to them.
      const result = await adminService.listSupportTickets({ ...req.query, adminId: req.user?.id });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getSupportTicket: async (req: Request, res: Response) => {
    try {
      const result = await adminService.getSupportTicket(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Ticket not found') return sendError(res, NotFound(msg));
      sendError(res, error);
    }
  },

  updateSupportTicket: async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      const result = await adminService.updateSupportTicket(ticketId, req.body);
      emitTicketEvent('support:status', ticketId, { ticketId, status: result.ticket.status, priority: result.ticket.priority });
      emitToAdmin('support', 'support:updated', { ticketId, status: result.ticket.status });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  addSupportTicketReply: async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      const result = await adminService.addSupportTicketReply(ticketId, req.user?.id, req.body?.message ?? '');
      emitTicketEvent('support:reply', ticketId, { ticketId, reply: result.reply });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Assign / unassign a ticket. Body { adminId } — 'me' assigns to caller, null unassigns.
  assignSupportTicket: async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (Number.isNaN(ticketId)) return res.status(400).json({ error: 'Invalid ticket id' });
      const raw = req.body?.adminId;
      let adminId: number | null;
      if (raw === 'me') adminId = req.user?.id ?? null;
      else if (raw == null) adminId = null;
      else {
        adminId = Number(raw);
        if (!Number.isInteger(adminId)) return res.status(400).json({ error: 'Invalid adminId' });
      }
      const result = await adminService.assignSupportTicket(ticketId, adminId);
      emitToAdmin('support', 'support:updated', { ticketId, assignedTo: result.ticket.assignedTo });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  getCaseEvidence: async (req: Request, res: Response) => {
    try {
      const result = await caseEvidenceService.getBookingEvidence(req.params.bookingId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listCases: async (req: Request, res: Response) => {
    try {
      const { search, from, to, flagged, status, page, limit } = req.query;
      const result = await caseEvidenceService.listCases({
        search: search as string, from: from as string, to: to as string,
        flagged: flagged === 'true' || flagged === '1', status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
