export interface Space {
  id: number;
  name: string;
  spaceType: string;
  parkingFor: string;
  capacity: number;
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  hourlyRate: string;
  availability: string;
  amenities?: string[];
  visibility?: string;
  docType: string;
  frontPhoto: boolean;
  areaPhoto?: boolean;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  owner: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}
