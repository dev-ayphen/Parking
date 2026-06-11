export interface AdminUser {
  id: number;
  usrId: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string | null;
  type: string;
  status: string;
  rawStatus: string;
  rating: number | null;
  joined: string;
}

export interface UserDetails {
  id: number;
  usrId: string;
  name: string;
  email: string | null;
  phone: string;
  photoUrl: string | null;
  role: string;
  type: string;
  status: string;
  suspendReason: string | null;
  suspendedAt: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
  bannedAt: string | null;
  isProfileComplete: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  stats: {
    totalBookings: number;
    totalSpaces: number;
    totalVehicles: number;
    averageRating: number;
    ratingCount: number;
    totalSpent: number;
  };
  spaces: Array<{ id: number; name: string; status: string; hourlyRate: number }>;
  vehicles: Array<{ id: number; brandModel: string; licensePlate: string; vehicleType: string; frontPhotoUrl?: string | null; sidePhotoUrl?: string | null }>;
  recentBookings: Array<{ id: string; space: string; status: string; amount: number; date: string }>;
  subscriptions: Array<{ id: number; planName: string | null; price: number; status: string; renewalDate: string }>;
}
