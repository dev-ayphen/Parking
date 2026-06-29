import { userAdminService } from '../userAdmin.service';
import { spaceAdminService } from '../spaceAdmin.service';
import { billingAdminService } from '../billingAdmin.service';
import { adminBookingsService } from './admin.bookings.service';
import { adminNotificationsService } from './admin.notifications.service';
import { adminSupportService } from './admin.support.service';
import { adminAnalyticsService } from './admin.analytics.service';
import { adminComplianceService } from './admin.compliance.service';

// Re-export under the original name so all existing imports are unchanged.
export const adminService = {
  ...userAdminService,
  ...spaceAdminService,
  ...billingAdminService,
  ...adminBookingsService,
  ...adminNotificationsService,
  ...adminSupportService,
  ...adminAnalyticsService,
  ...adminComplianceService,
};
