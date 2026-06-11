# Web App API Structure

## 📁 Folder Organization

```
apps/web/src/
├── services/
│   └── api.ts                    # API client & endpoints
│
├── types/
│   ├── auth.ts                   # Authentication types
│   └── space.ts                  # Space entity types
│
├── components/
│   ├── Sidebar.tsx               # Left navigation
│   ├── ProtectedRoute.tsx        # Route protection
│   ├── SpaceCard.tsx             # Space card component
│   └── SpaceDetailsModal.tsx     # Space details modal
│
├── store/
│   └── authStore.ts              # Zustand auth store
│
└── app/
    ├── login/
    │   └── page.tsx              # Login page
    ├── dashboard/
    │   ├── layout.tsx            # Dashboard layout
    │   └── page.tsx              # Dashboard home
    ├── spaces/
    │   └── page.tsx              # Spaces management
    └── ...
```

---

## 🔗 API Service Layer

**File**: `apps/web/src/services/api.ts`

### Configuration
```typescript
// Axios instance with JWT auth
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Auto-adds JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Space API Methods
```typescript
spaceApi.getAllSpaces(filters)    // GET /spaces?status=PENDING
spaceApi.approveSpace(spaceId)    // PATCH /spaces/:id/approve
spaceApi.rejectSpace(id, reason)  // PATCH /spaces/:id/reject
spaceApi.getSpace(spaceId)        // GET /spaces/:id
```

---

## 📦 Type System

**File**: `apps/web/src/types/space.ts`

```typescript
export interface Space {
  // Identifiers
  id: number;
  
  // Basic Info
  name: string;
  spaceType: string;
  parkingFor: string;
  capacity: number;
  
  // Location
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  
  // Pricing
  hourlyRate: string;
  availability: string;
  
  // Features
  amenities?: string[];
  visibility?: string;
  
  // Documents
  docType: string;
  frontPhoto: boolean;
  areaPhoto?: boolean;
  
  // Status
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  
  // Ownership
  owner: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 🎨 Component Structure

### SpaceCard
**File**: `apps/web/src/components/SpaceCard.tsx`

Props:
```typescript
interface SpaceCardProps {
  space: Space;                    // Space data
  onView: (space: Space) => void;  // View details callback
  onApprove: (id: number) => void; // Approve callback
  onReject: (id: number) => void;  // Reject callback
  isApproving?: boolean;           // Approval loading state
  isRejecting?: boolean;           // Rejection loading state
}
```

Features:
- Displays space summary (name, type, address, capacity, price)
- Shows owner information
- Shows status badge (PENDING/VERIFIED/REJECTED)
- Action buttons for approve/reject (if PENDING)
- View details button

### SpaceDetailsModal
**File**: `apps/web/src/components/SpaceDetailsModal.tsx`

Props:
```typescript
interface SpaceDetailsModalProps {
  space: Space | null;       // Full space data
  isOpen: boolean;           // Modal open state
  onClose: () => void;       // Close callback
}
```

Features:
- Shows all space details in organized sections
- 8 sections: Basic Info, Location, Pricing, Amenities, Visibility, Documents, Owner, Status
- Displays all data submitted by owner
- Modal with scroll support
- Close button

---

## 🔄 Data Flow

### 1. Fetch Spaces
```
SpacesPage Component
  ↓
  useEffect (on mount/filter change)
  ↓
  fetchSpaces()
  ↓
  spaceApi.getAllSpaces(filters)
  ↓
  HTTP GET /api/spaces?status=PENDING
  ↓
  API returns spaces array
  ↓
  SpaceCard components rendered for each space
```

### 2. View Space Details
```
User clicks "View Details" on SpaceCard
  ↓
  onView callback fired
  ↓
  setSelectedSpace(space)
  ↓
  SpaceDetailsModal renders with space data
```

### 3. Approve Space
```
User clicks "Approve" button on SpaceCard
  ↓
  handleApprove(spaceId) called
  ↓
  spaceApi.approveSpace(spaceId)
  ↓
  HTTP PATCH /api/spaces/:id/approve
  ↓
  Backend updates: status PENDING → VERIFIED
  ↓
  Frontend updates local state
  ↓
  Space card re-renders with new status
  ↓
  Alert: "✅ Space approved successfully!"
```

### 4. Reject Space
```
User clicks "Reject" button on SpaceCard
  ↓
  handleReject(spaceId) called
  ↓
  prompt("Enter rejection reason")
  ↓
  If user enters reason or confirms empty
    ↓
    spaceApi.rejectSpace(spaceId, reason)
    ↓
    HTTP PATCH /api/spaces/:id/reject { reason }
    ↓
    Backend updates: status PENDING → REJECTED
    ↓
    Frontend updates local state
    ↓
    Space card re-renders with new status
    ↓
    Alert: "❌ Space rejected successfully!"
```

---

## 🎯 Tech Stack Adherence

### What Web Uses
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS (utility-first)
- **State**: Zustand (auth store) + React hooks
- **HTTP**: Axios with interceptors
- **Validation**: Zod + React Hook Form
- **Icons**: Text/Emoji (not lucide-react)
- **Type Safety**: TypeScript

### What Mobile Uses (Different!)
- **Framework**: React Native + Expo
- **Styling**: StyleSheet (not Tailwind)
- **State**: useState + Zustand
- **HTTP**: Fetch API (not Axios)
- **Icons**: Lucide React Native
- **Validation**: Same Zod

---

## 📝 API Response Format

### getAllSpaces Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Downtown Parking",
      "spaceType": "Apartment",
      "parkingFor": "Car",
      "capacity": 5,
      "address": "123 Main St",
      "landmark": "Near market",
      "lat": 13.0827,
      "lng": 80.2707,
      "hourlyRate": "10",
      "availability": "24 Hours",
      "amenities": ["CCTV", "Security"],
      "visibility": "Private",
      "docType": "EB Bill",
      "frontPhotoUrl": "...",
      "areaPhotoUrl": "...",
      "status": "PENDING",
      "owner": {
        "id": 1,
        "firstName": "Raj",
        "lastName": "Kumar",
        "email": "raj@example.com"
      },
      "createdAt": "2026-05-25T..."
    }
  ]
}
```

### Approve/Reject Response
```json
{
  "success": true,
  "message": "Space approved successfully",
  "space": {
    "id": 1,
    "status": "VERIFIED"
  }
}
```

---

## ✨ Features

✅ **Clean Component Structure**
- Reusable SpaceCard component
- SpaceDetailsModal for full data display
- Separate concerns (API, types, components)

✅ **Proper Data Flow**
- Fetch → Display → Interact → Update
- Loading states
- Error handling

✅ **Type Safety**
- All data typed with TypeScript
- API responses mapped to types
- No `any` types

✅ **User Experience**
- Filter by status
- View full space details before approval
- Confirmation for rejection with reason
- Success/error alerts
- Empty state messages

---

## 🚀 Next Steps

1. ✅ Component structure created
2. ✅ API service properly organized
3. ✅ Types defined
4. ✅ Data mapping from API response to UI
5. 🔄 Test with real data from backend
6. 📊 Add more pages (Bookings, Users, Analytics)

---

**Tech Stack Match**: Web uses Tailwind + Next.js, Mobile uses StyleSheet + React Native. Each appropriately.
