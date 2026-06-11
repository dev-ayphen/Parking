# Quick Start Guide - Space Approval System

## 🚀 30-Second Overview

```
OWNER (Mobile)          →  SUBMIT SPACE  →  ADMIN (Web)  →  APPROVE  →  PARKER (Mobile)
Fills form              POST /spaces         Reviews          PATCH        Sees space
(4 steps)               Status: PENDING      Pending          /approve     in search
                        Status: PENDING      spaces           Status:      Find Parking
                                            Clicks            VERIFIED     Now
                                            Approve
```

---

## 📱 Mobile: Owner Submits Space

### Files Involved
- `apps/mobile/app/(my-spaces)/index.tsx` - Add Space form (4 steps)
- `apps/mobile/src/services/api.ts` - API calls

### Steps
1. **Open mobile app** → Go to **My Spaces** tab
2. **Click "+" button** → Starts Add Space wizard
3. **Fill Step 1** → Basic Details (name, type, parking for, capacity, price, availability, amenities, visibility)
4. **Fill Step 2** → Location (search + map, gets address)
5. **Fill Step 3** → Photos & Documents (upload photo + document type)
6. **Fill Step 4** → Review & Confirm (checkbox + submit)
7. **Click "Submit Space"**
   ```
   POST /api/spaces
   ├─ spaceName, spaceType, parkingFor, capacity
   ├─ address, landmark, latitude, longitude
   ├─ hourlyPrice, availability, amenities
   ├─ frontPhoto, areaPhoto, visibility
   ├─ docType, confirmed
   └─ Authorization: Bearer {token}
   ```
8. **✅ Response**: Space created with `status: PENDING`
9. **Alert**: "Submitted for verification. 24-48 hours."

---

## 🖥️ Web: Admin Reviews & Approves

### Files Involved
- `apps/web/src/app/spaces/page.tsx` - Spaces management page
- `apps/web/src/services/api.ts` - API client

### Steps
1. **Open** → http://localhost:3002
2. **Login**
   ```
   Email: admin@gmail.com
   Password: admin
   ```
3. **Click "Spaces"** in sidebar
4. **Filter** → "Pending Review" (optional)
5. **See pending spaces** with yellow badge
   ```
   GET /api/spaces?status=PENDING
   └─ Returns all spaces awaiting approval
   ```
6. **Review space details** → Location, capacity, owner, etc.
7. **Click "Approve"**
   ```
   PATCH /api/spaces/{id}/approve
   ├─ Updates space status: PENDING → VERIFIED
   └─ Authorization: Bearer {token}
   ```
8. **✅ Alert**: "Space approved successfully!"
9. **Refresh list** → Space now shows with green badge "Approved"

### Alternative: Reject Space
1. **Click "Reject"**
2. **Enter reason** (optional popup)
   ```
   PATCH /api/spaces/{id}/reject
   ├─ body: { reason: "Missing documents" }
   └─ Updates status: PENDING → REJECTED
   ```
3. **✅ Alert**: "Space rejected successfully!"

---

## 🔄 Parker: Finds & Books Approved Space

### Files Involved
- `apps/mobile/app/(find-space)/index.tsx` - Find Parking page

### Automatic (No Code Changes Needed)
- When Parker clicks **"Find Parking Now"**
- Mobile calls: `GET /api/spaces/search`
- Backend **automatically filters** for `status: VERIFIED` only
- Parker sees **only approved spaces** on map and list
- Parker can book the space

---

## 🔗 API Endpoints Added

| Endpoint | Method | Purpose | Who |
|----------|--------|---------|-----|
| `/spaces` | `GET` | Get all spaces (with filters) | Admin |
| `/spaces/:id/approve` | `PATCH` | Approve a space | Admin |
| `/spaces/:id/reject` | `PATCH` | Reject a space | Admin |

---

## 📊 Database Status Values

```
PENDING
  ├─ Yellow badge
  ├─ Visible only to owner in "My Spaces"
  ├─ Hidden from parkers
  └─ Not bookable

VERIFIED ✅
  ├─ Green badge
  ├─ Visible to owner in "My Spaces"
  ├─ Visible to parkers in "Find Parking Now"
  └─ Bookable

REJECTED ❌
  ├─ Red badge
  ├─ Visible only to owner in "My Spaces"
  ├─ Hidden from parkers
  └─ Not bookable
```

---

## 🧪 Quick Test (5 minutes)

### Terminal 1: Backend
```bash
cd apps/api && pnpm dev
# ✓ Running on http://localhost:3000
```

