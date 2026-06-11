# PARKSWIFT - COMPLETE FLOW
## Parker Side + Space Owner Side - Full Requirements

---

## 📌 CRITICAL REQUIREMENTS

### Chat & Call Rules:
```
❌ BEFORE Owner Accepts:
   └─ NO chat or call options visible

✅ AFTER Owner Accepts:
   ├─ Chat & Call options appear for BOTH
   ├─ Parker sees owner details
   ├─ Owner sees parker details
   └─ Direct communication enabled
```

### Subscription Rules:
```
❌ If NOT SUBSCRIBED:
   ├─ Can't add new spaces
   ├─ Can manage existing spaces (if any)
   ├─ Red banner on dashboard
   └─ [Subscribe Now] button prominent

✅ If SUBSCRIBED:
   ├─ Full access to add spaces
   ├─ Manage & delete spaces
   ├─ Green badge showing active subscription
   └─ Plan details visible (Basic ₹499/mo, Pro ₹999/mo, Annual ₹4999/yr)
```

### Subscription Payment Flow (Razorpay — Owner Only):
```
Owner taps [Subscribe Now]
   ↓
Plans Screen:
   ├─ Basic Monthly  ₹499/month  → 2 spaces, standard features
   ├─ Pro Monthly    ₹999/month  → Unlimited spaces, analytics, priority
   └─ Annual         ₹4999/year  → Pro + 2 months free

Owner selects plan → [Pay Now]
   ↓
App calls POST /api/subscriptions/create-order
   ↓
Razorpay payment sheet opens
   ├─ UPI / Card / Net Banking / Wallet (for subscription fee)
   └─ Owner completes payment
   ↓
App calls POST /api/subscriptions/verify-payment
   ├─ Backend verifies HMAC signature
   ├─ Subscription activated in DB
   ├─ expiresAt set: now + 30 days (or 365 for annual)
   └─ Owner can now add/manage spaces
   ↓
Success screen:
   ├─ "Subscription Active!"
   ├─ Plan name + expiry date
   └─ [Go to Dashboard]
```

> ⚠️ **IMPORTANT PAYMENT SEPARATION:**
> - **Razorpay is ONLY used for owner subscription payments**
> - **Parking fees are NEVER collected in-app** — parker pays owner directly (Cash/GPay/PhonePe/Paytm)

---

## 🎯 PARKER SIDE (Find Parking)

**File:** PARKSWIFT_FIND_SPACE_DIRECT_PAYMENT.md (Already Complete)

```
Complete Flow:
1. Home → [Find Space]
2. Map with green (available) & red (booked) spaces
3. View space details (photos + videos)
4. Send booking request (NO payment)
   ├─ Select vehicle (mandatory)
   ├─ Select duration (1-24 hours)
   ├─ Select ETA (arrival time)
   └─ Agree to terms
5. Wait for owner approval
6. Owner accepts ✓
   ├─ Get OTP: 5678 (in app, not SMS)
   ├─ Chat & Call options appear ✓ NEW
   ├─ See owner details
   └─ [Get Directions]
7. Navigate to space
8. At space → Enter OTP
9. Session starts (timer runs both see)
10. [I am Leaving] button appears
11. Click [I am Leaving]
    ├─ Notification sent to owner
    ├─ Push notification to owner
    └─ Flow completed from parker's side
12. Wait for owner to release space
13. Session ends → History
14. Rate & review
```

---

## 🏢 SPACE OWNER SIDE (My Spaces)

### MAIN DASHBOARD (TAB 1: 🏠 Home)

