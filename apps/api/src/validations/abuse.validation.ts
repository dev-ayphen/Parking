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
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
});

export type SubmitAbuseReportInput = z.infer<typeof submitAbuseReportSchema>;
