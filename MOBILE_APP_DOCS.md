# ParkSwift Mobile App — Complete Reference

## Tech Stack
- **Framework:** React Native + Expo (SDK 56), Expo Router (file-based routing)
- **State:** Zustand (`authStore`, `sessionBarStore`, `networkStore`, `themeStore`)
- **API:** Custom `api` wrapper (`services/api.ts`) with JWT Bearer auth + auto token refresh
- **Realtime:** Socket.IO via `useRealtime` hook — live booking/session updates
- **Storage:** Expo SecureStore (tokens), AsyncStorage (general)
- **Maps:** Leaflet (WebView-based `LeafletMap` component)
- **QR:** `react-native-qrcode-svg` — owner UPI QR display, OTP display
- **Backend URL:** `API_BASE` from `config/api.config.ts` → `http://<local-ip>:3000/api`

---

## All Screens (Route Map)

```
app/
├── _layout.tsx                         Root layout — auth guard + session bar
│
├── (auth)/
│   ├── index.tsx                       Auth entry (redirect to login or home)
│   ├── login.tsx                       Phone number entry
│   ├── verify-otp.tsx                  6-digit OTP verification
│   ├── complete-profile.tsx            Name + email + UPI ID (first login only)
│   ├── terms.tsx                       Terms & Conditions viewer
│   └── privacy.tsx                     Privacy Policy viewer
│
├── (home)/                             Bottom tab group (parker)
│   ├── index.tsx                       Parker home dashboard
│   ├── my-bookings.tsx                 Booking history (Upcoming / Completed / Cancelled)
│   ├── my-incidents.tsx                Parker's filed incidents list
│   ├── my-reports.tsx                  Parker's abuse reports list
│   ├── notifications.tsx               In-app notification inbox
│   ├── recent-activity.tsx             Activity feed
│   ├── profile.tsx                     User profile + photo upload
│   ├── settings.tsx                    App settings (theme, push, account)
│   ├── manage-billing.tsx              Billing name / email / address / GSTIN / UPI ID
│   ├── help-support.tsx                Support hub
│   └── support/
│       ├── faq.tsx                     FAQ articles
│       ├── articles.tsx                Help articles
│       ├── tickets.tsx                 My support tickets list
│       ├── create-ticket.tsx           New support ticket form
│       └── ticket/[id].tsx             Ticket thread view
│
├── (find-space)/                       Parker booking flow
│   ├── index.tsx                       Map + list tab root
│   ├── _components/
│   │   └── FindSpaceMapTab.tsx         Leaflet map with space markers
│   ├── space-detail.tsx                Space info, duration picker, book button
│   ├── space-reviews.tsx               Full review list for a space
│   ├── public-profile.tsx              Owner public profile
│   ├── vehicle-select.tsx              Pick vehicle for booking
│   ├── booking-terms.tsx               Platform T&C acceptance (pre-confirm)
│   ├── booking-confirm.tsx             Final summary + declarations + ETA → POST /bookings
│   ├── booking-success.tsx             Booking created confirmation
│   ├── booking-status.tsx              Live status (PENDING_APPROVAL / APPROVED)
│   ├── active-session.tsx              Full active session screen (all sub-states)
│   ├── session-complete.tsx            Post-session receipt + rating + incident + invoice
│   └── incident-detail.tsx             Single incident report detail
│
├── (my-spaces)/                        Owner section
│   ├── index.tsx                       Owner home dashboard
│   ├── spaces.tsx                      My spaces list
│   ├── active.tsx                      Live active sessions (owner view)
│   ├── booking-request.tsx             Approve / reject incoming booking
│   ├── recent-requests.tsx             Recent booking requests list
│   ├── exit-verification.tsx           Confirm parker exit + finalize amount + rate parker
│   ├── history.tsx                     Earnings history + Download Invoice
│   ├── analytics.tsx                   Space analytics
│   ├── billing-history.tsx             Subscription billing history
│   ├── manage-subscription.tsx         Plan upgrade / downgrade / cancel
│   ├── subscription-plans.tsx          Available plans display
│   └── verify.tsx                      Owner identity verification
│
└── add-space.tsx                       Add new space form (multi-step)
```

---

## Authentication Flow

### Login → OTP → Profile → Home