### Terminal 2: Web Admin
```bash
cd apps/web && pnpm dev
# ✓ Running on http://localhost:3002
```

### Terminal 3: Mobile
```bash
cd apps/mobile && npx expo start
# Scan QR or press 'i'
```

### Test Flow
1. **Mobile**: Submit space (2 min)
   - Click "+", fill form, click "Submit"
   - See success alert
   
2. **Web**: Approve space (2 min)
   - Open http://localhost:3002
   - Login (admin@gmail.com / admin)
   - Click Spaces → See pending → Click Approve
   
3. **Mobile**: Verify approval (1 min)
   - Go to My Spaces → See green VERIFIED badge
   - Go to Find Parking Now → See space appears

---

## 🔐 Authentication

All API calls need JWT token in header:
```
Authorization: Bearer {jwt_token}
```

Token automatically added by:
- **Web**: Axios interceptor in `services/api.ts`
- **Mobile**: Fetch wrapper in `services/api.ts`
- **Stored in**: 
  - Web: localStorage (Zustand persist)
  - Mobile: AsyncStorage

---

## ⚡ What Happens Behind The Scenes

### Mobile → Backend
```javascript
// User fills form + clicks Submit
const payload = {
  spaceName: "My Parking",
  spaceType: "Apartment",
  // ... all fields
};

// Send to API
POST /api/spaces (with JWT token)
```

### Backend Processing
```javascript
// Validate against Zod schema
createSpaceSchema.parse(data)

// Create in database
db.space.create({
  ownerId: userId,
  status: 'PENDING',
  // ... all fields
})

// Return 201 Created
```

### Web Admin → Backend
```javascript
// Admin clicks Approve button
PATCH /api/spaces/1/approve (with JWT token)
```

### Backend Processing
```javascript
// Update in database
db.space.update({
  where: { id: 1 },
  data: { status: 'VERIFIED' }
})

// Return 200 OK
```

### Parker → Backend
```javascript
// Parker searches
GET /api/spaces/search
```

### Backend Processing
```javascript
// Automatically filters
db.space.findMany({
  where: {
    status: 'VERIFIED',  // ← Only approved
    // ... search filters
  }
})

// Returns only VERIFIED spaces
```

---

## 📝 Code Files Reference

### Backend Changes
- `apps/api/src/routes/space.routes.ts` - New routes
- `apps/api/src/controllers/space.controller.ts` - New handlers
- `apps/api/src/services/space.service.ts` - New queries

### Web Changes
- `apps/web/src/services/api.ts` - New API client
- `apps/web/src/app/spaces/page.tsx` - Real data + buttons

### Mobile Changes
- `apps/mobile/src/services/api.ts` - New API client

---

## ❓ FAQs

**Q: Do I need to change the mobile form?**
A: No! The form submission is already integrated. Just test with real API.

**Q: What if I want to reject a space?**
A: Click "Reject" button, optionally enter reason, space gets REJECTED status.

**Q: Can owner edit a rejected space?**
A: Not yet (future feature). Currently, they need to submit a new space.

**Q: How long does approval take?**
A: Instant in development. In production, admin reviews and clicks approve.

**Q: What if network fails during submission?**
A: Try/catch in code handles errors, shows alert to user.

**Q: Can multiple admins exist?**
A: Yes! Hardcoded for now (admin@gmail.com), but structure supports more.

---

## 🎯 What's Complete

✅ 4-step space submission (mobile)
✅ Space creation API
✅ Admin dashboard (web)
✅ Approve/Reject API
✅ Status filtering
✅ Real-time updates
✅ Error handling
✅ Loading states

---

## 🔮 What's Next

🔲 Email notifications
🔲 Batch actions
🔲 Analytics
🔲 Audit trail
🔲 Advanced filtering
🔲 Bulk rejection

---

## 🆘 Common Issues

| Error | Fix |
|-------|-----|
| **501 GET /spaces** | Update routes file, restart backend |
| **401 Unauthorized** | Token missing, login again |
| **Empty spaces list** | Backend not running, check URL |
| **Approve button doesn't work** | Ensure status is PENDING, refresh page |

---

## 📚 Full Documentation

- `SPACE_APPROVAL_FLOW.md` - Complete workflow with diagrams
- `ARCHITECTURE.md` - System architecture
- `IMPLEMENTATION_SUMMARY.md` - What was implemented

---

**Last Updated**: May 2026
**Status**: ✅ Ready for Testing
**Time to Test**: ~5 minutes

🚀 **Go ahead and test it!**
