# PARKSWIFT - COMPLETE FINAL TECH STACK

**Version:** v1.1 Final (All Fixes Applied)  
**Status:** ✅ LOCKED - NO MORE CHANGES  
**Cost:** $7-40/month  
**Setup Time:** 6-8 hours  
**Build Time:** 6 weeks  

---

## 📱 MOBILE APP (React Native + Expo)

### Core Framework
| Technology | Purpose |
|-----------|---------|
| React Native + Expo | Cross-platform mobile (iOS & Android) |
| Expo Router | File-based routing |

### Styling & UI
| Technology | Purpose |
|-----------|---------|
| NativeWind | Tailwind for React Native |
| @gorhom/bottom-sheet | Bottom sheet modals |
| react-native-reanimated | 60 FPS animations |
| react-native-toast-message | Toast notifications |

### State Management
| Technology | Purpose |
|-----------|---------|
| Zustand | Global state management |

### API Communication
| Technology | Purpose |
|-----------|---------|
| Axios | REST API calls |
| Socket.IO Client | Real-time (booking, chat, session updates) |

### Maps & Location
| Technology | Purpose |
|-----------|---------|
| react-native-maps | Map UI rendering |
| OpenStreetMap | Free map tiles |
| OSRM | Routing & directions |
| Expo Location | GPS tracking |
| Nominatim | Geocoding (address search) |

### Authentication & OTP
| Technology | Purpose |
|-----------|---------|
| MSG91 | OTP delivery & verification |

### Push Notifications
| Technology | Purpose |
|-----------|---------|
| Firebase FCM | Send notifications (backend) |
| expo-notifications | Receive notifications (app) |
| Firebase Crashlytics | Crash analytics |

### Forms & Validation
| Technology | Purpose |
|-----------|---------|
| React Hook Form | Form state management |
| Zod | Input validation |
| @hookform/resolvers | Integration |

### Media Handling
| Technology | Purpose |
|-----------|---------|
| Expo Image Picker | Pick images/videos |
| expo-image-manipulator | Compress images |
| Video Strategy | Limit 30sec, upload raw, compress server-side |

### Local Storage
| Technology | Purpose |
|-----------|---------|
| AsyncStorage | Store app data |
| Expo SecureStore | Store JWT tokens (encrypted) |
| Supabase Storage | Cloud storage for photos/videos |

### Payments
| Technology | Purpose |
|-----------|---------|
| None (direct) | **Parking fees** — Parker pays owner outside app (Cash/GPay/PhonePe/Paytm) |
| Razorpay React Native | **Owner subscriptions only** — In-app payment for space listing plans |

### Utilities
| Technology | Purpose |
|-----------|---------|
| date-fns | Date formatting |
| uuid | Generate unique IDs |

---

## 💻 BACKEND (Node.js + Express)

### Core Framework
| Technology | Purpose |
|-----------|---------|
| Node.js (18 LTS+) | JavaScript runtime |
| Express.js | Web server framework |

### Database
| Technology | Purpose |
|-----------|---------|
| PostgreSQL (15+) | Database (Supabase hosted) |
| Prisma ORM | Database access layer |

### Authentication
| Technology | Purpose |
|-----------|---------|
| jsonwebtoken | JWT tokens (7 day expiry) |
| MSG91 | OTP generation & verification |

### Validation
| Technology | Purpose |
|-----------|---------|
| Zod | Input validation |

### Real-Time Communication
| Technology | Purpose |
|-----------|---------|
| Socket.IO | Real-time (booking status, chat, session updates) |

### File Upload
| Technology | Purpose |
|-----------|---------|
| Multer | File upload middleware |

### Notifications
| Technology | Purpose |
|-----------|---------|
| Firebase Admin SDK | Send push notifications |

### Security
| Technology | Purpose |
|-----------|---------|
| helmet | Security HTTP headers |
| cors | Cross-origin resource sharing |
| express-rate-limit | Prevent OTP spam attacks |

### External Services
| Technology | Purpose |
|-----------|---------|
| Axios | HTTP calls (MSG91, external services) |
| Firebase Admin SDK | Push notifications |