```
[login.tsx]
  User enters 10-digit phone (Indian, starting 6-9)
  POST /auth/request-otp  { phone: "+91XXXXXXXXXX" }
  → In DEV: devOtp is returned in response and auto-filled
  → Navigate to verify-otp with phone param

[verify-otp.tsx]
  6-box OTP display (hidden TextInput behind visible boxes)
  POST /auth/verify-otp  { phone, otp }
  ← Returns: { token, refreshToken, user, expiresIn }
  → authStore.setSession(token, user, expiresIn, refreshToken)
     • token saved to SecureStore (expo-secure-store)
     • refreshToken saved separately
     • userId saved
  → POST /auth/accept-terms  { termsVersion: "1.0.0", platform }  (if T&C not yet accepted)
  
  Branching:
    • user.isProfileComplete === false → navigate to complete-profile
    • user.isProfileComplete === true  → navigate to (home)
  
  Resend OTP: 30-second cooldown timer, POST /auth/request-otp again

[complete-profile.tsx]
  Mandatory first-time setup — cannot skip (back button = logout)
  Fields: First Name, Last Name, Email, UPI ID (optional)
  PUT /users/me/complete-profile  { firstName, lastName, email, upiId? }
  → authStore.setSession(existingToken, { id, isProfileComplete: true })
  → navigate to (home)
```

### Token Lifecycle
- Access token stored in Expo SecureStore
- On app start: `authStore.hydrate()` reads token + userId from SecureStore, then `refreshProfile()` fetches `/users/me` to populate full user object
- `api.service.ts` auto-refreshes the access token using the refresh token when a 401 is received (silent re-login)
- `resetAuthLostGuard()` ensures only one "session expired" alert is shown

### Credential Storage
| What | Where |
|------|-------|
| JWT access token | Expo SecureStore (`auth_token`) |
| Refresh token | Expo SecureStore (`refresh_token`) |
| User ID | Expo SecureStore (`user_id`) |
| Theme preference | AsyncStorage |

---

## Map & Space Discovery

### Find Space Screen (`(find-space)/index.tsx`)
- Two tabs: **Map** and **List**
- Map tab uses `FindSpaceMapTab.tsx` → renders a `LeafletMap` (WebView + OpenStreetMap tiles)
- Spaces are fetched from `GET /spaces` with filters (location, vehicle type, price)
- Each marker shows space name and price; tap → navigate to space-detail

### Space Detail (`space-detail.tsx`)
- Fetches full space data: `GET /spaces/:id`
- Shows: photos/videos, amenities, hourly rate, capacity, availability, owner info, ratings
- **Risk badge** (LOW/MEDIUM/HIGH) computed from `spaceType` — mirrors backend `RISK_MAP`
- Duration picker: presets [1, 2, 4, 8, 12, 24 hours], max 24h
- **Availability alert**: `POST /spaces/:id/availability-alert/subscribe` (when space is full)
- **Book button** → navigate to vehicle-select

---

## Booking Flow (Parker)

### Step-by-Step

```
[space-detail.tsx]
  Pick duration (hours)
  Tap "Book Now"
  → navigate to vehicle-select

[vehicle-select.tsx]
  GET /vehicles/my  (list user's registered vehicles)
  User picks a vehicle
  → navigate to booking-confirm with params:
    { spaceId, spaceName, address, vehicleId, vehicleRegistration,
      vehicleType, durationHours, pricePerHour, basePrice, totalPrice }

[booking-confirm.tsx]
  Shows: Space details, Vehicle, Duration, Price breakdown
  User must:
    1. Select arrival time (presets: 10min / 20min / 30min / 1hr, or custom minutes)
    2. Accept ALL 5 declarations (checkboxes):
       • Verified surroundings before parking
       • Understand local parking laws apply
       • Accept responsibility for fines/towing
       • ParkSwift only facilitates coordination
       • Agree to Parking T&C
  
  POST /bookings  { spaceId, vehicleId, durationHours, eta }
  → On success: POST /bookings/:id/consent  { ...declarations, platform, appVersion }
  → navigate to booking-success

[booking-success.tsx]
  Shows booking confirmation card
  → navigate to booking-status

[booking-status.tsx]
  GET /bookings/:id  (polls every few seconds OR driven by socket events)
  Shows status: Waiting for Approval / Approved
  Socket events: booking:approved, booking:rejected, booking:cancelled
  
  States:
    • PENDING_APPROVAL → "Waiting for owner to approve"
    • APPROVED → "Booking approved!" → navigate to active-session
    • CANCELLED/REJECTED → show reason
```

