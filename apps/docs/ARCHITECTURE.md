# ParkSwift Platform Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PARKSWIFT PLATFORM                           │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   MOBILE APP         │    │   WEB ADMIN          │    │   PARKER/OWNER APP  │
│  (React Native)      │    │   (Next.js)          │    │   (React Native)    │
├──────────────────────┤    ├──────────────────────┤    ├─────────────────────┤
│ • Auth               │    │ • Login              │    │ • Search Spaces     │
│ • Add Space (4-step) │    │ • Dashboard          │    │ • Book Parking      │
│ • My Spaces (List)   │    │ • Spaces (Verify)    │    │ • Bookings          │
│ • Find Parking       │    │ • Bookings           │    │ • Payments          │
│ • Bookings           │    │ • Users              │    │ • My Bookings       │
│ • Profile            │    │ • Analytics          │    │ • Reviews           │
│                      │    │ • Settings           │    │                     │
└──────────┬───────────┘    └──────────┬───────────┘    └────────────┬────────┘
           │                           │                             │
           └───────────────────────────┼─────────────────────────────┘
                                       │
                            ┌──────────▼──────────┐
                            │   JWT AUTH TOKEN    │
                            │  (AsyncStorage)     │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
          ┌──────────────────────────────────────────────────────┐
          │          EXPRESS.JS API SERVER                       │
          │        (http://localhost:3000)                       │
          ├──────────────────────────────────────────────────────┤
          │ Routes:                                              │
          │ • POST   /auth/request-otp                           │
          │ • POST   /auth/verify-otp                            │
          │ • POST   /spaces (create) [AUTH]                     │
          │ • GET    /spaces?status=PENDING [AUTH] ← ADMIN       │
          │ • PATCH  /spaces/:id/approve [AUTH] ← ADMIN         │
          │ • PATCH  /spaces/:id/reject [AUTH] ← ADMIN          │
          │ • GET    /spaces/search (parker search)              │
          │ • GET    /spaces/:id                                 │
          │ • PUT    /spaces/:id (edit) [AUTH]                   │
          │ • DELETE /spaces/:id [AUTH]                          │
          │ • POST   /bookings (create booking)                  │
          │ • GET    /users/me [AUTH]                            │
          │ • PUT    /users/me/complete-profile [AUTH]           │
          └──────────────────────────────────────────────────────┘
                            │       │       │
                  ┌─────────┼───────┼───────┼─────────┐
                  │         │       │       │         │
                  ▼         ▼       ▼       ▼         ▼
              ┌─────────────────────────────────────────────┐
              │    PRISMA ORM                              │
              │  (Database Client)                         │
              └────────────────┬────────────────────────────┘
                               │
                               ▼
                  ┌────────────────────────────┐
                  │  PostgreSQL Database       │
                  │  parkswift_dev             │
                  ├────────────────────────────┤
                  │ Tables:                    │
                  │ • users                    │
                  │ • spaces                   │
                  │ • bookings                 │
                  │ • reviews                  │
                  │ • sessions                 │
                  │ • parkerProfile            │
                  │ • ownerProfile             │
                  └────────────────────────────┘
```

---

## 🔄 Space Approval Workflow

```
┌────────────────────────────────────────────────────────────────┐
│                    SPACE APPROVAL FLOW                          │
└────────────────────────────────────────────────────────────────┘

MOBILE (Owner)              SERVER              WEB (Admin)
      │                        │                     │
      │  1. Fill Form (4 steps)                      │
      │  (Basic, Location,     │                     │
      │   Photos, Review)      │                     │
      │                        │                     │
      ├───POST /spaces────────►│                     │
      │    (+ JWT token)       │                     │
      │                        │  2. Validate        │
      │                        │  3. Create Space    │
      │                        │     (status:        │
      │                        │      PENDING)       │
      │                        │                     │
      │◄──201 Created──────────┤                     │
      │  {space: {...},        │                     │
      │   status: PENDING}     │                     │
      │                        │                     │
      │  4. Show Alert         │                     │
      │  "Submitted for        │                     │
      │   verification"        │                     │
      │                        │                     │
      │  5. Refresh My Spaces  │                     │
      │     Shows PENDING      │                     │
      │     badge              │                     │
      │                        │                     │
      │                        │                     │
      │                        │  6. Admin logs in   │
      │                        │     admin@gmail    │
      │                        │     admin          │
      │                        │                     │
      │                        │    7. Click Spaces │
      │                        │       in sidebar   │
      │                        │                     │
      │                        ├─GET /spaces?status=PENDING
      │                        │     (+ JWT token)  │
      │                        │                     │
      │                        │◄──200 OK───────────┤
      │                        │  [{space details}] │
      │                        │                     │
      │                        │    8. Review space │
      │                        │       details      │
      │                        │                     │
      │                        │    9. Click Approve│
      │                        │       or Reject    │
      │                        │                     │
      │                        │◄─PATCH /spaces/:id/approve
      │                        │     (+ JWT token)  │
      │                        │                     │
      │                        ├─Update DB─────────►│
      │                        │  status: VERIFIED  │
      │                        │                     │
      │                        │       10. UI shows │
      │                        │          success   │
      │                        │                     │
      │  11. Refresh My Spaces │                    │
      │      Shows VERIFIED ✅ │                    │
      │      badge            │                    │
      │                        │                    │
      │  12. Space visible in  │                    │
      │      Find Parking ►    │                    │
      │      (for parkers)     │                    │
      │                        │                    │
      └────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

```
ADD SPACE (Mobile Owner)
┌──────────────────────────────────────────┐
│  Step 1: Basic Details                   │
│  - Space Name                            │
│  - Space Type (7 options)                │
│  - Parking For (Car/Bike/Both)          │
│  - Capacity (1-10)                       │
│  - Hourly Price                          │
│  - Availability (24H/Custom/Weekdays)   │
│  - Amenities (CCTV, Security, etc)      │
│  - Space Visibility                      │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  Step 2: Location                        │
│  - Search location (Nominatim API)       │
│  - Pick on Map                           │
│  - Full Address (auto-filled)            │
│  - Landmark (optional)                   │
│  - GPS coordinates                       │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  Step 3: Photos & Documents              │
│  - Front View Photo (required) ✓         │
│  - Parking Area Photo (optional)         │
│  - Document Type (4 options)             │
│  - Document Upload                       │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  Step 4: Review & Confirm                │
│  - Summary of all details                │
│  - Authorization checkbox                │
│  - Submit button                         │
└──────────────────────────────────────────┘
                  │
                  ▼
           POST /api/spaces
                  │
                  ▼
          ┌───────────────────┐
          │  Validate (Zod)   │
          └───────────────────┘
                  │
                  ▼
          ┌──────────────────────────────┐
          │  Create in Database          │
          │  - status: PENDING           │
          │  - ownerId: {userId}         │
          │  - All field data            │
          └──────────────────────────────┘
                  │
                  ▼
          ┌──────────────────────────────┐
          │  Return 201 Created          │
          │  + Space object              │
          └──────────────────────────────┘
                  │
                  ▼
          Alert: "Submitted for 
          verification 24-48 hrs"
```

---

## 🔐 Authentication & Authorization

```
LOGIN FLOW
┌─────────────────────────────────────────┐
│  Mobile / Web Login                     │
│  Email: admin@gmail.com (web)           │
│  Password: admin                        │
└─────────────────────────────────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ POST /auth/login    │
    │ (hardcoded in web)  │
    └─────────────────────┘
              │
              ▼
    ┌─────────────────────────────┐
    │  Create JWT Token           │
    │  sub: userId                │
    │  email: userEmail           │
    │  role: admin|owner|parker   │
    │  Signed with JWT_SECRET     │
    └─────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │ Return token + user data     │
    │                              │
    │ {                            │
    │   token: "eyJhbGc...",       │
    │   user: {                    │
    │     id: 1,                   │
    │     email: "...",            │
    │     role: "admin"            │
    │   }                          │
    │ }                            │
    └──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │  Store Locally               │
    │  Mobile: AsyncStorage        │
    │  Web: Zustand + localStorage │
    └──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │  Every API Request           │
    │  Headers: {                  │
    │   'Authorization': 'Bearer   │
    │   {token}'                   │
    │  }                           │
    └──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │  Auth Middleware Validates   │
    │  - Verify JWT signature      │
    │  - Check expiration          │
    │  - Extract userId            │
    │  - Attach to req.user        │
    └──────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────┐
    │  Proceed with request        │
    │  or return 401 Unauthorized  │
    └──────────────────────────────┘
```

---

## 🛠️ Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile** | React Native + Expo | Cross-platform mobile app |
| **Web** | Next.js + React + Tailwind | Admin dashboard |
| **Backend** | Express.js + Node.js | API server |
| **Database** | PostgreSQL + Prisma | Data persistence |
| **Auth** | JWT | Token-based authentication |
| **Forms** | React Hook Form + Zod | Form handling & validation |
| **State** | Zustand (web), useState (mobile) | State management |
| **Icons** | Lucide React | UI icons |
| **Maps** | react-native-maps + Nominatim | Location services |
| **HTTP** | Axios (web), Fetch (mobile) | HTTP client |

---

## 📦 Database Schema - Key Tables

```sql
-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR UNIQUE,
  firstName VARCHAR,
  lastName VARCHAR,
  role ENUM('parker', 'owner', 'admin'),
  isProfileComplete BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Spaces (Parking Spaces)
CREATE TABLE spaces (
  id SERIAL PRIMARY KEY,
  ownerId INTEGER FOREIGN KEY REFERENCES users(id),
  name VARCHAR NOT NULL,
  spaceType VARCHAR NOT NULL,
  address VARCHAR NOT NULL,
  lat DECIMAL,
  lng DECIMAL,
  capacity INTEGER,
  hourlyRate DECIMAL,
  availability VARCHAR,
  amenities JSON ARRAY,
  visibility VARCHAR,
  docType VARCHAR,
  status ENUM('PENDING', 'VERIFIED', 'REJECTED'),
  rejectionReason VARCHAR,
  frontPhotoUrl VARCHAR,
  areaPhotoUrl VARCHAR,
  docPhotoUrl VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  spaceId INTEGER FOREIGN KEY REFERENCES spaces(id),
  parkerId INTEGER FOREIGN KEY REFERENCES users(id),
  status ENUM('PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'COMPLETED'),
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP NOT NULL,
  totalAmount DECIMAL,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Deployment

```
Production Architecture
┌──────────────────────────────────────────────────────┐
│                                                      │
│  MOBILE APP ──────┐                                  │
│  (App Store/      │                                  │
│   Play Store)     │                                  │
│                   │    ┌────────────────┐            │
│  WEB ADMIN ───────┼───►│  API Server    │            │
│  (Vercel/        │    │  (AWS/Heroku)  │            │
│   Netlify)        │    │                │            │
│                   │    │  Express.js    │            │
│                   │    │  + Node.js     │            │
│                   │    └────────┬───────┘            │
│                   │             │                    │
│                   │             ▼                    │
│                   │    ┌────────────────┐            │
│                   │    │  PostgreSQL    │            │
│                   │    │  Database      │            │
│                   │    │  (AWS RDS)     │            │
│                   │    └────────────────┘            │
│                   │                                  │
│                   │    ┌────────────────┐            │
│                   └───►│ Redis Cache    │            │
│                        │ (Optional)     │            │
│                        └────────────────┘            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

**Last Updated**: May 2026
**Maintained By**: Development Team
**Version**: 1.0.0
