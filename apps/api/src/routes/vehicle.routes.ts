import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/auth';
import { uploadVehicleMedia, verifyUploadSignature } from '../middleware/upload';

const router = Router();

// All vehicle routes require authentication
router.use(authenticate);

router.get('/', vehicleController.listVehicles);
router.post('/', vehicleController.addVehicle);
router.put('/:id', vehicleController.updateVehicle);
router.put('/:id/default', vehicleController.setDefaultVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.post('/:id/media', uploadVehicleMedia, verifyUploadSignature, vehicleController.uploadMedia);
router.get('/:id/rcbook-url', vehicleController.getRcBookUrl);

export default router;
