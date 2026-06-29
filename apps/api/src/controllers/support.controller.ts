import { Request, Response } from 'express';
import { supportService } from '../services/support.service';
import { getIO } from '../app';
import { sendError } from '../utils/errors';

const emitTicketEvent = (event: string, ticketId: number, payload: any) => {
  const io = getIO();
  if (!io) return;
  io.to(`support_ticket_${ticketId}`).emit(event, payload);
};

const emitAdminEvent = (event: string, payload: any) => {
  const io = getIO();
  if (!io) return;
  io.to('admin_support').emit(event, payload);
};

export const supportController = {
  createTicket: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await supportService.createTicket(userId, req.body);
      emitAdminEvent('support:new', result.ticket);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listMyTickets: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await supportService.listMyTickets(userId, req.query);
      res.json(result);
    } catch (error) {
      console.error('[support] listMyTickets error:', error);
      sendError(res, error);
    }
  },

  getMyTicket: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await supportService.getMyTicket(userId, parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (msg === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
      sendError(res, error);
    }
  },

  addUserReply: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const ticketId = parseInt(req.params.id);
      const result = await supportService.addUserReply(userId, ticketId, req.body?.message ?? '');
      // Broadcast to anyone watching this ticket (admin/web dashboard etc.)
      emitTicketEvent('support:reply', ticketId, { ticketId, reply: result.reply });
      emitAdminEvent('support:new-reply', { ticketId, userId });
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (msg === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
      sendError(res, error);
    }
  },

  reopenTicket: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const ticketId = parseInt(req.params.id);
      const result = await supportService.reopenTicket(userId, ticketId);
      emitTicketEvent('support:status', ticketId, { ticketId, status: result.ticket.status });
      emitAdminEvent('support:reopened', { ticketId });
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (msg === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
      sendError(res, error);
    }
  },

  rateTicket: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const ticketId = parseInt(req.params.id);
      const result = await supportService.rateTicket(userId, ticketId, req.body);
      res.json(result);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
      if (msg === 'Ticket not found') return res.status(404).json({ error: 'Ticket not found' });
      sendError(res, error);
    }
  },
};
