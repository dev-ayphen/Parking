import { Request, Response } from 'express';
import { vehicleService } from '../services/vehicle.service';
import { sendError, assertAuth, BadRequest } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { storageService } from '../services/storage.service';
import { BUCKETS } from '../config/supabase';
import { db } from '../config/database';

export const vehicleController = {
  /** GET /vehicles/:id/rcbook-url — returns a 1-hour signed URL for the private RC book */
  getRcBookUrl: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const vehicleId = parseInt(req.params.id, 10);
      if (isNaN(vehicleId)) throw BadRequest('Invalid vehicle ID', ErrorCode.INVALID_INPUT);

      // Admin can view any vehicle's RC book; parker can only view their own
      const isAdmin = req.user.role === 'ADMIN';
      const where = isAdmin ? { id: vehicleId } : { id: vehicleId, userId: req.user.id };
      const vehicle = await db.vehicle.findFirst({ where, select: { rcBookUrl: true } });
      if (!vehicle) { res.status(404).json({ error: 'Vehicle not found' }); return; }
      if (!vehicle.rcBookUrl) { res.status(404).json({ error: 'No RC book uploaded for this vehicle' }); return; }

      const url = await storageService.resolveUrl(vehicle.rcBookUrl, BUCKETS.PRIVATE);
      res.json({ success: true, url });
    } catch (error) {
      sendError(res, error);
    }
  },

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
      assertAuth(req);
      const result = await vehicleService.listVehicles(req.user.id);
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Body validated by validate(createVehicleSchema) middleware.
  addVehicle: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const result = await vehicleService.addVehicle(req.user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  // Body validated by validate(createVehicleSchema.partial()) middleware.
  updateVehicle: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const vehicleId = parseInt(req.params.id, 10);
      if (isNaN(vehicleId)) throw BadRequest('Invalid vehicle ID', ErrorCode.INVALID_INPUT);
      const result = await vehicleService.updateVehicle(vehicleId, req.user.id, req.body);
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  deleteVehicle: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const vehicleId = parseInt(req.params.id, 10);
      if (isNaN(vehicleId)) throw BadRequest('Invalid vehicle ID', ErrorCode.INVALID_INPUT);
      const result = await vehicleService.deleteVehicle(vehicleId, req.user.id);
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  setDefaultVehicle: async (req: Request, res: Response) => {
    try {
      assertAuth(req);
      const vehicleId = parseInt(req.params.id, 10);
      if (isNaN(vehicleId)) throw BadRequest('Invalid vehicle ID', ErrorCode.INVALID_INPUT);
      const result = await vehicleService.setDefaultVehicle(vehicleId, req.user.id);
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};
