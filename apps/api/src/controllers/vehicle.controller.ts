import { Request, Response } from 'express';
import { vehicleService } from '../services/vehicle.service';
import { createVehicleSchema } from '../validations/vehicle.validation';
import { sendError, assertAuth, BadRequest } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';

export const vehicleController = {
  /** POST /vehicles/:id/media — multipart: frontPhoto, sidePhoto, rcBook (any subset) */
  uploadMedia: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const vehicleId = parseInt(req.params.id, 10);
      if (isNaN(vehicleId)) throw BadRequest('Invalid vehicle ID', ErrorCode.INVALID_INPUT);
      const f = req.files as Record<string, Express.Multer.File[]> | undefined;
      const pick = (name: string) => (f?.[name]?.[0] ? f[name][0] : undefined);
      const result = await vehicleService.uploadMedia(vehicleId, req.user.id, {
        frontPhoto: pick('frontPhoto'),
        sidePhoto: pick('sidePhoto'),
        rcBook: pick('rcBook'),
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  listVehicles: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      console.log('🔍 [VEHICLE_LIST] Request received - userId:', userId, 'headers:', req.headers);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const result = await vehicleService.listVehicles(userId);
      console.log('✅ [VEHICLE_LIST] Returning:', result);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[VEHICLE] List error:', error);
      return res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to fetch vehicles',
      });
    }
  },

  addVehicle: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      // Validate request body with Zod
      const validationResult = createVehicleSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const result = await vehicleService.addVehicle(userId, validationResult.data);
      return res.status(201).json(result);
    } catch (error) {
      console.error('[VEHICLE] Add error:', error);
      return res.status(400).json({
        success: false,
        error: (error as Error).message || 'Failed to add vehicle',
      });
    }
  },

  updateVehicle: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const vehicleId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      if (!vehicleId || isNaN(vehicleId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vehicle ID',
        });
      }

      // Validate partial data with Zod
      const validationResult = createVehicleSchema.partial().safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      const result = await vehicleService.updateVehicle(vehicleId, validationResult.data);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[VEHICLE] Update error:', error);
      return res.status(400).json({
        success: false,
        error: (error as Error).message || 'Failed to update vehicle',
      });
    }
  },

  deleteVehicle: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const vehicleId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      if (!vehicleId || isNaN(vehicleId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid vehicle ID',
        });
      }

      const result = await vehicleService.deleteVehicle(vehicleId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[VEHICLE] Delete error:', error);
      return res.status(400).json({
        success: false,
        error: (error as Error).message || 'Failed to delete vehicle',
      });
    }
  },
};
