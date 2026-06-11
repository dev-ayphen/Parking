import { Request, Response } from 'express';
import { sendError } from '../utils/errors';

export const configController = {
  /** GET /config/space-types — returns all space types with their required documents and risk levels */
  getSpaceTypes: async (req: Request, res: Response) => {
    try {
      const spaceTypes = [
        { type: 'Independent House', docs: ['EB Bill', 'Property Tax'], risk: 'LOW', icon: 'Home' },
        { type: 'Rented House', docs: ['Rental Agreement', 'EB Bill'], risk: 'LOW', icon: 'Home' },
        { type: 'Apartment Owner Slot', docs: ['Property Tax', 'Society NOC'], risk: 'MEDIUM', icon: 'Building2' },
        { type: 'Apartment Tenant Slot', docs: ['Rental Agreement', 'Society Permission'], risk: 'MEDIUM', icon: 'Building2' },
        { type: 'Gated Villa', docs: ['Property Tax', 'Gate Pass'], risk: 'LOW', icon: 'Castle' },
        { type: 'Shop Front Parking', docs: ['Shop Lease', 'Business License'], risk: 'HIGH', icon: 'Store' },
        { type: 'Office Parking', docs: ['Office Registration', 'Lease Agreement'], risk: 'MEDIUM', icon: 'Building' },
        { type: 'Vacant Private Land', docs: ['Land Document', 'Ownership Proof'], risk: 'HIGH', icon: 'Zap' },
        { type: 'Inside Compound', docs: ['Compound Agreement', 'Proof of Residence'], risk: 'MEDIUM', icon: 'Shield' },
        { type: 'Open Frontage Area', docs: ['Municipal Permission', 'Area Document'], risk: 'HIGH', icon: 'MapPin' },
      ];
      res.json({ success: true, spaceTypes });
    } catch (error) {
      sendError(res, error);
    }
  },

  /** GET /config/support-categories — returns support ticket categories and priorities */
  getSupportConfig: async (req: Request, res: Response) => {
    try {
      const categories = [
        { label: 'Booking Issue', value: 'BOOKING', color: 'info' },
        { label: 'Subscription Issue', value: 'SUBSCRIPTION', color: 'success' },
        { label: 'Space Owner Support', value: 'SPACE_OWNER', color: 'warning' },
        { label: 'Technical Problem', value: 'TECHNICAL', color: 'error' },
        { label: 'Account Help', value: 'ACCOUNT', color: 'purple' },
        { label: 'Other', value: 'OTHER', color: 'gray' },
      ];
      const priorities = [
        { label: 'Low', value: 'LOW' },
        { label: 'Normal', value: 'NORMAL' },
        { label: 'High', value: 'HIGH' },
        { label: 'Urgent', value: 'URGENT' },
      ];
      res.json({ success: true, categories, priorities });
    } catch (error) {
      sendError(res, error);
    }
  },

  /** GET /config/booking-statuses — returns booking status display mappings */
  getBookingStatusConfig: async (req: Request, res: Response) => {
    try {
      const statusMap = {
        PENDING_APPROVAL: 'Upcoming',
        APPROVED: 'Upcoming',
        ACTIVE: 'Upcoming',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
        REJECTED: 'Cancelled',
        EXPIRED: 'Cancelled',
      };
      const statusBadge = {
        PENDING_APPROVAL: { label: 'Waiting for approval', color: 'warning' },
        APPROVED: { label: 'Approved', color: 'success' },
        ACTIVE: { label: 'Active session', color: 'activeBlue' },
        COMPLETED: { label: 'Completed', color: 'gray' },
        CANCELLED: { label: 'Cancelled', color: 'error' },
        REJECTED: { label: 'Rejected', color: 'error' },
        EXPIRED: { label: 'Expired', color: 'gray' },
      };
      res.json({ success: true, statusMap, statusBadge });
    } catch (error) {
      sendError(res, error);
    }
  },
};
