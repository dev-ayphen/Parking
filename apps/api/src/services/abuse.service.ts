import { db } from '../config/database';

const VALID_TYPES = [
  'FAKER_BOOKING',
  'DAMAGING_PROPERTY',
  'REPEATED_CANCELLATION',
  'ILLEGAL_PARKING',
  'HARASSMENT',
  'FAKE_SPACE',
  'UNSAFE_AREA',
  'OFFLINE_PAYMENT_DEMAND',
  'MISLEADING_LISTING',
  'OTHER',
];

const VALID_ACTIONS = ['WARNING_ISSUED', 'SUSPENDED_TEMP', 'BANNED', 'RESOLVED', 'DISMISSED'];

export const abuseService = {
  submitReport: async (reportedByUserId: number, data: {
    reportedUserId: number;
    abuseType: string;
    description: string;
    evidenceUrls?: string[];
  }) => {
    if (!VALID_TYPES.includes(data.abuseType)) {
      throw Object.assign(new Error('Invalid report type'), { statusCode: 400 });
    }
    if (!data.description?.trim()) {
      throw Object.assign(new Error('Description is required'), { statusCode: 400 });
    }
    if (reportedByUserId === data.reportedUserId) {
      throw Object.assign(new Error('You cannot report yourself'), { statusCode: 400 });
    }

    const reported = await db.user.findUnique({ where: { id: data.reportedUserId } });
    if (!reported) throw Object.assign(new Error('Reported user not found'), { statusCode: 404 });

    // Idempotency guard — if this reporter already has an OPEN report against the
    // same user, return it instead of stacking duplicates (repeat taps / restarts).
    // A report is "closed" only once an admin RESOLVES or DISMISSES it; a new,
    // genuinely-separate issue can be reported after that.
    const existing = await db.abuseReport.findFirst({
      where: {
        reportedByUserId,
        reportedUserId: data.reportedUserId,
        status: { notIn: ['RESOLVED', 'DISMISSED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return { success: true, report: existing, alreadyReported: true };
    }

    const report = await db.abuseReport.create({
      data: {
        reportedUserId: data.reportedUserId,
        reportedByUserId,
        abuseType: data.abuseType,
        description: data.description.trim(),
        evidenceUrls: data.evidenceUrls ?? [],
        status: 'REPORTED',
      },
    });
    return { success: true, report };
  },

  listReports: async (filters: { status?: string; page?: number }) => {
    const page = filters.page ?? 1;
    const take = 20;
    const skip = (page - 1) * take;

    const where = filters.status ? { status: filters.status } : {};
    const [reports, total] = await Promise.all([
      db.abuseReport.findMany({
        where,
        include: {
          reportedUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
          reportedByUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      db.abuseReport.count({ where }),
    ]);
    return { success: true, reports, total, page, pages: Math.ceil(total / take) };
  },

  getReport: async (reportId: number) => {
    const report = await db.abuseReport.findUnique({
      where: { id: reportId },
      include: {
        reportedUser: { select: { id: true, firstName: true, lastName: true, phone: true, role: true } },
        reportedByUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!report) throw Object.assign(new Error('Report not found'), { statusCode: 404 });
    return { success: true, report };
  },

  actionReport: async (reportId: number, adminId: number, data: {
    action: string;
    adminAction: string;
    suspendedUntil?: string;
  }) => {
    if (!VALID_ACTIONS.includes(data.action)) {
      throw Object.assign(new Error('Invalid action'), { statusCode: 400 });
    }

    const report = await db.abuseReport.findUnique({ where: { id: reportId } });
    if (!report) throw Object.assign(new Error('Report not found'), { statusCode: 404 });

    const isBan = data.action === 'BANNED';
    const isSuspend = data.action === 'SUSPENDED_TEMP';
    const isResolved = data.action === 'RESOLVED' || data.action === 'DISMISSED';

    // Update the report
    const updated = await db.abuseReport.update({
      where: { id: reportId },
      data: {
        status: data.action,
        adminAction: data.adminAction,
        permanentlyBanned: isBan,
        suspendedUntil: isSuspend && data.suspendedUntil ? new Date(data.suspendedUntil) : null,
      },
    });

    // Apply user account action
    if (isBan) {
      await db.user.update({
        where: { id: report.reportedUserId },
        data: { status: 'BANNED' },
      });
    } else if (isSuspend) {
      await db.user.update({
        where: { id: report.reportedUserId },
        data: { status: 'SUSPENDED' },
      });
    } else if (isResolved) {
      // Optionally restore user if they were suspended via this report only
    }

    return { success: true, report: updated };
  },

  getMyReports: async (userId: number) => {
    const reports = await db.abuseReport.findMany({
      where: { reportedByUserId: userId },
      select: {
        id: true, abuseType: true, description: true, status: true, createdAt: true,
        reportedUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, reports };
  },
};
