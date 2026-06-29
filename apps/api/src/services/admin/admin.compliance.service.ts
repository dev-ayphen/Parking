import { db } from '../../config/database';

export const adminComplianceService = {
  listSystemLogs: async (params: { level?: string; source?: string; search?: string; page?: number; limit?: number } = {}) => {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 50);
    const where: any = {};
    if (params.level && params.level !== 'All') where.level = params.level;
    if (params.source && params.source !== 'All') where.source = params.source;
    if (params.search) where.message = { contains: String(params.search), mode: 'insensitive' };
    const [logs, total] = await Promise.all([
      db.systemLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      db.systemLog.count({ where }),
    ]);
    return { success: true, logs, total, page, limit };
  },

  listAuditLogs: async (params: {
    action?: string; targetType?: string; search?: string;
    from?: string; to?: string; page?: number; limit?: number;
  } = {}) => {
    const page = Number(params.page || 1);
    const limit = Math.min(Number(params.limit || 50), 200);
    const where: any = {};

    if (params.action && params.action !== 'All') where.action = params.action;
    if (params.targetType && params.targetType !== 'All') where.targetType = params.targetType;
    if (params.from || params.to) {
      where.timestamp = {};
      if (params.from) where.timestamp.gte = new Date(params.from);
      if (params.to) { const to = new Date(params.to); to.setHours(23, 59, 59, 999); where.timestamp.lte = to; }
    }
    if (params.search) {
      const term = String(params.search);
      const or: any[] = [
        { targetId: { contains: term, mode: 'insensitive' } },
        { reason: { contains: term, mode: 'insensitive' } },
      ];
      // adminId is an unlinked Int? (no Prisma relation), so resolve matching
      // admin emails to ids first, then filter on adminId.
      const matchingAdmins = await db.user.findMany({ where: { email: { contains: term, mode: 'insensitive' } }, select: { id: true } });
      if (matchingAdmins.length) or.push({ adminId: { in: matchingAdmins.map((a: any) => a.id) } });
      where.OR = or;
    }

    const [rawLogs, total] = await Promise.all([
      db.adminActionLog.findMany({ where, orderBy: { timestamp: 'desc' }, skip: (page - 1) * limit, take: limit }),
      db.adminActionLog.count({ where }),
    ]);

    const adminIds = [...new Set(rawLogs.map((l: any) => l.adminId).filter(Boolean))] as number[];
    const admins = adminIds.length
      ? await db.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [];
    const adminMap = Object.fromEntries(admins.map((a: any) => [a.id, a]));

    const logs = rawLogs.map((l: any) => {
      const admin = l.adminId ? (adminMap[l.adminId] ?? null) : null;
      return { ...l, admin, adminEmail: admin?.email ?? null, metadata: l.payload ?? null, createdAt: l.timestamp };
    });
    return { success: true, logs, total, page, limit };
  },

  listLegalDocuments: async () => {
    const docs = await db.legalDocument.findMany({ orderBy: { updatedAt: 'desc' } });
    return { success: true, documents: docs };
  },

  getLegalDocument: async (slug: string) => {
    const doc = await db.legalDocument.findUnique({ where: { slug } });
    if (!doc) throw new Error('Document not found');
    return { success: true, document: doc };
  },

  upsertLegalDocument: async (slug: string, payload: { title?: string; content?: string; version?: string; isActive?: boolean }) => {
    const existing = await db.legalDocument.findUnique({ where: { slug } });
    if (existing) {
      const doc = await db.legalDocument.update({
        where: { slug },
        data: {
          ...(payload.title !== undefined && { title: payload.title }),
          ...(payload.content !== undefined && { content: payload.content }),
          ...(payload.version !== undefined && { version: payload.version }),
          ...(payload.isActive !== undefined && { isActive: payload.isActive }),
          effectiveAt: new Date(),
        },
      });
      return { success: true, document: doc };
    }
    const doc = await db.legalDocument.create({
      data: { slug, title: payload.title || slug, content: payload.content || '', version: payload.version || '1.0.0' },
    });
    return { success: true, document: doc };
  },

  listComplianceLogs: async (params: { type?: string; userId?: string; search?: string; page?: number; limit?: number } = {}) => {
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 30);
    const where: any = {};
    if (params.type && params.type !== 'All') where.type = params.type;
    if (params.userId) where.userId = Number(params.userId);
    if (params.search) {
      where.user = {
        OR: [
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }
    const [logs, total] = await Promise.all([
      db.complianceLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          document: { select: { slug: true, title: true, version: true } },
        },
      }),
      db.complianceLog.count({ where }),
    ]);
    return { success: true, logs, total, page, limit };
  },

  updateComplianceLog: async (id: number, status: string, notes?: string) => {
    const log = await db.complianceLog.update({ where: { id }, data: { status, ...(notes !== undefined && { notes }) } });
    return { success: true, log };
  },

  recordCompliance: async (params: {
    type: string; userId?: number; documentSlug?: string; documentVersion?: string;
    platform?: string; ipAddress?: string; appVersion?: string;
  }) => {
    let documentId: number | undefined;
    if (params.documentSlug) {
      const doc = await db.legalDocument.findUnique({ where: { slug: params.documentSlug }, select: { id: true } });
      if (doc) documentId = doc.id;
    }
    const log = await db.complianceLog.create({
      data: {
        type: params.type,
        userId: params.userId ?? null,
        documentId: documentId ?? null,
        documentVersion: params.documentVersion ?? null,
        platform: params.platform ?? null,
        ipAddress: params.ipAddress ?? null,
        appVersion: params.appVersion ?? null,
      },
    });
    return { success: true, log };
  },
};
