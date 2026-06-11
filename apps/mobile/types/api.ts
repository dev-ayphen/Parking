/**
 * API response types for ParkSwift mobile.
 * Field names match the Prisma schema exactly.
 * Use these instead of `any` when consuming API responses.
 */

// ─── Base ────────────────────────────────────────────────────────────────────

export interface ApiSuccess {
  success: true;
}

export interface ApiError {
  success: false;
  error: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  photoUrl: string | null;
  isProfileComplete: boolean;
  role: 'PARKER' | 'OWNER' | 'BOTH' | 'ADMIN';
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  createdAt: string;
}

export interface UserResponse extends ApiSuccess {
  user: User;
}

// ─── Vehicle ─────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: number;
  userId: number;
  licensePlate: string;
  vehicleType: 'Car' | 'Bike';
  brandModel: string | null;
  color: string | null;
  isDefault: boolean;
}

export interface VehiclesResponse extends ApiSuccess {
  vehicles: Vehicle[];
}

// ─── Space ───────────────────────────────────────────────────────────────────

export interface Space {
  id: number;
  ownerId: number;
  name: string;
  spaceType: string;
  parkingFor: 'Car' | 'Bike' | 'Both';
  capacity: number;
  address: string;
  landmark: string | null;
  lat: number | null;
  lng: number | null;
  hourlyRate: number;
  dailyRate: number | null;
  monthlyRate: number | null;
  availability: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'BLOCKED';
  rejectionReason: string | null;
  amenities: string[];
  ratingAvg: number | null;
  ratingCount: number;
  availableSpots: number;
  createdAt: string;
}

export interface SpaceResponse extends ApiSuccess {
  space: Space;
}

export interface SpacesResponse extends ApiSuccess {
  spaces: Space[];
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export interface Booking {
  id: string;
  spaceId: number;
  parkerId: number;
  vehicleId: number;
  duration: number;
  eta: string;
  totalAmount: number;
  paymentMode: string;
  status: BookingStatus;
  sessionStartedAt: string | null;
  sessionEndedAt: string | null;
  exitTime: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations (included by API)
  space?: Pick<Space, 'id' | 'name' | 'address' | 'hourlyRate'>;
  vehicle?: Pick<Vehicle, 'id' | 'licensePlate' | 'vehicleType' | 'brandModel'>;
  parker?: Pick<User, 'id' | 'firstName' | 'lastName' | 'phone'>;
  rating?: { rating: number; review: string | null } | null;
}

export interface BookingResponse extends ApiSuccess {
  booking: Booking;
}

export interface BookingsResponse extends ApiSuccess {
  bookings: Booking[];
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking_request'
  | 'booking_approved'
  | 'booking_rejected'
  | 'session_started'
  | 'session_ended'
  | 'payment'
  | 'rating'
  | 'space'
  | 'space_rejected'
  | 'space_approved'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    spaceId?: number;
    spaceName?: string;
    bookingId?: string;
    reason?: string;
  };
}

export interface NotificationsResponse extends ApiSuccess {
  notifications: Notification[];
  unreadCount: number;
}

// ─── User Preferences ────────────────────────────────────────────────────────

export interface UserPreferences {
  pushNotifications: boolean;
  emailNotifications: boolean;
  darkTheme: boolean;
  locationServices: boolean;
}

export interface PreferencesResponse extends ApiSuccess {
  preferences: UserPreferences;
}

// ─── Dashboard / Stats ───────────────────────────────────────────────────────

export interface DashboardStats {
  parker: {
    spotsNearby: number;
    available: number;
  };
  owner: {
    todayEarnings: number;
    activeBookings: number;
    spacesListed: number;
  };
}

export interface StatsResponse extends ApiSuccess {
  stats: DashboardStats;
}

// ─── Support / Tickets ───────────────────────────────────────────────────────

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'RESOLVED'
  | 'CLOSED';

export interface SupportTicket {
  id: number;
  ticketNumber: string;
  subject: string | null;
  category: string;
  description: string;
  status: TicketStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  resolutionNote: string | null;
  rating: number | null;
  ratingComment: string | null;
  createdAt: string;
  closedAt: string | null;
  replies: TicketReply[];
}

export interface TicketReply {
  id: number;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface TicketResponse extends ApiSuccess {
  ticket: SupportTicket;
}

export interface TicketsResponse extends ApiSuccess {
  tickets: SupportTicket[];
}