```
SUBSCRIPTION STATUS (Top - Highest Priority):

IF SUBSCRIBED ✓:
├─ 🟢 Green badge: "✓ Active Subscription"
├─ Plan: ₹500/month
├─ Subscribed since: 01 May 2024
├─ Renewal date: 01 Jun 2024
├─ Days remaining: 21 days
├─ Auto-renewal: ON
└─ [Manage Subscription]

IF NOT SUBSCRIBED ✗:
├─ 🔴 Red banner: "Subscribe to add spaces"
├─ Plan: ₹500/month
├─ Benefits:
│  ├─ ✓ Add unlimited spaces
│  ├─ ✓ Manage bookings
│  ├─ ✓ Earn money
│  └─ ✓ View analytics
└─ [Subscribe Now] - PROMINENT BUTTON

QUICK STATS:
├─ Active spaces: 3
├─ Today's bookings: 2
├─ Pending requests: 1
└─ Total earnings (this month): ₹12,500

PENDING REQUESTS SECTION:
├─ Badge: "1 New Request"
├─ Preview card:
│  ├─ Raj Kumar wants A1-Sector 5
│  ├─ 3 hours | ETA: 10 mins
│  └─ [View Request]
└─ [View all (1)]

ACTIVE PARKINGS SECTION:
├─ Badge: "1 Active"
├─ Preview card:
│  ├─ Sarah Khan - B2-Fort
│  ├─ Time left: 1h 45m ⏱️
│  └─ [View Details]
└─ [View all (1)]

QUICK ACTIONS:
├─ [View all spaces]
├─ [+ Add new space] (DISABLED if not subscribed)
├─ [View all requests]
├─ [View active sessions]
├─ [View history]
└─ [View earnings]

BOTTOM NAVIGATION:
├─ 🏠 Dashboard (current)
├─ 🅿️ Spaces
├─ ✅ Verify
├─ 📅 Active
└─ 📋 History
```

---

### TAB 2: 🅿️ SPACES (Add/Manage/Delete)

```
IF NOT SUBSCRIBED:
├─ ⚠️ Banner: "Subscribe to add spaces"
├─ [Subscribe Now]
└─ Can still manage existing spaces

IF SUBSCRIBED:
├─ List of existing spaces
│  └─ For each space:
│     ├─ Photo
│     ├─ Name & Location
│     ├─ Total bookings
│     ├─ Active status
│     ├─ Monthly earnings
│     ├─ [Edit]
│     ├─ [View Bookings]
│     ├─ [Analytics]
│     └─ [🗑️ Delete]
│
└─ [+ Add New Space]
   ├─ Space name
   ├─ Location/address
   ├─ Type (covered/open)
   ├─ Photos (3+)
   ├─ Videos (optional)
   ├─ Pricing (hourly/daily/monthly)
   ├─ Features (CCTV, security, etc)
   ├─ House rules
   ├─ Cancellation policy
   ├─ [Submit]
   └─ Status: Pending admin review (24-48h)
```

---

### TAB 3: ✅ VERIFY (OTP Verification & Session Start)

