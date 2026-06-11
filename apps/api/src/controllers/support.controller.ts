import { Request, Response } from 'express';
import { supportService } from '../services/support.service';
import { getIO } from '../app';

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
      res.status(400).json({ error: (error as Error).message });
    }
  },

  listMyTickets: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const result = await supportService.listMyTickets(userId, req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
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
      const status = msg === 'Forbidden' ? 403 : msg === 'Ticket not found' ? 404 : 500;
      res.status(status).json({ error: msg });
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
      const status = msg === 'Forbidden' ? 403 : msg === 'Ticket not found' ? 404 : 400;
      res.status(status).json({ error: msg });
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
      const status = msg === 'Forbidden' ? 403 : msg === 'Ticket not found' ? 404 : 400;
      res.status(status).json({ error: msg });
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
      const status = msg === 'Forbidden' ? 403 : msg === 'Ticket not found' ? 404 : 400;
      res.status(status).json({ error: msg });
    }
  },
};