### Booking API Endpoints
| Action | Endpoint |
|--------|----------|
| Create booking | `POST /bookings` |
| Record consent | `POST /bookings/:id/consent` |
| Get booking | `GET /bookings/:id` |
| My bookings list | `GET /bookings/my?limit=50&skip=0` |
| Cancel booking | `DELETE /bookings/:id` |

---

## Active Session Flow (Parker)

### Screen: `active-session.tsx`

This is the most complex screen. It has **6 sub-states** driven by `booking.status`, `booking.arrivedAt`, `booking.sessionOtp`, and the `verification` object.

```
Sub-state 0: NOT YET ARRIVED
  Condition: status=APPROVED, no arrivedAt, no sessionOtp
  UI: "Head to the Space" banner + booking details + contact owner buttons
  Actions:
    • "I Have Arrived" → PUT /bookings/:id/arrive  → sets arrivedAt
    • "Cancel Booking" → DELETE /bookings/:id
    • Phone/WhatsApp buttons to call/message owner

Sub-state 1: WAITING FOR CONDITION CHECK
  Condition: status=APPROVED, arrivedAt set, no verification record
  UI: "Owner is checking your vehicle" waiting screen
  Owner's app: they record vehicle condition (NO_CONCERN or PHOTO_VIDEO)
  Parker: waits — screen polls + listens for verification:ready socket event

Sub-state 2a: REQUIRES ACKNOWLEDGEMENT
  Condition: verification exists, parkerAcknowledged=false
  UI: Vehicle Inspection card
    • If NO_CONCERN: green badge "No Existing Damage"
    • If PHOTO_VIDEO: shows photos the owner took, warning banner
  Parker must tap "I Acknowledge" → POST /bookings/:id/verification/acknowledge
  → moves to Sub-state 2b

Sub-state 2b: ARRIVAL OTP
  Condition: verification exists + parkerAcknowledged=true
  UI: Large OTP code display card
  OTP is auto-generated and fetched via GET /bookings/:id/verification
  Parker SHOWS this OTP to the owner
  Owner ENTERS it in their app → starts session → booking becomes ACTIVE

Sub-state 3: ACTIVE SESSION
  Condition: booking.status = ACTIVE
  UI: Live session card with:
    • Space name, vehicle plate, entry time, hourly rate
    • Elapsed time counter
    • UPI QR code (if owner has UPI ID set) + "I've Paid" self-declaration button
    • Phone/WhatsApp contact buttons
    • "I Am Leaving" button
    • "Report Abuse" button (if owner demands cash, threatens, etc.)
  
  "I Am Leaving" → POST /bookings/:id/leaving
    • Sets sessionEndedAt on the booking
    → transitions to Sub-state 3b (leaving)

Sub-state 3b: LEAVING — AWAITING EXIT
  Condition: status=ACTIVE + sessionEndedAt set
  UI: "You've notified the owner you're leaving" banner
  Owner sees this in their active.tsx and goes to exit-verification.tsx
  Parker WAITS for owner to complete the exit
  → When owner calls PUT /bookings/:id/release, booking becomes COMPLETED
  → Socket event session:completed → fetchBooking()
  → navigate to session-complete

Sub-state 4: COMPLETED
  Condition: booking.status = COMPLETED
  → navigate to session-complete
```

### OTP Flow (Detailed)

```
ARRIVAL OTP:
1. Parker taps "I Have Arrived"
   → PUT /bookings/:id/arrive
   → Owner's app sees parker arrived (realtime)

2. Owner checks vehicle condition in their booking-request.tsx
   → POST /bookings/:id/verification  { type: "NO_CONCERN" | "PHOTO_VIDEO", mediaUrls? }

3. Parker's screen shows the condition (Sub-state 2a)
   → Parker taps "I Acknowledge"
   → POST /bookings/:id/verification/acknowledge

4. Backend auto-generates a 4-digit session OTP and stores it on the booking
   (booking.sessionOtp field)

5. Parker's screen shows the OTP in a large display box (Sub-state 2b)
   Parker physically shows OTP to the owner

6. Owner enters OTP in their app (active.tsx → verify OTP modal)
   → POST /bookings/:id/start  { otp }
   → Backend verifies OTP, sets status=ACTIVE, sets sessionStartedAt

7. Both sides get socket event session:started → screens refresh
```