```
BOOKING REQUEST RECEIVED:
(Modal/Toast at CENTER SCREEN - Full Screen Overlay)

┌──────────────────────────────────────────────┐
│ 🔔 BOOKING REQUEST                           │
│                                              │
│ PARKER DETAILS:                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 👤 [Parker Photo - Very Large]           │ │
│ │ Name: Raj Kumar                          │ │
│ │ Rating: ⭐ 4.8 (50 bookings)             │ │
│ │ Member since: March 2024                 │ │
│ │ Phone: 9876543210                        │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ VEHICLE DETAILS:                             │
│ ┌──────────────────────────────────────────┐ │
│ │ 📷 [Vehicle Photo - Very Large]          │ │
│ │ Type: Maruti Swift                       │ │
│ │ Color: Silver                            │ │
│ │ License: MH-01-1234                      │ │
│ │ Capacity: 5 persons                      │ │
│ │ Fuel: Petrol                             │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ BOOKING DETAILS:                             │
│ ├─ Space: A1-Sector 5                        │
│ ├─ Duration: 3 hours                         │
│ ├─ Price: ₹150/hour                          │
│ ├─ ETA: 10 minutes                           │
│ └─ Expected arrival: 2:55 PM                 │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ [✓ Accept]              [✗ Decline]     │ │
│ └──────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘

AFTER OWNER TAPS [Accept]:

Status: 🟢 APPROVED

BOTH SIDES SEE:
├─ Chat & Call options appear ✓ (NEW)
├─ Parker sees owner:
│  ├─ Name
│  ├─ Photo
│  ├─ Rating
│  └─ Space location
│
└─ Owner sees parker:
   ├─ Name
   ├─ Photo
   ├─ Rating
   └─ Vehicle details

VEHICLE DAMAGE VERIFICATION:
(Owner must choose ONE before OTP entry)

┌──────────────────────────────────────────────┐
│ VEHICLE CONDITION VERIFICATION               │
│                                              │
│ Choose one option:                           │
│                                              │
│ OPTION A: Send No-Concern Message            │
│ ┌──────────────────────────────────────────┐ │
│ │ ⚠️ Message to parker:                    │ │
│ │                                          │ │
│ │ "No concerns about vehicle damage.       │ │
│ │ I assume no responsibility for any       │ │
│ │ damages that may occur."                 │ │
│ │                                          │ │
│ │ [Send This Message]                      │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ OR                                           │
│                                              │
│ OPTION B: Document Vehicle Condition         │
│ ┌──────────────────────────────────────────┐ │
│ │ 📷 Upload vehicle photos/videos:         │ │
│ │                                          │ │
│ │ [+ Upload Photos/Videos]                 │ │
│ │                                          │ │
│ │ Files uploaded:                          │ │
│ │ ├─ photo1.jpg ✓                          │ │
│ │ ├─ photo2.jpg ✓                          │ │
│ │ └─ video1.mp4 ✓                          │ │
│ │                                          │ │
│ │ [Send for Verification]                  │ │
│ └──────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘

PARKER RECEIVES VERIFICATION:

IF Option A:
├─ Notification: "Owner sent concern message"
├─ Shows message about no liability
├─ [Accept] button
├─ If Parker clicks [Accept]:
│  ├─ Notification sent to owner
│  └─ OTP entry now enabled on owner's screen
└─ If Parker declines: Booking can be cancelled

IF Option B:
├─ Notification: "Owner uploaded vehicle photos"
├─ [View Photos/Videos]
├─ Parker can review condition
├─ [Accept condition] button
├─ If Parker clicks [Accept]:
│  ├─ Notification sent to owner
│  └─ OTP entry now enabled on owner's screen
└─ If Parker declines: Booking can be cancelled

OWNER'S OTP ENTRY PAGE:
(Shows after parker accepts verification)

┌──────────────────────────────────────────────┐
│ OTP VERIFICATION                             │
│                                              │
│ ✓ Parker verified vehicle condition           │
│                                              │
│ PARKER DETAILS:                              │
│ ├─ Raj Kumar                                 │
│ ├─ Vehicle: Maruti Swift (MH-01-1234)        │
│ ├─ Duration: 3 hours                         │
│ └─ ETA: 10 mins (2:55 PM)                    │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ VERIFICATION STATUS:                         │
│ ├─ Vehicle condition: ✓ Accepted              │
│ ├─ Safety check: ✓ Passed                    │
│ └─ Ready to start session                    │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ ENTER OTP:                                   │
│ ┌──────────────────────────────────────────┐ │
│ │ OTP Code: [5 6 7 8]                      │ │
│ │ (4-digit shown to parker)                │ │
│ │                                          │ │
│ │ [Verify OTP & Start Session]             │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ STATUS: Ready for parking                    │
│                                              │
└──────────────────────────────────────────────┘

PARKER SEES OTP:
├─ Notification: "Space confirmed ready"
├─ Shows OTP: 5678
├─ When at space: Enter this OTP
└─ [Got it]

AFTER OTP VERIFICATION:
├─ Status: 🟢 SESSION ACTIVE
├─ Both see real-time timer
├─ Parking session officially started
└─ Both notified: Session active
```

---

### TAB 4: 📅 ACTIVE (Live Parking Sessions)

