import { db } from '../config/database';
import { AppError } from '../utils/errors';
import { storageService } from './storage.service';
import { BUCKETS } from '../config/supabase';

/**
 * Evidence files live in the PRIVATE bucket (PII). Stored values are keys;
 * resolve each to a short-lived signed URL before returning to a client.
 * Legacy rows holding full public URLs pass through unchanged.
 */
const resolveEvidenceUrls = async (urls: unknown): Promise<string[]> => {
  if (!Array.isArray(urls)) return [];
  return Promise.all(
    urls.map((u: string) =>
      storageService.resolveUrl(u, BUCKETS.PRIVATE).catch(() => u)
    )
  );
};

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
  'UPI_NOT_WORKING',
  'PAYMENT_NOT_RECEIVED',
  'LEFT_WITHOUT_PAYING',
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
      throw new AppError('Invalid report type', 400);
    }
    if (!data.description?.trim()) {
      throw new AppError('Description is required', 400);
    }
    if (reportedByUserId === data.reportedUserId) {
      throw new AppError('You cannot report yourself', 400);
    }

    const reported = await db.user.findUnique({ where: { id: data.reportedUserId } });
    if (!reported) throw new AppError('Reported user not found', 404);

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

  listReports: async (filters: { status?: string; page?: number; search?: string }) => {
    const page = filters.page ?? 1;
    const take = 20;
    const skip = (page - 1) * take;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { reportedUser: { firstName: { contains: s, mode: 'insensitive' } } },
        { reportedUser: { lastName: { contains: s, mode: 'insensitive' } } },
        { reportedUser: { phone: { contains: s, mode: 'insensitive' } } },
      ];
    }
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
    const withSigned = await Promise.all(
      reports.map(async (r) => ({
        ...r,
        evidenceUrls: await resolveEvidenceUrls((r as any).evidenceUrls),
      }))
    );
    return { success: true, reports: withSigned, total, page, pages: Math.ceil(total / take) };
  },

  getReport: async (reportId: number) => {
    const report = await db.abuseReport.findUnique({
      where: { id: reportId },
      include: {
        reportedUser: { select: { id: true, firstName: true, lastName: true, phone: true, role: true } },
        reportedByUser: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
    if (!report) throw new AppError('Report not found', 404);
    return {
      success: true,
      report: { ...report, evidenceUrls: await resolveEvidenceUrls((report as any).evidenceUrls) },
    };
  },

  actionReport: async (reportId: number, adminId: number, data: {
    action: string;
    adminAction: string;
    suspendedUntil?: string;
  }) => {
    if (!VALID_ACTIONS.includes(data.action)) {
      throw new AppError('Invalid action', 400);
    }

    const report = await db.abuseReport.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError('Report not found', 404);

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
    let appliedStatus: 'BANNED' | 'SUSPENDED' | null = null;
    if (isBan) {
      await db.user.update({
        where: { id: report.reportedUserId },
        data: { status: 'BANNED' },
      });
      appliedStatus = 'BANNED';
    } else if (isSuspend) {
      await db.user.update({
        where: { id: report.reportedUserId },
        data: {
          status: 'SUSPENDED',
          suspendedUntil: data.suspendedUntil ? new Date(data.suspendedUntil) : null,
        },
      });
      appliedStatus = 'SUSPENDED';
    } else if (isResolved) {
      // Optionally restore user if they were suspended via this report only
    }

    // Return the affected user + the status applied so the controller can emit
    // the realtime force-logout (same event the suspend/ban admin endpoints use).
    return {
      success: true,
      report: updated,
      reportedUserId: report.reportedUserId,
      appliedStatus,
      suspendedUntil: data.suspendedUntil || null,
    };
  },

  getMyReports: async (userId: number) => {
    const reports = await db.abuseReport.findMany({
      where: { reportedByUserId: userId },
      select: {
        id: true, abuseType: true, description: true, status: true, createdAt: true,
        // The admin's resolution note + when it was actioned, so the reporter can
        // see WHAT the admin did (not just that it was "Resolved").
        adminAction: true, updatedAt: true,
        reportedUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, reports };
  },
};
