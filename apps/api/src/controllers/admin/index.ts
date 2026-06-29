import { adminUsersController } from './admin.users.controller';
import { adminSpacesController } from './admin.spaces.controller';
import { adminPaymentsController } from './admin.payments.controller';
import { adminSupportController } from './admin.support.controller';
import { adminSystemController } from './admin.system.controller';
export { adminStaffController } from './admin.staff.controller';

// Re-export under the original name so admin.routes.ts needs only an import path change.
export const adminController = {
  ...adminUsersController,
  ...adminSpacesController,
  ...adminPaymentsController,
  ...adminSupportController,
  ...adminSystemController,
};
