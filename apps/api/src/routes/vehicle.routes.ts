import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/auth';
import { uploadVehicleMedia, verifyUploadSignature } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { createVehicleSchema } from '../validations/vehicle.validation';

const router = Router();

// All vehicle routes require authentication
router.use(authenticate);

router.get('/', vehicleController.listVehicles);
router.post('/', validate(createVehicleSchema), vehicleController.addVehicle);
router.put('/:id', validate(createVehicleSchema.partial()), vehicleController.updateVehicle);
router.put('/:id/default', vehicleController.setDefaultVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.post('/:id/media', uploadVehicleMedia, verifyUploadSignature, vehicleController.uploadMedia);
router.get('/:id/rcbook-url', vehicleController.getRcBookUrl);

export default router;
