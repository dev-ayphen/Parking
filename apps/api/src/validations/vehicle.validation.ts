import { z } from 'zod';

/**
 * Indian licence-plate validator. Accepts the two formats in active issue and
 * rejects free-text junk ("FAKE1234", "XXXX") that the old min/max-only rule let
 * through. Spaces/hyphens are stripped before matching so "KA 01 AB 1234" and
 * "KA-01-AB-1234" both normalise to "KA01AB1234".
 *   • Standard:  AA 00 A(A) 0000   e.g. KA01AB1234, MH12A1234
 *   • BH-series: 00 BH 0000 A(A)   e.g. 22BH1234AA
 */
const STANDARD_PLATE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
const BH_PLATE = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/;

const licensePlateSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/[\s-]/g, '')) // normalise: drop spaces & hyphens
  .refine((v) => v.length >= 6 && v.length <= 12, {
    message: 'License plate must be 6–12 characters',
  })
  .refine((v) => STANDARD_PLATE.test(v) || BH_PLATE.test(v), {
    message: 'Enter a valid Indian licence plate (e.g. KA01AB1234)',
  });

export const createVehicleSchema = z.object({
  brandModel: z.string().min(2, 'Brand & Model must be at least 2 characters').max(100, 'Brand & Model must be at most 100 characters'),
  licensePlate: licensePlateSchema,
  vehicleType: z.enum(['CAR', 'BIKE'], {
    errorMap: () => ({ message: 'Vehicle type must be either CAR or BIKE' })
  }),
  capacity: z.number().int().refine(val => [2, 4, 5, 7].includes(val), {
    message: 'Capacity must be 2, 4, 5, or 7 seater'
  }),
  ownershipType: z.enum(['OWNER', 'DRIVER'], {
    errorMap: () => ({ message: 'Please select whether you are the Owner or Driver' })
  }),
  frontPhotoUrl: z.string().url('Front photo URL must be a valid URL').optional(),
  sidePhotoUrl: z.string().url('Side photo URL must be a valid URL').optional(),
  rcBookUrl: z.string().url('RC Book URL must be a valid URL').optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
