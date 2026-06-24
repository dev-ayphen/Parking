import { db } from '../config/database';
import { storageService } from './storage.service';
import { BUCKETS } from '../config/supabase';

/**
 * Attachment files live in the PRIVATE bucket (PII). Stored values are keys;
 * resolve each to a short-lived signed URL before returning to a client.
 * Legacy rows holding full public URLs pass through unchanged.
 */
const resolveAttachmentUrls = async (urls: unknown): Promise<string[]> => {
  if (!Array.isArray(urls)) return [];
  return Promise.all(
    urls.map((u: string) =>
      storageService.resolveUrl(u, BUCKETS.PRIVATE).catch(() => u)
    )
  );
};

/** Sign the attachmentUrls on an already-mapped ticket object. */
const signTicketAttachments = async <T extends { attachmentUrls?: string[] }>(
  ticket: T
): Promise<T> => ({
  ...ticket,
  attachmentUrls: await resolveAttachmentUrls(ticket.attachmentUrls),
});

const VALID_CATEGORIES = ['BOOKING', 'SPACE_OWNER', 'SUBSCRIPTION', 'ACCOUNT', 'TECHNICAL', 'OTHER'];
const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

// Anti-spam limits (per user). Enforced in the service so they hold across
// instances (not just per-IP like express-rate-limit).
const MAX_TICKETS_PER_DAY = 5;
const MAX_OPEN_TICKETS = 3;
// Open = anything not yet resolved/closed.
const OPEN_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'];

// SLA first-response targets (hours) by priority. slaDueAt = createdAt + target.
const SLA_HOURS: Record<string, number> = { URGENT: 2, HIGH: 8, NORMAL: 24, LOW: 72 };

// Standardized reference format — fixed-width, zero-padded, prefixed per entity
// type, matching ABU-xxxxx (abuse) and INC-xxxxx (incidents). One pattern users
// learn once: SUP-00482.
const ticketNumber = (id: number) => `SUP-${String(id).padStart(5, '0')}`;

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
    attachmentUrls: t.attachmentUrls || [],
    resolutionNote: t.resolutionNote,
    slaDueAt: t.slaDueAt ?? null,
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
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
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

    // Attachment count cap (size is enforced by the upload middleware).
    const attachmentUrls = Array.isArray(data.attachmentUrls) ? data.attachmentUrls : [];
    if (attachmentUrls.length > 5) {
      throw Object.assign(new Error('A ticket can have at most 5 attachments.'), { statusCode: 400 });
    }

    // ── Anti-spam rate limits (per user) ──────────────────────────────────
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [openCount, dayCount] = await Promise.all([
      db.supportTicket.count({ where: { userId, status: { in: OPEN_STATUSES } } }),
      db.supportTicket.count({ where: { userId, createdAt: { gte: dayAgo } } }),
    ]);
    if (openCount >= MAX_OPEN_TICKETS) {
      throw Object.assign(
        new Error(`You already have ${openCount} active tickets. Please wait until one is resolved before creating a new ticket.`),
        { statusCode: 429, code: 'TOO_MANY_OPEN_TICKETS' },
      );
    }
    if (dayCount >= MAX_TICKETS_PER_DAY) {
      throw Object.assign(
        new Error(`You've reached the daily limit of ${MAX_TICKETS_PER_DAY} tickets. Please try again tomorrow or reply on an existing ticket.`),
        { statusCode: 429, code: 'DAILY_TICKET_LIMIT' },
      );
    }

    // SLA first-response target from priority.
    const slaDueAt = new Date(Date.now() + (SLA_HOURS[priority] ?? 24) * 60 * 60 * 1000);

    const ticket = await db.supportTicket.create({
      data: {
        userId,
        subject: (data.subject || '').trim() || null,
        category,
        description,
        priority,
        attachmentUrls,
        contactName: (data.contactName || '').trim() || null,
        contactEmail: (data.contactEmail || '').trim() || null,
        contactPhone: (data.contactPhone || '').trim() || null,
        slaDueAt,
        status: 'OPEN',
      },
    });

    return { success: true, ticket: await signTicketAttachments(mapTicket(ticket)) };
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

    return {
      success: true,
      tickets: await Promise.all((tickets as any[]).map((t) => signTicketAttachments(mapTicket(t)))),
    };
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
        ...(await signTicketAttachments(mapTicket(ticket))),
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
    return { success: true, ticket: await signTicketAttachments(mapTicket(updated)) };
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
    return { success: true, ticket: await signTicketAttachments(mapTicket(updated)) };
  },
};