```
SHOWS ALL CURRENTLY ACTIVE PARKINGS:

For each active session:

┌──────────────────────────────────────────────┐
│ 🟢 ACTIVE PARKING SESSION                    │
│                                              │
│ Parker: Raj Kumar                            │
│ Vehicle: Maruti Swift (MH-01-1234)           │
│ Space: A1-Sector 5                           │
│ Phone: 9876543210                            │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ ⏱️ REAL-TIME TIMER:                          │
│                                              │
│ 2 : 45 : 30                                  │
│ (Counts down every second)                   │
│                                              │
│ Booked: 3 hours total                        │
│ Started: 2:55 PM                             │
│ Ends at: 5:55 PM (if no changes)             │
│ Time used: 2h 45m                            │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ 💰 CURRENT AMOUNT:                           │
│ Price: ₹150/hour                             │
│ Amount due: ₹412.50 (updates real-time)      │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ QUICK ACTIONS:                               │
│ ├─ [Message Parker]                          │
│ ├─ [Call Parker]                             │
│ └─ [View Details]                            │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ STATUS: ✓ Parker is using the space          │
│                                              │
└──────────────────────────────────────────────┘

TIMER DISPLAY & UPDATES:
├─ Format: HH : MM : SS
├─ Updates every second (real-time)
├─ Visible in main app area
├─ Also shown in bottom notification
├─ Color coding:
│  ├─ Green: >30 mins remaining
│  ├─ Yellow: 5-30 mins remaining
│  └─ Red: <5 mins remaining
└─ Notification area shows: "A1-Sector 5 | 2:45:30"

BOTTOM NOTIFICATION AREA:
├─ Space: A1-Sector 5
├─ Time: 2:45:30 remaining
├─ Swipe to see full details
└─ Tap to return to active view

PARKER'S ACTIONS (From Parker's App):

Real-time timer visible:
├─ [Message Owner]
├─ [Call Owner]
├─ [Extend Time] (add more hours)
└─ [I am Leaving] ← BIG, PROMINENT BUTTON

WHEN PARKER CLICKS [I am Leaving]:

NOTIFICATIONS TO OWNER:
├─ 🔔 Push notification: "Parker is leaving!"
├─ In-app message: "Raj Kumar clicked 'I am leaving'"
├─ Exit time shown: 5:50 PM
├─ Time used displayed: 2 hours 55 minutes
└─ [Release Space] button becomes active/highlighted

OWNER RECEIVES:
├─ Message in chat
├─ Push notification (even if app closed)
├─ Clear indication: Parker has left
└─ Ready to finalize

───────────────────────────────────────────

OWNER'S RELEASE SPACE FLOW:

Owner taps [Release Space]
    ↓
TOAST APPEARS (center screen):

┌──────────────────────────────────────────────┐
│ SELECT EXIT TIME FOR INVOICE                 │
│                                              │
│ Parker clicked "I am leaving" at 5:50 PM     │
│ Duration used: 2h 55m                        │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ OPTION 1: Use Parker's Exit Time             │
│ ┌──────────────────────────────────────────┐ │
│ │ Exit time: 5:50 PM (2h 55m)              │ │
│ │ Amount: ₹437.50                          │ │
│ │ [Use This Time] ✓                        │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ OPTION 2: Manual Owner Time Entry            │
│ ┌──────────────────────────────────────────┐ │
│ │ [Enter exit time manually]               │ │
│ │ Time: [5 : 55 PM]  (HH : MM format)      │ │
│ │                                          │ │
│ │ Calculated:                              │ │
│ │ Duration: 3h 00m                         │ │
│ │ Amount: ₹450.00                          │ │
│ │ [Use This Time] ✓                        │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ───────────────────────────────────────      │
│                                              │
│ FINAL AMOUNT:                                │
│ [Selected amount from above]                 │
│                                              │
│ [Confirm & Release Space]                    │
│                                              │
└──────────────────────────────────────────────┘

AMOUNT CALCULATION:
├─ Selected time - Started time = Duration
├─ Duration × Hourly rate = Final amount
├─ No grace period (charge for exact time)
└─ Example: 2h 55m × ₹150/h = ₹437.50

AFTER [Confirm & Release Space]:

IMMEDIATELY:
├─ Session officially ends
├─ Status: ✓ SESSION COMPLETED
├─ Final amount locked: ₹437.50
├─ Exit time recorded: 5:50 PM (or selected time)
├─ Invoice generated
└─ Data saved to database

NOTIFICATIONS:
├─ Parker: "Session ended" | "Final: ₹437.50"
├─ Owner: "Space released" | "Amount: ₹437.50"
└─ Both moved to History tab

BOTH CAN NOW:
├─ Rate each other
├─ Add feedback
├─ View invoice/receipt
└─ See transaction history
```

---

### TAB 5: 📋 HISTORY (Completed Sessions)