### Payment Recording (UPI QR)
- No money flows through ParkSwift
- If owner has a UPI ID stored (`PUT /users/me/billing` or profile), a QR code is shown in the active session screen (`react-native-qrcode-svg`)
- QR encodes: `upi://pay?pa=<ownerUpiId>&pn=<ownerName>&am=<amount>&cu=INR`
- Parker scans with any UPI app and pays owner directly
- "I've Paid" button → `POST /bookings/:id/mark-paid` → sets `parkerMarkedPaidAt` on booking
- This is a self-declaration — ParkSwift never verifies payment

---

## Exit Flow (Owner Side)

### Screen: `(my-spaces)/exit-verification.tsx`

```
Triggered when parker taps "I Am Leaving" and owner goes to their active session

Screen loads: GET /bookings/:id

Owner sees:
  • Parker name + vehicle plate
  • Entry time (sessionStartedAt)
  • Live duration + estimated amount (calculated locally: Math.round(billableHours * rate))
  • Min billing: 30 minutes minimum
  • UPI QR if they have UPI ID configured
  • Time selector: "Use current time" toggle OR manual HH:MM entry (24hr)
  
Duration calculation:
  - diffMs = exitTime - sessionStartedAt
  - billableHours = max(0.5, diffMins/60)   ← 30-min minimum
  - amount = Math.round(billableHours * hourlyRate)  ← matches backend

Owner taps "Complete Session":
  PUT /bookings/:id/release  { exitTime: ISO string }
  ← Backend: sets status=COMPLETED, sets totalAmount, sets sessionEndedAt
  → Alert "Successfully collected ₹X"
  → Owner rates the parker (modal)
  
After rating:
  POST /ratings  { bookingId, rating (1-5), review }
  → Owner can also Report Parker (PAYMENT_NOT_RECEIVED, LEFT_WITHOUT_PAYING, OTHER)

Race condition handling:
  If parker force-completes ("Owner not responding?") while owner is on this screen:
  → Socket event session:completed → Alert "Already completed" → router.back()
  → If release API called after: /not active|already|completed/ error → treated as success
```

---

## Session Complete Screen (Parker)

### Screen: `(find-space)/session-complete.tsx`

```
Triggered after booking.status = COMPLETED

Fetches: GET /bookings/:id  (includes incidents[], rating)

UI Sections:
1. ✅ Success Header  ("Session Completed")
2. Receipt Card:
   - Space name + address
   - Vehicle plate, entry time, exit time, duration
   - Parking Fee (₹ totalAmount)
   - Payment note: "Paid directly to the space owner"
   - [Download Invoice] button (outlined primary button)
3. Incident Report Card:
   - If already filed: shows reference (INC-XXXXX) + tap to view status
   - If not filed: tap to open incident modal
4. Rating Card:
   - 5-star selector + text review
   - "Done" footer button: saves rating then navigates to (home)
   - "Skip for now": navigates to (home) without rating
```

---

## Invoice Download

### How it works (all three parties)

**Signed Token Flow (security):**
Session JWT is never put in a URL. Instead:
1. Client calls `POST /bookings/:id/invoice-token` (authenticated)
   ← Returns `{ token: "<64-char hex>", expiresIn: 60 }`
   Token is single-use, expires in 60 seconds, stored as SHA-256 hash in Redis
2. Client opens: `GET /bookings/:id/invoice?signed_token=<token>`
   This is on a public router — no auth middleware
   Backend validates + consumes the token from Redis → streams PDF

**Parker (session-complete.tsx + my-bookings.tsx):**
```typescript
const { token: signedToken } = await api.post(`/bookings/${bookingId}/invoice-token`);
const url = `${API_BASE}/bookings/${bookingId}/invoice?signed_token=${signedToken}`;
await Linking.openURL(url);  // opens in device browser / PDF viewer
```

