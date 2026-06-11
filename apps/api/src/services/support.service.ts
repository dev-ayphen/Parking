import { db } from '../config/database';

const VALID_CATEGORIES = ['BOOKING', 'SPACE_OWNER', 'SUBSCRIPTION', 'ACCOUNT', 'TECHNICAL', 'OTHER'];
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

const ticketNumber = (id: number) => `PS-${String(1000 + id)}`;

const STATUS_DISPLAY: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_USER: 'Waiting for You',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

function mapTicket(t: any) {
  return {
    id: t.id,
    ticketNumber: ticketNumber(t.id),
    subject: t.subject,
    category: t.category,
    description: t.description,
    status: t.status,
    statusLabel: STATUS_DISPLAY[t.status] ?? t.status,
    priority: t.priority,
    isLiveChat: t.isLiveChat,
    attachmentUrls: t.attachmentUrls || [],
    resolutionNote: t.resolutionNote,
    rating: t.rating,
    ratingComment: t.ratingComment,
    replyCount: t._count?.replies ?? t.replies?.length ?? 0,
    lastReplyAt: t.replies && t.replies.length > 0
      ? t.replies[t.replies.length - 1].createdAt
      : t.updatedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    closedAt: t.closedAt,
  };
}

export const supportService = {
  createTicket: async (
    userId: number,
    data: {
      subject?: string;
      category: string;
      description: string;
      priority?: string;
      attachmentUrls?: string[];
      isLiveChat?: boolean;
    },
  ) => {
    const category = String(data.category || 'OTHER').toUpperCase();
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
    const priority = data.priority ? String(data.priority).toUpperCase() : 'NORMAL';
    if (!VALID_PRIORITIES.includes(priority)) {
      throw new Error(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }
    const description = (data.description || '').trim();
    if (!description) throw new Error('Description is required');

    const ticket = await db.supportTicket.create({
      data: {
        userId,
        subject: (data.subject || '').trim() || null,
        category,
        description,
        priority,
        attachmentUrls: Array.isArray(data.attachmentUrls) ? data.attachmentUrls : [],
        isLiveChat: Boolean(data.isLiveChat),
        status: 'OPEN',
      },
    });

    // Auto-send greeting for live chat tickets
    if (ticket.isLiveChat) {
      await db.supportTicketReply.create({
        data: {
          ticketId: ticket.id,
          message: 'Hi 👋 How can we help you today? Our support team will reply shortly. Average response time: 5 mins.',
          isAdmin: true,
        },
      });
    }

    return { success: true, ticket: mapTicket(ticket) };
  },

  listMyTickets: async (userId: number, query: any) => {
    const { status, category, search } = query;

    const where: any = { userId };
    if (status && status !== 'All') where.status = String(status).toUpperCase().replace(' ', '_');
    if (category) where.category = String(category).toUpperCase();
    if (search) {
      const s = String(search);
      where.OR = [
        { subject: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    const tickets = await db.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { replies: true } } },
    });

    return { success: true, tickets: (tickets as any[]).map(mapTicket) };
  },

  getMyTicket: async (userId: number, ticketId: number) => {
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        replies: { orderBy: { createdAt: 'asc' } },
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.userId !== userId) throw new Error('Forbidden');

    return {
      success: true,
      ticket: {
        ...mapTicket(ticket),
        replies: (ticket.replies as any[]).map((r) => ({
          id: r.id,
          message: r.message,
          isAdmin: r.isAdmin,
          createdAt: r.createdAt,
        })),
      },
    };
  },

  addUserReply: async (userId: number, ticketId: number, message: string) => {
    const trimmed = (message || '').trim();
    if (!trimmed) throw new Error('Message cannot be empty');

    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.userId !== userId) throw new Error('Forbidden');
    if (ticket.status === 'CLOSED') throw new Error('Cannot reply to a closed ticket. Please reopen it first.');

    const reply = await db.supportTicketReply.create({
      data: { ticketId, authorId: userId, message: trimmed, isAdmin: false },
    });

    // When user replies to a "waiting" ticket, flip back to IN_PROGRESS
    if (ticket.status === 'WAITING_FOR_USER') {
      await db.supportTicket.update({ where: { id: ticketId }, data: { status: 'IN_PROGRESS' } });
    } else if (ticket.status === 'RESOLVED') {
      // User replied after resolution — auto-reopen
      await db.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS', closedAt: null },
      });
    }

    return {
      success: true,
      reply: { id: reply.id, message: reply.message, isAdmin: false, createdAt: reply.createdAt },
    };
  },

  reopenTicket: async (userId: number, ticketId: number) => {
    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.userId !== userId) throw new Error('Forbidden');
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new Error('Only resolved or closed tickets can be reopened');
    }

    const updated = await db.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'IN_PROGRESS', closedAt: null, rating: null, ratingComment: null },
    });
    return { success: true, ticket: mapTicket(updated) };
  },

  rateTicket: async (
    userId: number,
    ticketId: number,
    data: { rating: number; comment?: string },
  ) => {
    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.userId !== userId) throw new Error('Forbidden');
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new Error('You can only rate resolved tickets');
    }
    const rating = Number(data.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) throw new Error('Rating must be 1-5');

    const updated = await db.supportTicket.update({
      where: { id: ticketId },
      data: { rating, ratingComment: (data.comment || '').trim() || null },
    });
    return { success: true, ticket: mapTicket(updated) };
  },
};
