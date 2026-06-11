import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { authenticate } from '../middleware/auth';
import { uploadVehicleMedia } from '../middleware/upload';

const router = Router();

// All vehicle routes require authentication
router.use(authenticate);

router.get('/', vehicleController.listVehicles);
router.post('/', vehicleController.addVehicle);
router.put('/:id', vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);
router.post('/:id/media', uploadVehicleMedia, vehicleController.uploadMedia);
router.get('/:id/rcbook-url', vehicleController.getRcBookUrl);

export default router;
