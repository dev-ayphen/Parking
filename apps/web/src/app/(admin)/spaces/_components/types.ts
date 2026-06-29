export interface AdminSpace {
  id: number;
  name: string;
  spaceType: string;
  address: string;
  landmark: string | null;
  capacity: number;
  hourlyRate: number;
  status: string;
  requiresAdminReview?: boolean;
  bookingsCount: number;
  ratingAvg: number;
  ratingCount: number;
  owner: { id: number; name: string; phone: string; email: string | null } | null;
  createdAt: string;
  parkingFor?: string;
  dailyRate?: number | null;
  monthlyRate?: number | null;
  availability?: string;
  startTime?: string | null;
  endTime?: string | null;
  amenities?: string[];
  visibility?: string | null;
  docType?: string | null;
  latitude?: number;
  longitude?: number;
  ownerConsent?: {
    acceptOwnerResponsibility: boolean;
    acceptLegalCompliance: boolean;
    acceptNonViolationDeclaration: boolean;
    acceptedAt: string;
  } | null;
}

export interface SpaceDocument {
  id: number;
  spaceId: number;
  documentType: string;
  documentLabel: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number | null;
  status: string;
  verifiedAt: string | null;
  verifiedById: number | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface DocCompliance {
  compliant: boolean;
  missingDocs: string[];
  rule: { spaceType: string; riskLevel: string; requiresAdminReview: boolean; note: string } | null;
}

export interface Tally {
  all: number;
  pending: number;
  verified: number;
  rejected: number;
  blocked: number;
}