### Development
| Technology | Purpose |
|-----------|---------|
| Nodemon | Auto-restart on file changes |

---

## 🌐 WEB ADMIN (Next.js + React)

### Core Framework
| Technology | Purpose |
|-----------|---------|
| Next.js (14.0.0+) | React framework with SSR |
| React (18.2.0+) | UI library |

### Styling
| Technology | Purpose |
|-----------|---------|
| Tailwind CSS | Utility-first CSS |
| shadcn/ui | Pre-built components |

### State Management
| Technology | Purpose |
|-----------|---------|
| Zustand | Global state |

### API Communication
| Technology | Purpose |
|-----------|---------|
| Axios | HTTP requests |
| Socket.IO Client | Real-time updates |

### Forms & Validation
| Technology | Purpose |
|-----------|---------|
| React Hook Form | Form state |
| Zod | Validation |

### Data Visualization
| Technology | Purpose |
|-----------|---------|
| Recharts | Charts & analytics |

### Utilities
| Technology | Purpose |
|-----------|---------|
| date-fns | Date formatting |
| classnames | CSS utilities |

---

## 🗄️ DATABASE

| Component | Specification |
|-----------|---------------|
| Database | PostgreSQL 15+ (Supabase hosted) |
| ORM | Prisma |
| Tier | FREE first → $25/month for production |
| Storage | Supabase Storage (included) |

---

## 🗺️ MAPS & ROUTING (100% FREE)

| Component | Provider | Cost |
|-----------|----------|------|
| Map UI | react-native-maps | FREE |
| Map Tiles | OpenStreetMap | FREE |
| Routing | OSRM | FREE |
| Geocoding | Nominatim | FREE |

**Total Maps Cost: $0 (forever)**

---

## 💳 EXTERNAL SERVICES

| Service | Provider | Cost |
|---------|----------|------|
| Parking Payments | Direct (no gateway) | FREE — no transaction fees |
| Owner Subscriptions | Razorpay | 2% per subscription transaction |
| SMS/OTP | MSG91 | ₹0.50 per SMS |
| Push Notifications | Firebase FCM | FREE |
| File Storage | Supabase Storage | FREE → $25/month |
| Crash Analytics | Firebase Crashlytics | FREE |

---

## 🏗️ INFRASTRUCTURE

| Component | Provider | Cost |
|-----------|----------|------|
| Backend Hosting | Render | $7/month |
| Database | Supabase | FREE → $25/month |
| Admin Hosting | Vercel | FREE |
| Maps | OpenStreetMap + OSRM | FREE |
| Parking Payments | Direct (no gateway) | FREE |
| Owner Subscriptions | Razorpay | 2% per transaction |
| SMS | MSG91 | ₹0.50/SMS |

---

## 💰 COST BREAKDOWN

### MVP Phase
```
Supabase:      FREE
Render:        $7/month
Vercel:        FREE
Firebase:      FREE
Maps:          FREE
Parking fees:  FREE (direct between users)
Subscriptions: Razorpay 2% per transaction (only when owner subscribes)
MSG91:         ₹0.50/SMS
───────────────────────
TOTAL:         $7-30/month
```

### Production Phase (Real Users)
```
Supabase:      $25/month
Render:        $7-15/month
Vercel:        FREE
Firebase:      FREE
Maps:          FREE
Parking fees:  FREE (direct between users)
Subscriptions: Razorpay 2% per transaction
MSG91:         ₹0.50/SMS
───────────────────────
TOTAL:         $40/month
```

---

## 📦 NPM PACKAGES

### Mobile (25 packages)
```
nativewind
expo-router
zustand
axios
socket.io-client
@gorhom/bottom-sheet
react-native-toast-message
react-native-reanimated
react-native-gesture-handler
react-hook-form
zod
@hookform/resolvers
firebase
expo-notifications
expo-image-picker
expo-image-manipulator
expo-file-system
@react-native-async-storage/async-storage
razorpay-react-native     # subscription payments only (NOT for parking fees)
expo-location
react-native-maps
date-fns
uuid
```