**Owner (history.tsx):**
Same pattern — same signed-token flow.

**Admin (web panel, BookingDetailsModal):**
```typescript
const res = await fetch(`${API_BASE}/bookings/${bookingId}/invoice-token`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${adminToken}` }
});
const { token } = await res.json();
window.open(`${API_BASE}/bookings/${bookingId}/invoice?signed_token=${token}`, '_blank');
```

**PDF Invoice Contents:**
| Field | Value |
|-------|-------|
| Invoice No | `INV-<last 6 chars of booking ID>` |
| Booking ID | `#<last 8 chars>` |
| Parker Name | firstName + lastName (or phone) |
| Space Owner | Owner's name |
| Parking Space | Space name + address |
| Vehicle | Brand/Model + license plate |
| Session Start | sessionStartedAt (formatted) |
| Session End | sessionEndedAt (formatted) |
| Duration | booking.duration hours |
| Payment Method | "Direct Payment to Space Owner" |
| Payment Status | "Confirmed by Owner" (if parkerMarkedPaidAt set) OR "Pending Owner Confirmation" |
| Total Amount | `Rs. X.XX` (no ₹ glyph — PDFKit compatibility) |
| Status color | Green (COMPLETED) / Red (other) |

---

## Billing Details Screen

### Screen: `(home)/manage-billing.tsx`

```
Fetches: GET /users/me/billing
Fields:
  • Billing Name (for invoice)
  • Billing Email
  • Billing Address
  • GSTIN (optional, 15-char Indian GST number, validated by regex)
  • UPI ID (optional, e.g. name@okhdfcbank)
  
Saves: PUT /users/me/billing  { billingName, billingEmail, billingAddress, gstin, upiId }

UPI ID is shared between billing page and profile — same field on User model.
Owners use it for the QR code parkers scan to pay.
Parkers can set it for refund purposes.
```

---

## My Bookings Screen (Parker)

### Screen: `(home)/my-bookings.tsx`

```
Fetches: GET /bookings/my?limit=50&skip=0
Pagination: load more on scroll (skip += 50)
Live refresh: socket events booking:approved, booking:rejected, session:started, session:completed

Three tabs:
  Upcoming  → rawStatus in [PENDING_APPROVAL, APPROVED, ACTIVE]
  Completed → rawStatus = COMPLETED
  Cancelled → rawStatus in [CANCELLED, REJECTED, EXPIRED]

Each card shows:
  Space name, address, price, date, duration, status badge

Tap card:
  • COMPLETED → (find-space)/session-complete
  • Others    → (find-space)/booking-status

COMPLETED cards also show:
  [Download Invoice] button (calls signed-token flow above)
```

---

## Owner Section

### Owner Dashboard: `(my-spaces)/index.tsx`
- `GET /home/owner-dashboard` — earnings summary, live session count, recent requests

### My Spaces: `(my-spaces)/spaces.tsx`
- `GET /spaces/my` — all owner's spaces
- Tap to manage (edit, view analytics, deactivate)

### Active Sessions: `(my-spaces)/active.tsx`
- `GET /home/owner-active` — live sessions on owner's spaces
- Shows: parker name, vehicle, space, start time, elapsed, estimated charge
- UPI QR modal: if owner has no UPI ID → inline modal to add it → `PUT /users/me/billing`
- OTP entry: owner types the parker's OTP → `POST /bookings/:id/start { otp }`
- "Verify Exit" button → navigate to exit-verification

### Booking Requests: `(my-spaces)/booking-request.tsx`
- Shows incoming booking with parker info, vehicle, duration, ETA
- Approve → `PUT /bookings/:id/approve`
- Reject → `PUT /bookings/:id/reject { reason }`
- After approval: owner records vehicle condition:
  → `POST /bookings/:id/verification { type, mediaUrls? }`

### History (Owner): `(my-spaces)/history.tsx`
- `GET /home/owner-history` — earnings (today/week/month) + per-space breakdown + sessions
- Each session card: parker name, space, date, duration, amount, rating
- Download Invoice button on each session (signed-token flow)

### Analytics: `(my-spaces)/analytics.tsx`
- `GET /spaces/:id/analytics` — views, bookings, revenue, ratings breakdown

