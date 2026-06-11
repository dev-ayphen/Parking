# Space Approval Workflow - Mobile & Web Integration

## 📋 Overview

The space approval workflow connects the mobile app (owner adds space) with the web admin dashboard (admin reviews and approves). This document explains the complete flow.

---

## 🔄 Complete Workflow

### **Step 1: Mobile App - Owner Submits Space**

**File**: `apps/mobile/app/(my-spaces)/index.tsx` (lines 287-335)

1. Owner fills out 4-step form:
   - **Step 1**: Basic Details (name, type, parking for, capacity, price, availability, amenities, visibility)
   - **Step 2**: Location (address, landmark, GPS coordinates)
   - **Step 3**: Photos & Documents (front photo, area photo, document type)
   - **Step 4**: Review & Confirm (summary + checkbox)

2. On final "Submit Space" button click:
   ```javascript
   POST /api/spaces
   {
     spaceName, spaceType, parkingFor, capacity,
     address, landmark, latitude, longitude,
     hourlyPrice, availability, amenities,
     frontPhoto, areaPhoto, visibility, docType, confirmed
   }
   ```

3. Backend response:
   ```json
   {
     "success": true,
     "message": "Space created successfully. Verification in progress.",
     "space": {
       "id": 1,
       "status": "PENDING",
       "createdAt": "2026-05-25T..."
     }
   }
   ```

4. Mobile shows alert: **"Your parking space has been submitted for verification. We will review it within 24-48 hours."**

---

### **Step 2: Web Admin - Reviews Pending Spaces**

**File**: `apps/web/src/app/spaces/page.tsx`

1. Admin logs in with:
   - Email: `admin@gmail.com`
   - Password: `admin`

2. Admin navigates to **Spaces** in sidebar

3. Web app calls API:
   ```javascript
   GET /api/spaces?status=PENDING
   ```

4. Backend returns all pending spaces:
   ```json
   {
     "success": true,
     "data": [
       {
         "id": 1,
         "name": "Downtown Parking A",
         "spaceType": "Apartment",
         "address": "123 Main St, Chennai",
         "capacity": 5,
         "hourlyRate": "10",
         "status": "PENDING",
         "owner": {
           "firstName": "Raj",
           "lastName": "Kumar",
           "email": "raj@example.com"
         }
       }
     ]
   }
   ```

5. Admin reviews space details and clicks **Approve** or **Reject**

---

### **Step 3: Web Admin - Approves/Rejects Space**

#### **Approve Flow**
```javascript
PATCH /api/spaces/{spaceId}/approve
```

Backend updates space:
```sql
UPDATE spaces SET status = 'VERIFIED' WHERE id = {spaceId}
```

Response:
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

#### **Reject Flow**
```javascript
PATCH /api/spaces/{spaceId}/reject
{
  "reason": "Missing required documents"
}
```

Backend updates space:
```sql
UPDATE spaces SET status = 'REJECTED', rejectionReason = '...' WHERE id = {spaceId}
```

---

### **Step 4: Mobile App - Owner Sees Approval Status**

**File**: `apps/mobile/app/(my-spaces)/index.tsx` (renderSpacesView)

After approval, space appears in **My Spaces** with status badge:
- ✅ **VERIFIED** (green) - Space is approved and live
- ❌ **REJECTED** (red) - Need to resubmit
- ⏳ **PENDING** (yellow) - Waiting for admin review

---

### **Step 5: Parker - Sees Space in Find Parking**

**File**: `apps/mobile/app/(find-space)/index.tsx`

When parker clicks "Find Parking Now":

1. Mobile calls:
   ```javascript
   GET /api/spaces/search?lat={}&lng={}&radius=5
   ```

2. Backend returns only **VERIFIED** spaces (see: `searchSpaces` in `space.service.ts` line 17)

3. Parker sees approved spaces on map and list view

4. Parker can book the space

---

## 🔌 API Endpoints

### **Space Management**

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/spaces` | ✅ | Owner submits new space |
| `GET` | `/spaces?status=PENDING` | ✅ | Admin gets pending spaces |
| `GET` | `/spaces/search` | ❌ | Parker searches spaces |
| `GET` | `/spaces/:id` | ❌ | Get space details |
| `PATCH` | `/spaces/:id/approve` | ✅ | Admin approves space |
| `PATCH` | `/spaces/:id/reject` | ✅ | Admin rejects space |
| `PUT` | `/spaces/:id` | ✅ | Owner updates space |
| `DELETE` | `/spaces/:id` | ✅ | Owner deletes space |

---

## 📁 Files Modified/Created

### **Backend (Express API)**
- ✅ `apps/api/src/routes/space.routes.ts` - Added approve/reject endpoints
- ✅ `apps/api/src/controllers/space.controller.ts` - Added getAllSpaces, approveSpace, rejectSpace
- ✅ `apps/api/src/services/space.service.ts` - Added getAllSpaces, updateSpaceStatus

### **Web Admin Dashboard**
- ✅ `apps/web/src/services/api.ts` - API client for web
- ✅ `apps/web/src/app/spaces/page.tsx` - Connected to real API, added approve/reject UI

### **Mobile App**
- ✅ `apps/mobile/src/services/api.ts` - API client for mobile
- ✅ `apps/mobile/app/(my-spaces)/index.tsx` - Already has submission logic (ready to show approved spaces)
- ✅ `apps/mobile/app/(find-space)/index.tsx` - Uses search API (only shows VERIFIED spaces)

---

## 🧪 Testing the Complete Flow

### **Prerequisites**
- Backend API running on `http://localhost:3000`
- Web admin dashboard running on `http://localhost:3002`
- Mobile app running in Expo

