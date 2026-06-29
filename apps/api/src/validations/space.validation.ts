import { z } from 'zod';

// Base object — exported so updateSpace can call .partial() on it
export const createSpaceBaseSchema = z.object({
  // Step 1 — Basic Details
  spaceName: z
    .string({ required_error: 'Space Name is required*' })
    .min(2, 'Space Name must be at least 2 characters*')
    .max(100, 'Space Name must be at most 100 characters*')
    .trim(),

  spaceType: z
    .enum(
      [
        'Independent House', 'Rented House', 'Apartment Owner Slot', 'Apartment Tenant Slot',
        'Gated Villa', 'Shop Front Parking', 'Office Parking', 'Vacant Private Land',
        'Inside Compound', 'Open Frontage Area',
      ],
      { errorMap: () => ({ message: 'Space Type is required*' }) }
    ),

  parkingFor: z
    .enum(['Car', 'Bike', 'Both'], {
      errorMap: () => ({ message: 'Parking For is required*' })
    }),

  capacity: z
    .number({ required_error: 'Capacity is required*' })
    .int('Capacity must be a whole number*')
    .min(1, 'Capacity must be at least 1 slot*')
    .max(10, 'Capacity must be at most 10 slots*'),

  // Step 2 — Location
  address: z
    .string({ required_error: 'Location/Address is required*' })
    .min(5, 'Address must be at least 5 characters*')
    .max(200, 'Address must be at most 200 characters*')
    .trim(),

  latitude: z
    .number({ required_error: 'Latitude is required*' })
    .refine((val) => val >= -90 && val <= 90, 'Latitude must be between -90 and 90*'),

  longitude: z
    .number({ required_error: 'Longitude is required*' })
    .refine((val) => val >= -180 && val <= 180, 'Longitude must be between -180 and 180*'),

  // Step 3 — Pricing & Timing
  hourlyPrice: z
    .string({ required_error: 'Price is required*' })
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid number*')
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0, 'Price must be greater than 0*'),

  availability: z
    .enum(['24 Hours', 'Custom Hours', 'Weekdays Only'], {
      errorMap: () => ({ message: 'Availability/Time is required*' })
    }),

  // Step 4 — Photos & Documents
  frontPhoto: z
    .boolean({ required_error: 'Photo is required*' })
    .refine((val) => val === true, { message: 'Front View Photo is required*' }),

  docType: z
    .enum([
      'EB Bill', 'Property Tax', 'Water Bill',
      'Rental Agreement', 'Maintenance Bill', 'Parking Allocation Photo',
      'Parking Permission', 'Shop License', 'GST Certificate',
      'Company ID', 'Land Tax Receipt', 'Patta Copy',
      'Address Proof', 'Compound Photos',
    ], { errorMap: () => ({ message: 'Document Type is required*' }) })
    .optional(),

  // Step 5 — Confirmation
  confirmed: z
    .boolean({ required_error: 'Confirmation is required*' })
    .refine((val) => val === true, {
      message: 'You must confirm ownership/authorization*'
    }),

  // ========== OPTIONAL FIELDS ==========
  landmark: z.string().max(100, 'Landmark must be at most 100 characters').trim().optional(),

  amenities: z
    .array(
      z.enum(['CCTV', 'Security', 'Covered', 'EV Charging', 'Night Lighting', '24/7 Access', 'Water Available'])
    )
    .optional(),

  dailyRate: z.number().positive().optional(),
  monthlyRate: z.number().positive().optional(),

  areaPhoto: z.boolean().optional(),
  areaVideo: z.boolean().optional(),

  visibility: z.enum(['Private', 'Shared', 'Roadside']).optional(),

  // Custom Hours timing
  startTime: z.string().regex(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid start time format (e.g. 09:00 AM)').optional(),
  endTime: z.string().regex(/^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, 'Invalid end time format (e.g. 06:00 PM)').optional(),

  // Compliance consent (Step 5 — owner declarations)
  acceptOwnerResponsibility: z.boolean().optional(),
  acceptLegalCompliance: z.boolean().optional(),
  acceptNonViolation: z.boolean().optional(),
});

// Full create schema with cross-field refine
export const createSpaceSchema = createSpaceBaseSchema.refine(
  (data) => {
    if (data.availability === 'Custom Hours') {
      return !!data.startTime && !!data.endTime;
    }
    return true;
  },
  { message: 'Start time and end time are required for Custom Hours', path: ['startTime'] }
);

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;

// ─── Geo search query ─────────────────────────────────────────────────
export const searchSpacesQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().positive().max(50).optional(), // km
    search: z.string().trim().max(200).optional(),
    spaceType: z.string().optional(),
    parkingFor: z.string().optional(),
    durationMinutes: z.coerce.number().int().positive().max(10080).optional(), // max 7 days
    sort: z.enum(['distance', 'price', 'newest']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .refine((v) => (v.lat == null) === (v.lng == null), {
    message: 'lat and lng must be provided together',
    path: ['lng'],
  });

export type SearchSpacesQuery = z.infer<typeof searchSpacesQuerySchema>;
