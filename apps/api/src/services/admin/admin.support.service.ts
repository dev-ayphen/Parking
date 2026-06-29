import { db } from '../../config/database';
import { storageService } from '../storage.service';
import { BUCKETS } from '../../config/supabase';
import { adminNotificationsService } from './admin.notifications.service';

/**
 * Attachment files live in the PRIVATE bucket (PII). Stored values are keys;
 * resolve each to a short-lived signed URL before returning to a client.
 */
const resolveAttachmentUrls = async (urls: unknown): Promise<string[]> => {
  if (!Array.isArray(urls)) return [];
  return Promise.all(urls.map((u: string) => storageService.resolveUrl(u, BUCKETS.PRIVATE).catch(() => u)));
};

export const adminSupportService = {
  listSupportTickets: async (query: any) => {
    const { status, priority, category, search, assigned, adminId, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};
    if (status && status !== 'All') where.status = String(status).toUpperCase().replace(' ', '_');
    if (priority) where.priority = String(priority).toUpperCase();
    if (category && category !== 'All') where.category = String(category).toUpperCase();
    if (assigned === 'mine' && adminId) where.assignedToId = Number(adminId);
    else if (assigned === 'unassigned') where.assignedToId = null;
    if (search) {
      where.OR = [
        { subject: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
        { user: { firstName: { contains: String(search), mode: 'insensitive' } } },
        { user: { lastName: { contains: String(search), mode: 'insensitive' } } },
        { user: { phone: { contains: String(search) } } },
      ];
    }

    const [tickets, total, counts] = await Promise.all([
      db.supportTicket.findMany({
        where, skip, take: Number(limit),
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { replies: true } },
        },
      }),
      db.supportTicket.count({ where }),
      db.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const stats = { open: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
    (counts as any[]).forEach((c) => {
      stats.total += c._count._all;
      const key = String(c.status).toLowerCase() as keyof typeof stats;
      if (key in stats) (stats as any)[key] = c._count._all;
    });

    const mapped = (tickets as any[]).map((t) => ({
      id: t.id,
      ticketNumber: `SUP-${String(t.id).padStart(5, '0')}`,
      subject: t.subject || t.description.slice(0, 60) + (t.description.length > 60 ? '…' : ''),
      category: t.category,
      description: t.description,
      status: t.status,
      priority: t.priority,
      user: t.user
        ? { id: t.user.id, name: [t.user.firstName, t.user.lastName].filter(Boolean).join(' ') || t.user.phone, phone: t.user.phone }
        : null,
      replyCount: t._count.replies,
      assignedTo: t.assignedTo
        ? { id: t.assignedTo.id, name: [t.assignedTo.firstName, t.assignedTo.lastName].filter(Boolean).join(' ') || `Admin #${t.assignedTo.id}` }
        : null,
      slaDueAt: t.slaDueAt ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return { success: true, tickets: mapped, stats, total, page: Number(page), limit: Number(limit) };
  },

  getSupportTicket: async (ticketId: number) => {
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        replies: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new Error('Ticket not found');
    const t: any = ticket;

    const authorIds = Array.from(new Set(ticket.replies.map((r) => r.authorId).filter((x): x is number => x != null)));
    const authors = authorIds.length
      ? await db.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const authorMap = new Map(authors.map((a) => [a.id, [a.firstName, a.lastName].filter(Boolean).join(' ') || `User #${a.id}`]));

    return {
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: `SUP-${String(ticket.id).padStart(5, '0')}`,
        subject: ticket.subject,
        category: ticket.category,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        resolutionNote: ticket.resolutionNote,
        slaDueAt: t.slaDueAt ?? null,
        assignedTo: t.assignedTo
          ? { id: t.assignedTo.id, name: [t.assignedTo.firstName, t.assignedTo.lastName].filter(Boolean).join(' ') || `Admin #${t.assignedTo.id}` }
          : null,
        contact: { name: t.contactName ?? null, email: t.contactEmail ?? null, phone: t.contactPhone ?? null },
        user: ticket.user ? {
          id: ticket.user.id,
          name: [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(' ') || ticket.user.phone,
          phone: ticket.user.phone, email: ticket.user.email, role: ticket.user.role,
        } : null,
        attachmentUrls: await resolveAttachmentUrls((ticket as any).attachmentUrls),
        replies: ticket.replies.map((r: any) => ({
          id: r.id, message: r.message, isAdmin: r.isAdmin,
          authorId: r.authorId,
          authorName: r.authorId != null ? (authorMap.get(r.authorId) ?? null) : null,
          createdAt: r.createdAt,
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        closedAt: ticket.closedAt,
      },
    };
  },

  assignSupportTicket: async (ticketId: number, adminId: number | null) => {
    const ticket = await db.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId: adminId },
      include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
    });
    const a: any = (ticket as any).assignedTo;
    return {
      success: true,
      ticket: {
        id: ticket.id,
        assignedTo: a ? { id: a.id, name: [a.firstName, a.lastName].filter(Boolean).join(' ') || `Admin #${a.id}` } : null,
      },
    };
  },

  updateSupportTicket: async (ticketId: number, data: any) => {
    const allowed: any = {};
    if (data.status) {
      const s = String(data.status).toUpperCase().replace(' ', '_');
      if (!['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED'].includes(s)) throw new Error('Invalid status');
      allowed.status = s;
      if (s === 'CLOSED' || s === 'RESOLVED') allowed.closedAt = new Date();
      if (s === 'OPEN' || s === 'IN_PROGRESS' || s === 'WAITING_FOR_USER') allowed.closedAt = null;
    }
    if (data.priority) {
      const p = String(data.priority).toUpperCase();
      if (!['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(p)) throw new Error('Invalid priority');
      allowed.priority = p;
    }
    if (data.resolutionNote !== undefined) allowed.resolutionNote = data.resolutionNote || null;
    const ticket = await db.supportTicket.update({ where: { id: ticketId }, data: allowed });
    return { success: true, ticket };
  },

  addSupportTicketReply: async (ticketId: number, adminId: number | undefined, message: string) => {
    const trimmed = (message || '').trim();
    if (!trimmed) throw new Error('Message cannot be empty');

    const reply = await db.supportTicketReply.create({
      data: { ticketId, authorId: adminId, message: trimmed, isAdmin: true },
    });

    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (ticket && ticket.status === 'OPEN') {
      await db.supportTicket.update({ where: { id: ticketId }, data: { status: 'IN_PROGRESS' } });
    }
    if (ticket?.userId) {
      await adminNotificationsService.notifyUser(ticket.userId, {
        title: 'Support Replied',
        message: 'Our support team replied to your ticket. Tap to view.',
        category: 'SUPPORT',
        metadata: { screen: 'support-ticket', ticketId },
      });
    }
    return { success: true, reply };
  },
};