### **Step-by-Step Test**

#### **1. Start Backend**
```bash
cd apps/api
pnpm dev
# Server running on http://localhost:3000
```

#### **2. Start Web Admin**
```bash
cd apps/web
pnpm dev
# Running on http://localhost:3002
```

#### **3. Mobile: Submit Space**
1. Open mobile app
2. Go to **My Spaces** tab
3. Click **"+" (Add Space)** FAB
4. Fill all 4 steps
5. Click **"Submit Space"** on final review page
6. Check console/API logs - should see `POST /api/spaces` call

#### **4. Web Admin: Approve Space**
1. Open http://localhost:3002
2. Login with:
   - Email: `admin@gmail.com`
   - Password: `admin`
3. Go to **Spaces** in sidebar
4. See pending space appears (with yellow badge)
5. Click **Approve** button
6. Check API logs - should see `PATCH /api/spaces/{id}/approve`

#### **5. Mobile: Check Approval**
1. Refresh **My Spaces** list
2. Submitted space now shows with ✅ **VERIFIED** badge
3. Space is now visible in **Find Parking Now** for other users

---

## 🔐 Authentication

Both web and mobile use JWT tokens:

```javascript
// Request
Headers: {
  'Authorization': 'Bearer {jwt_token}'
}
```

Tokens are stored in:
- **Mobile**: `AsyncStorage` (secure storage)
- **Web**: Zustand store with localStorage persistence

---

## 📊 Database Schema

```sql
Space {
  id: Int
  ownerId: Int          -- Links to User
  name: String          -- "Downtown Parking A"
  spaceType: String     -- "Apartment" | "Office" | ...
  address: String       -- Full address from step 2
  lat: Float
  lng: Float
  capacity: Int         -- Number of slots
  hourlyRate: String    -- "10" | "15" etc
  availability: String  -- "24 Hours" | "Custom Hours"
  amenities: String[]   -- ["CCTV", "Security"]
  visibility: String    -- "Private" | "Shared" | "Roadside"
  docType: String       -- "EB Bill" | "Rental Agreement"
  status: String        -- "PENDING" | "VERIFIED" | "REJECTED"
  rejectionReason: String (optional)
  frontPhotoUrl: String (optional)
  areaPhotoUrl: String (optional)
  docPhotoUrl: String (optional)
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## ✅ Status Values

| Status | Meaning | Owner Sees | Parker Sees |
|--------|---------|-----------|------------|
| `PENDING` | Waiting for admin review | ⏳ Yellow badge | ❌ Hidden |
| `VERIFIED` | Approved by admin | ✅ Green badge | ✅ Visible |
| `REJECTED` | Rejected by admin | ❌ Red badge | ❌ Hidden |

---

## 🚀 Future Enhancements

1. **Email Notifications**: Send owner email when space is approved/rejected
2. **Admin Dashboard Stats**: Show pending count, approval rate, etc.
3. **Batch Actions**: Approve multiple spaces at once
4. **Verification Notes**: Admin can add custom notes during review
5. **Audit Trail**: Log who approved/rejected and when
6. **Auto-approval**: Auto-approve spaces meeting certain criteria
7. **Re-submission**: Allow owner to re-submit rejected spaces with corrections

---

## 🐛 Troubleshooting

### **Web Admin: Spaces page shows empty**
- Check backend is running: `curl http://localhost:3000/api/health`
- Check token is set in Zustand store
- Check network tab for failed requests
- Verify auth middleware is working

### **Mobile: Space submission fails**
- Check backend is running
- Check token is in AsyncStorage
- Check payload matches validation schema
- Check network connectivity

### **Approval button not working**
- Ensure space status is "PENDING"
- Check API logs for errors
- Verify token is still valid
- Try refreshing page/app

---

## 📞 Support

For issues or questions:
1. Check API logs: `tail -f logs/api.log`
2. Check browser DevTools Network tab
3. Check Expo logs: `npx expo logs`
4. Check database directly if needed