---

## Subscription System (Owner)

### How it works

Owners pay a subscription to list spaces. Subscription gates how many spaces they can have.

### Plans (`(my-spaces)/subscription-plans.tsx`)
- `GET /subscriptions/plans` — all available plans
- Plans have: name, price (monthly), yearlyPrice, maxSpaces, features (analytics, featured listing, CSV export, priority support)

### Manage Subscription (`(my-spaces)/manage-subscription.tsx`)
- `GET /subscriptions/current` — current plan + status + renewal date + usage
- Shows: current plan card, usage (spaces used / max), available plans grid

Actions:
| Action | Endpoint |
|--------|----------|
| Upgrade plan | `POST /subscriptions/upgrade { planId, billingCycle }` |
| Downgrade plan | `POST /subscriptions/downgrade { planId }` (takes effect at period end) |
| Cancel subscription | `POST /subscriptions/cancel` |
| Toggle auto-renewal | `PUT /subscriptions/auto-renewal { autoRenewal: bool }` |

### Billing History (`(my-spaces)/billing-history.tsx`)
- `GET /subscriptions/billing-history`
- Shows past subscription payments with plan name, amount, date, status

---

## Admin Panel Connection

The mobile app does NOT directly call admin-only endpoints. Instead, admin actions flow through the shared booking/user APIs. Here's what the admin panel controls that affects the mobile app:

| Admin Action | Mobile Effect |
|-------------|---------------|
| Admin approves/rejects a space | Space appears/disappears in map search |
| Admin force-cancels a booking | Parker/owner sees CANCELLED status |
| Admin resolves a dispute | Incident status updates in incident-detail.tsx |
| Admin bans a user | User gets 403 on next API call → forced logout |
| Admin sends in-app notification | Appears in notifications.tsx inbox |
| Admin changes subscription plans | Plan list updates in subscription-plans.tsx |
| Admin issues refund | Tracked separately; no mobile refund flow yet |

### What mobile sends to admin:
- Incident reports (`POST /incidents`)
- Abuse reports (`POST /abuse`)
- Support tickets (`POST /support/tickets`)
- Booking consent (`POST /bookings/:id/consent`)
- All of these are visible in the admin panel

---

## Realtime (Socket.IO)

Socket connects when app is open and authenticated. All events are handled via `useRealtime` hook.

| Event | Fired by | Handled in |
|-------|----------|-----------|
| `booking:approved` | Owner approves | booking-status.tsx, my-bookings.tsx |
| `booking:rejected` | Owner rejects | booking-status.tsx |
| `booking:cancelled` | Admin/system | active-session.tsx |
| `verification:ready` | Owner records condition | active-session.tsx |
| `session:started` | Owner enters OTP | active-session.tsx |
| `session:completed` | Owner releases | active-session.tsx, exit-verification.tsx |
| `space:available` | Slot freed | availability alert |
| `notification:new` | Admin/system | notifications.tsx, my-bookings.tsx |
| `app:resumed` | App foreground | active-session.tsx (re-fetches) |

**Limitation:** Socket only works while app is open. Push notifications (FCM/APNs) are deferred — not yet implemented. Polling fallback (every 8s) covers the gap in active-session.tsx.

---

## Session Bar

A persistent sticky bar shown at the top of all tabs when a session is in progress.

**Store:** `sessionBarStore.ts`
**Variants:**
| Variant | When shown |
|---------|-----------|
| `arrived_otp_ready` | APPROVED, parker acknowledged condition |
| `session_active` | ACTIVE, > 15 min remaining |
| `session_ending` | ACTIVE, < 15 min to booked end |
| `session_leaving` | ACTIVE, parker tapped "I Am Leaving" |
| `rating_pending` | COMPLETED, no rating yet |

The bar is suppressed on the exit-verification screen (owner) to avoid overlap.

---

## Support Flow

```
(home)/help-support.tsx
  → FAQ / Articles → read-only viewers
  → My Tickets → (home)/support/tickets.tsx
  
Create Ticket:
  POST /support/tickets  { subject, message, category }
  
Ticket Thread:
  GET /support/tickets/:id
  POST /support/tickets/:id/reply  { message }
  Admin replies appear in the same thread
```