```
SHOWS ALL COMPLETED PARKING SESSIONS:

Filter options:
├─ All Time
├─ This Month
├─ Last 3 Months
└─ This Year

For each completed session:

┌──────────────────────────────────────────────┐
│ ✓ COMPLETED PARKING                          │
│ Booking ID: BK-12345                         │
│                                              │
│ PARKER DETAILS:                              │
│ ├─ Name: Raj Kumar                           │
│ ├─ Rating: ⭐ 4.8                            │
│ └─ Phone: 9876543210                         │
│                                              │
│ SESSION DETAILS:                             │
│ ├─ Space: A1-Sector 5                        │
│ ├─ Date: Today (2:55 PM - 5:50 PM)           │
│ ├─ Duration: 2h 55m                          │
│ ├─ Amount: ₹437.50                           │
│ └─ Status: ✓ COMPLETED                       │
│                                              │
│ PARKER RATING:                               │
│ ├─ ⭐⭐⭐⭐⭐ (5/5)                           │
│ └─ "Great parker! Respectful and on time"    │
│                                              │
│ [View Full Details]                          │
│ [Download Invoice]                           │
│ [View Receipt]                               │
│                                              │
└──────────────────────────────────────────────┘

EARNINGS SUMMARY:

This Month:
├─ Total: ₹12,500
├─ From: 15 completed sessions
└─ Average: ₹833 per session

This Week:
├─ Total: ₹2,800
├─ From: 4 sessions
└─ Trending: ↑ Up

Today:
├─ Total: ₹437.50
├─ From: 1 session
└─ [View details]

BREAKDOWN BY SPACE:
├─ A1-Sector 5: ₹5,200 (15 sessions)
├─ B2-Fort: ₹4,100 (12 sessions)
└─ C3-Sector 9: ₹3,200 (10 sessions)
```

---

## 🔔 NOTIFICATIONS & MESSAGES

### Push Notifications (Both Sides)

**When Parker sends request:**
```
🔔 NEW BOOKING REQUEST
"New booking from Raj Kumar for A1-Sector 5"
[Tap to review]
```

**When Owner accepts:**
```
🔔 BOOKING APPROVED
"Your request approved!"
"Owner: Priya Sharma"
"Your OTP: 5678"
[Tap to see details]
```

**When Parker clicks [I am leaving]:**
```
🔔 PARKER IS LEAVING
"Raj Kumar left at 5:50 PM"
"Time used: 2h 55m"
[Release Space]
```

**When session ends:**
```
🔔 SESSION COMPLETED
"Parking session ended"
"Final: ₹437.50"
[Rate Parker]
```

### In-App Messages

**After Owner Accepts:**
✅ Chat & Call enabled
├─ Both can message
├─ Both can call
└─ Full communication

**Message Content Examples:**
├─ Confirm ETA
├─ Share contact
├─ Ask questions
├─ Coordinate arrival
└─ Vehicle concerns

---

## 📋 COMPLETE BOOKING LIFECYCLE

```
1. PARKER SENDS REQUEST
   └─ Status: 🟡 PENDING

2. OWNER RECEIVES NOTIFICATION
   └─ Modal shows all details

3. OWNER ACCEPTS
   ├─ Status: 🟢 APPROVED
   ├─ Chat & Call enabled ✓
   └─ Damage verification started

4. PARKER ACCEPTS VERIFICATION
   ├─ OTP entry enabled for owner
   └─ Ready for session start

5. OWNER ENTERS OTP & STARTS
   ├─ Status: 🟢 ACTIVE
   ├─ Timer starts (both see)
   └─ Parking session live

6. PARKER ARRIVES & PARKS
   ├─ Real-time timer running
   ├─ Current amount tracked
   └─ Both monitoring

7. PARKER LEAVES
   ├─ Clicks [I am leaving]
   ├─ Owner gets notification
   └─ [Release Space] activated

8. OWNER RELEASES
   ├─ Selects exit time
   ├─ Confirms calculated amount (reference only)
   └─ Session ends

9. PAYMENT (OUTSIDE APP — DIRECT)
   ├─ Parker pays owner via Cash/GPay/PhonePe/Paytm
   ├─ No in-app payment processing
   ├─ Amount shown is an estimate based on duration
   └─ Owner marks booking as [Mark Paid] when received

10. BOTH RATE EACH OTHER
    ├─ Feedback submitted
    ├─ Ratings recorded
    └─ Reputation updated

11. SESSION IN HISTORY
    ├─ Complete session record
    ├─ Duration + estimated amount shown
    └─ Session closed
```

---

## ✅ READY FOR MD FILE CREATION

All flows are now detailed and organized. Ready to create:
1. **My Spaces Complete Flow** (Space Owner Dashboard & Management)
2. **Verify & Release Flow** (OTP & Session Management)
3. **Active & History Flows** (Tracking & Records)

Please review and confirm! 🚀