### Backend (13 packages)
```
express
@prisma/client
dotenv
helmet
cors
jsonwebtoken
joi
socket.io
axios
multer
firebase-admin
express-rate-limit
nodemon (dev)
```

### Web Admin (10 packages)
```
zustand
axios
socket.io-client
react-hook-form
zod
@hookform/resolvers
recharts
date-fns
classnames
```

---

## 📁 FOLDER STRUCTURE

### Mobile App
```
ParkSwift/
├── app/                    # Expo Router screens
├── components/             # Reusable components
├── services/              # API calls
├── store/                 # Zustand stores
├── hooks/                 # Custom hooks
├── types/                 # TypeScript types
├── utils/                 # Utilities
├── config/                # Configuration
└── package.json
```

### Backend
```
parkswift-backend/
├── src/
│   ├── modules/           # Feature modules
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic
│   ├── prisma/            # Database
│   ├── utils/             # Utilities
│   ├── types/             # Types
│   ├── config/            # Configuration
│   └── index.ts           # Entry point
└── package.json
```

### Web Admin
```
admin/
├── app/                   # Next.js routes
├── components/            # React components
├── services/             # API calls
├── store/                # Zustand stores
├── types/                # Types
├── utils/                # Utilities
└── package.json
```

---

## ⚡ SOCKET.IO USAGE RULES

### USE Socket.IO FOR (Real-Time Critical)
```
✅ Booking confirmed
✅ Parking started
✅ Parking ended
✅ Payment alerts
✅ Chat messages
✅ Session updates
✅ Live notifications
```

### DO NOT USE Socket.IO FOR
```
❌ Map updates
❌ Normal API calls
❌ UI refresh
❌ Profile updates
❌ Search results
```

---

## 🔒 STORAGE USAGE

### AsyncStorage
- App preferences
- Cache data
- Non-sensitive info

### Expo SecureStore
- JWT tokens
- Refresh tokens
- Sensitive keys

### Supabase Storage
- User photos
- Space photos
- Vehicle documents
- Condition photos
- Video files

---

## 🔐 SECURITY IMPLEMENTATION

| Layer | Technology |
|-------|-----------|
| HTTP Headers | helmet |
| CORS | cors middleware |
| Rate Limiting | express-rate-limit |
| JWT Auth | jsonwebtoken |
| Token Storage | Expo SecureStore |
| Input Validation | Zod + Joi |
| SSL/TLS | Vercel + Render (auto) |

---

## 📊 SUMMARY

| Metric | Value |
|--------|-------|
| Mobile Packages | 25 |
| Backend Packages | 13 |
| Web Packages | 10 |
| Total Packages | 48 |
| MVP Cost | $7-30/month |
| Production Cost | $40/month |
| Setup Time | 6-8 hours |
| Build Time | 6 weeks |
| Maps Cost | $0 (forever) |
| Database (MVP) | FREE |
| Database (Prod) | $25/month |

---

## ✅ FINAL ARCHITECTURE

```
Mobile App (Expo)
    ↓
Express API (Node.js)
    ↓
PostgreSQL (Supabase)
    ↓
Supabase Storage (files)
    ↓
Firebase (push notifications)
    ↓
Socket.IO (real-time)
    ↓
MSG91 (SMS/OTP)
    ↓
OpenStreetMap + OSRM (maps)
    ↓
Web Admin (Next.js)
```

---

## 🚀 TECH STACK (ONE LINE)

```
React Native (Expo) + NativeWind + Zustand + Axios + Socket.IO 
+ react-native-maps + OpenStreetMap + OSRM + Supabase 
+ Node.js + Express + PostgreSQL + Firebase + Razorpay (subscriptions) + MSG91
```

---

## ✅ STATUS

**Version:** v1.1 Final  
**Status:** LOCKED - NO MORE CHANGES  
**Production Ready:** ✅ YES  
**Scalable:** ✅ YES  
**Cost Effective:** ✅ YES  

---

**Ready to build!** 🚀