---

## Key API Endpoints Summary

### Auth
- `POST /auth/request-otp` — send OTP
- `POST /auth/verify-otp` — verify OTP → get token
- `POST /auth/accept-terms` — record T&C version acceptance
- `POST /auth/refresh` — refresh access token

### User / Profile
- `GET /users/me` — get own profile
- `PUT /users/me/complete-profile` — first-time profile setup
- `PUT /users/me/profile` — update name/email
- `PUT /users/me/photo` — upload profile photo
- `GET /users/me/billing` — get billing details
- `PUT /users/me/billing` — save billing details (name/email/address/GSTIN/UPI ID)
- `DELETE /users/me` — soft-delete account

### Spaces
- `GET /spaces` — search/list spaces (map + list)
- `GET /spaces/:id` — full space detail
- `GET /spaces/my` — owner's spaces
- `POST /spaces` — add new space
- `GET /spaces/:id/analytics` — space analytics
- `POST /spaces/:id/availability-alert/subscribe`

### Bookings
- `POST /bookings` — create booking
- `GET /bookings/my` — my bookings (paginated)
- `GET /bookings/:id` — single booking
- `DELETE /bookings/:id` — cancel booking
- `PUT /bookings/:id/approve` — owner approves
- `PUT /bookings/:id/reject` — owner rejects
- `PUT /bookings/:id/arrive` — parker marks arrived
- `POST /bookings/:id/verification` — owner records vehicle condition
- `POST /bookings/:id/verification/acknowledge` — parker acknowledges
- `POST /bookings/:id/start` — owner enters OTP to start session
- `POST /bookings/:id/leaving` — parker signals leaving
- `PUT /bookings/:id/release` — owner completes exit + finalizes amount
- `POST /bookings/:id/mark-paid` — parker self-declares payment
- `POST /bookings/:id/consent` — record booking declarations
- `POST /bookings/:id/invoice-token` — get signed 60s download token
- `GET /bookings/:id/invoice` — stream PDF invoice (public, uses signed_token)

### Ratings
- `POST /ratings` — submit rating (auto-detects parker→owner or owner→parker)
- `GET /ratings/space/:id` — space reviews

### Subscriptions
- `GET /subscriptions/plans` — available plans
- `GET /subscriptions/current` — current plan + usage
- `POST /subscriptions/upgrade`
- `POST /subscriptions/downgrade`
- `POST /subscriptions/cancel`
- `PUT /subscriptions/auto-renewal`
- `GET /subscriptions/billing-history`

### Support / Incidents
- `POST /incidents` — file incident report
- `GET /incidents/:id` — incident detail
- `POST /abuse` — report abuse
- `POST /support/tickets`
- `GET /support/tickets`
- `GET /support/tickets/:id`
- `POST /support/tickets/:id/reply`

---

## Data Flow: Booking → Payment → Invoice

```
1. Parker books space
   POST /bookings → booking created with status=PENDING_APPROVAL

2. Owner approves
   PUT /bookings/:id/approve → status=APPROVED

3. Parker arrives, condition checked, OTP exchanged
   → status=ACTIVE, sessionStartedAt set

4. Parker pays owner DIRECTLY (cash or UPI QR)
   No payment gateway — ParkSwift never touches money
   Parker taps "I've Paid" → POST /bookings/:id/mark-paid
   → parkerMarkedPaidAt = now  (self-declaration only)

5. Owner confirms exit
   PUT /bookings/:id/release { exitTime }
   Backend calculates:
     actualDuration = exitTime - sessionStartedAt
     billableHours = max(0.5, actualDuration in hours)  ← 30-min minimum
     totalAmount = Math.round(billableHours * hourlyRate)
   → status=COMPLETED, totalAmount set, sessionEndedAt set

6. Invoice available
   POST /bookings/:id/invoice-token → signed 60s token
   GET /bookings/:id/invoice?signed_token=X → PDF streamed

   PDF shows:
   • "Payment Method: Direct Payment to Space Owner"
   • "Payment Status: Confirmed by Owner" (if parkerMarkedPaidAt set)
                     OR "Pending Owner Confirmation" (if not)
   • Total Amount: Rs. X.XX
   • No GST (platform does not collect tax)
```
