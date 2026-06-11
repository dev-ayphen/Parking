import { z } from 'zod';

export const createVehicleSchema = z.object({
  brandModel: z.string().min(2, 'Brand & Model must be at least 2 characters').max(100, 'Brand & Model must be at most 100 characters'),
  licensePlate: z.string().min(4, 'License plate must be at least 4 characters').max(20, 'License plate must be at most 20 characters').toUpperCase(),
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
