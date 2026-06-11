import { db } from '../config/database';
import { CreateVehicleInput } from '../validations/vehicle.validation';
import { storageService } from './storage.service';
import { BUCKETS } from '../config/supabase';

type VehicleFile = { buffer: Buffer; originalname: string; mimetype: string };

export const vehicleService = {
  /**
   * Upload vehicle media: front/side photos → public bucket (display);
   * RC book → private bucket (sensitive doc, stored as a key for signing).
   */
  uploadMedia: async (
    vehicleId: number,
    userId: number,
    files: { frontPhoto?: VehicleFile; sidePhoto?: VehicleFile; rcBook?: VehicleFile }
  ) => {
    const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!vehicle) throw { status: 403, message: 'Vehicle not found or access denied' };

    const folder = `vehicles/${vehicleId}`;
    const data: Record<string, string> = {};

    if (files.frontPhoto) {
      const s = await storageService.uploadPublic({ buffer: files.frontPhoto.buffer, originalName: files.frontPhoto.originalname, mimeType: files.frontPhoto.mimetype, folder });
      if (s.url) data.frontPhotoUrl = s.url;
    }
    if (files.sidePhoto) {
      const s = await storageService.uploadPublic({ buffer: files.sidePhoto.buffer, originalName: files.sidePhoto.originalname, mimeType: files.sidePhoto.mimetype, folder });
      if (s.url) data.sidePhotoUrl = s.url;
    }
    if (files.rcBook) {
      // RC book is a private document → store the object KEY (resolve to signed URL on read).
      const s = await storageService.uploadPrivate({ buffer: files.rcBook.buffer, originalName: files.rcBook.originalname, mimeType: files.rcBook.mimetype, folder });
      data.rcBookUrl = s.key;
    }

    if (Object.keys(data).length === 0) throw { status: 400, message: 'No media files provided' };

    const updated = await db.vehicle.update({
      where: { id: vehicleId },
      data,
      select: { id: true, frontPhotoUrl: true, sidePhotoUrl: true, rcBookUrl: true },
    });

    // Return a signed URL for the RC book so the client can display it immediately.
    const rcBookUrl = updated.rcBookUrl
      ? await storageService.resolveUrl(updated.rcBookUrl, BUCKETS.PRIVATE).catch(() => null)
      : null;

    return { success: true, vehicle: { ...updated, rcBookUrl } };
  },

  listVehicles: async (userId: number) => {
    if (!userId || userId === 0) {
      throw new Error('User ID is required');
    }

    const vehicles = await db.vehicle.findMany({
      where: { userId },
      select: {
        id: true,
        brandModel: true,
        licensePlate: true,
        vehicleType: true,
        capacity: true,
        ownershipType: true,
        frontPhotoUrl: true,
        sidePhotoUrl: true,
        rcBookUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: vehicles,
      count: vehicles.length,
    };
  },

  addVehicle: async (userId: number, data: CreateVehicleInput) => {
    if (!userId || userId === 0) {
      throw new Error('User ID is required');
    }

    // Check if license plate already exists (globally unique)
    const existingVehicle = await db.vehicle.findFirst({
      where: {
        licensePlate: data.licensePlate.toUpperCase(),
      },
    });

    if (existingVehicle) {
      throw new Error('Vehicle with this license plate already exists');
    }

    const newVehicle = await db.vehicle.create({
      data: {
        userId,
        brandModel: data.brandModel,
        licensePlate: data.licensePlate.toUpperCase(),
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        ownershipType: data.ownershipType,
        frontPhotoUrl: data.frontPhotoUrl || null,
        sidePhotoUrl: data.sidePhotoUrl || null,
        rcBookUrl: data.rcBookUrl || null,
      },
      select: {
        id: true,
        brandModel: true,
        licensePlate: true,
        vehicleType: true,
        capacity: true,
        ownershipType: true,
        frontPhotoUrl: true,
        sidePhotoUrl: true,
        rcBookUrl: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: 'Vehicle added successfully',
      data: newVehicle,
    };
  },

  updateVehicle: async (vehicleId: number, data: Partial<CreateVehicleInput>) => {
    if (!vehicleId) {
      throw new Error('Vehicle ID is required');
    }

    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // If updating license plate, check for duplicates (excluding self)
    if (data.licensePlate) {
      const existingVehicle = await db.vehicle.findFirst({
        where: {
          licensePlate: data.licensePlate.toUpperCase(),
          id: { not: vehicleId },
        },
      });

      if (existingVehicle) {
        throw new Error('Vehicle with this license plate already exists');
      }
    }

    const updateData: any = {};
    if (data.brandModel) updateData.brandModel = data.brandModel;
    if (data.licensePlate) updateData.licensePlate = data.licensePlate.toUpperCase();
    if (data.vehicleType) updateData.vehicleType = data.vehicleType;
    if (data.capacity) updateData.capacity = data.capacity;
    if (data.ownershipType) updateData.ownershipType = data.ownershipType;
    if (data.frontPhotoUrl !== undefined) updateData.frontPhotoUrl = data.frontPhotoUrl;
    if (data.sidePhotoUrl !== undefined) updateData.sidePhotoUrl = data.sidePhotoUrl;
    if (data.rcBookUrl !== undefined) updateData.rcBookUrl = data.rcBookUrl;

    const updatedVehicle = await db.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
      select: {
        id: true,
        brandModel: true,
        licensePlate: true,
        vehicleType: true,
        capacity: true,
        ownershipType: true,
        frontPhotoUrl: true,
        sidePhotoUrl: true,
        rcBookUrl: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      message: 'Vehicle updated successfully',
      data: updatedVehicle,
    };
  },

  deleteVehicle: async (vehicleId: number) => {
    if (!vehicleId) {
      throw new Error('Vehicle ID is required');
    }

    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    await db.vehicle.delete({
      where: { id: vehicleId },
    });

    return {
      success: true,
      message: 'Vehicle deleted successfully',
      data: { id: vehicleId },
    };
  },
};
