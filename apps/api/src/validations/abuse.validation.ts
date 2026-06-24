import { z } from 'zod';

export const ABUSE_TYPES = [
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
] as const;

export const submitAbuseReportSchema = z.object({
  reportedUserId: z.coerce.number().int().positive(),
  abuseType: z.enum(ABUSE_TYPES),
  description: z.string().trim().min(5).max(1000),
  // Stored values are now private-bucket KEYS (e.g. "evidence/12/...jpg"), not
  // URLs. Accept any non-empty string (legacy rows may still hold full URLs).
  evidenceUrls: z.array(z.string().min(1)).max(5).optional(),
});

export type SubmitAbuseReportInput = z.infer<typeof submitAbuseReportSchema>;
