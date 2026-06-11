import { z } from 'zod';

export const createBookingSchema = z.object({
  spaceId: z.coerce.number().int().positive(),
  vehicleId: z.coerce.number().int().positive(),
  durationHours: z.coerce.number().int().min(1).max(24).default(1),
  eta: z.string().datetime().optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
