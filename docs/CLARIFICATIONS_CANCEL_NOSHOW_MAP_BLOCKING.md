# CLARIFICATIONS NEEDED
## Cancel Options, No-show Handling, Space Blocking, Map Occupancy

---

## ❓ QUESTION 1: CANCEL BOOKING - TIMING & WHO CAN CANCEL

### Timeline with Cancel Options

```
STAGE 1: Parker sends request
├─ Status: 🟡 PENDING
├─ Parker can CANCEL? ✓ YES
├─ Owner can DECLINE? ✓ YES
└─ Map shows: ❌ NOT BLOCKED YET
    (Other parkers can still see space)

STAGE 2: Owner accepts request
├─ Status: 🟢 APPROVED
├─ Chat & Call enabled ✓
├─ Parker can CANCEL? ✓ YES (before OTP)
├─ Owner can CANCEL/UNDO? ❓ CLARIFY
└─ Map shows: ❌ MAYBE BLOCKED? (Need to decide)

STAGE 3: Before OTP verification
├─ Status: 🟢 APPROVED (Waiting for parker arrival)
├─ Parker navigating to space
├─ Parker can CANCEL? ✓ YES (last chance)
├─ Owner can CANCEL? ❓ CLARIFY
├─ Damage verification: Pending
└─ Map shows: ❌ NOT BLOCKED YET?

STAGE 4: OTP verified ✓
├─ Status: 🟢 SESSION ACTIVE
├─ Parking session started
├─ Timer running (both see)
├─ Parker can CANCEL? ❌ NO (can only [I am Leaving])
├─ Owner can CANCEL? ❌ NO (can only [Release Space])
└─ Map shows: ✓ FULLY BLOCKED (occupied)
    (Space unavailable for anyone else)

STAGE 5: Parker clicks [I am Leaving]
├─ Status: 🟡 WAITING FOR OWNER RELEASE
├─ Parker can do anything? ❌ NO (waiting for owner)
├─ Owner can CANCEL? ❌ NO (just release)
└─ Map shows: ✓ STILL BLOCKED (finalizing)

STAGE 6: Owner clicks [Release Space]
├─ Status: ✓ COMPLETED
├─ No one can cancel
├─ Move to History
└─ Map shows: ✓ AVAILABLE AGAIN
    (Space free for new bookings)
```

---

## ❓ QUESTION 2: NO-SHOW SCENARIO

### Parker ETA is 15 mins but doesn't arrive after 1 hour

```
TIMELINE:

2:45 PM: Owner accepts request
├─ Parker ETA: 2:55 PM (15 mins)
├─ Status: APPROVED
├─ Owner waiting at space
└─ Parker should arrive soon

2:55 PM: Expected arrival time
├─ Parker not there yet
├─ Owner starts waiting
└─ Might be traffic/delay

3:00 PM: 5 mins late
├─ Owner still waiting
├─ Maybe message parker
└─ Can't do much yet

3:15 PM: 20 mins late
├─ Owner concerned
├─ Can [Message Parker] or [Call Parker]
└─ Try to contact

3:45 PM: 50 mins late
├─ Owner very concerned
├─ Parker might be stuck/accident
├─ Should be able to contact
└─ ❓ NEED OPTION TO CANCEL/ABORT

4:45 PM: 1 HOUR LATE
├─ Parker never showed up
├─ Owner's time wasted
├─ What happens?
└─ OPTIONS NEEDED:

OPTION A: AUTO-CANCEL after timeout
├─ If parker doesn't enter OTP in 30 mins after approval
├─ Auto-cancel booking
├─ Space becomes available
├─ Booking cancelled (no in-app refund — payment is direct)
└─ Owner notified

OPTION B: MANUAL CANCEL by Owner
├─ Owner can [Cancel Booking] button
├─ Shows in ACTIVE tab or Verify tab
├─ When available?
│  ├─ During first 30 mins after approval
│  ├─ Or after any timeout period
│  └─ Owner must confirm cancellation
├─ Effect:
│  ├─ Booking cancelled
│  ├─ Parker notified (payment was direct — no in-app refund)
│  ├─ Space becomes available
│  └─ Both notified
└─ Owner can rebook/list space

OPTION C: BOTH OPTIONS
├─ Auto-cancel after 30 mins + manual override
├─ Owner can cancel anytime before OTP
├─ Auto-cancels if no action taken
└─ BEST PRACTICE (Like BookMyShow)

❓ WHICH OPTION DO YOU WANT?
```

---

## ❓ QUESTION 3: SPACE BLOCKING ON MAP

### When does space become unavailable on map?

```
OPTION A: After owner ACCEPTS

Map behavior:
├─ 1. Request sent: Space still GREEN (available)
├─ 2. Owner accepts: Space turns GRAY or ORANGE (hold)
│  │  └─ Shows: "Hold for 30 mins"
│  │      (Other parkers see "booking in progress")
├─ 3. OTP verified: Space turns RED (occupied)
│  │  └─ Shows: "Occupied" 
│  │      (No one else can book)
├─ 4. Session ends: Space turns GREEN again (available)
│  │  └─ Shows: "Available now"
│  │      (Others can immediately book)
└─ 5. If cancelled: Space turns GREEN immediately
   └─ Shows: "Available now"
      (Back to available)

Problem with Option A:
├─ Space is on "hold" even if parker takes long time
├─ Other parkers can't book during hold period
└─ But no session is active yet

✓ BEST for: Protecting owner's time
❌ BAD for: Other parkers who want to book
```

```
OPTION B: After OTP VERIFIED

Map behavior:
├─ 1. Request sent: Space still GREEN (available)
├─ 2. Owner accepts: Space still GREEN (available)
│  │  └─ Other parkers can still see & book
│  │      (Race condition possible!)
├─ 3. OTP verified: Space turns RED (occupied)
│  │  └─ Shows: "Occupied"
│  │      (No one can book)
├─ 4. Session ends: Space turns GREEN again
│  │  └─ Shows: "Available now"
└─ 5. If cancelled before OTP: Space turns GREEN
   └─ Shows: "Available now"

Problem with Option B:
├─ Multiple parkers might try to book same space
├─ Race condition between multiple parkers
├─ Overbooking possible
└─ Space still available until parker actually arrives

✓ BEST for: More availability for parkers
❌ BAD for: Causing double bookings
```

```
OPTION C: HOLDING PERIOD (Like BookMyShow)

Map behavior:
├─ 1. Parker sends request: Space GREEN (5 min hold)
│  │  └─ Shows: "On hold for 5 mins"
│  │      Only THIS parker can complete booking
├─ 2. After 5 mins: If owner doesn't accept
│  │  └─ Space GREEN again (available)
│  │      Other parkers can try to book
├─ 3. Owner accepts: Space ORANGE (30 min hold)
│  │  └─ Shows: "Hold for 30 mins" 
│  │      Parker must reach space in 30 mins
├─ 4. OTP verified: Space RED (occupied)
│  │  └─ Shows: "Occupied"
│  │      Locked until session ends
├─ 5. If no OTP in 30 mins: Space GREEN (available)
│  │  └─ Auto-release after timeout
└─ 6. Session ends: Space GREEN again
   └─ Shows: "Available now"

Benefits:
├─ ✓ No double bookings
├─ ✓ Fair to all parkers
├─ ✓ Protected hold period
├─ ✓ Auto-release on timeout
├─ ✓ Like BookMyShow/Uber/Ola
└─ ✓ BEST PRACTICE

RECOMMENDED: Option C with holding periods
```

---

## ❓ QUESTION 4: MAP OCCUPANCY TIMING (BookMyShow Style)

### Exact Flow with Space Blocking

```
SCENARIO: Parker books space

TIME: 2:45 PM

STEP 1: Parker sends request
├─ Space status: GREEN on map
├─ Hold period: 5 minutes (only for this parker)
├─ Other parkers: Can't see/book this space
├─ Owner: Gets notification to accept/decline
└─ Duration: 5 mins (2:45 PM - 2:50 PM)

Timeline on map:
├─ Shown to PARKER: "Your booking in progress"
├─ Shown to OTHERS: This space unavailable/hidden
└─ Status: 🟡 HOLD

IF Owner doesn't accept in 5 mins:
├─ Booking auto-expires
├─ Space becomes GREEN again
├─ Parker notified: "Owner didn't respond"
├─ Other parkers can now see & book
└─ Parker can try other spaces

───────────────────────────────────────

TIME: 2:47 PM (within 5 mins)

STEP 2: Owner accepts request
├─ Space status: ORANGE on map
├─ New hold period: 30 minutes
├─ Other parkers: Can't book (hold in progress)
├─ Parker: Gets OTP + approval notification
└─ Duration: 30 mins (2:47 PM - 3:17 PM)

Timeline on map:
├─ Shown to PARKER: "Approved! Go to space"
├─ Shown to OWNER: "Waiting for parker"
├─ Shown to OTHERS: This space unavailable
└─ Status: 🟠 HOLD FOR APPROVED BOOKING

If Parker doesn't reach in 30 mins:
├─ Space auto-released at 3:17 PM
├─ Becomes GREEN again
├─ Parker gets notification: "Booking expired"
├─ Owner gets notification: "Parker didn't arrive"
├─ Other parkers can now book
└─ OR owner can manually cancel earlier

───────────────────────────────────────

TIME: 2:55 PM (before OTP)

STEP 3: Parker at space, enters OTP
├─ Space status: RED on map
├─ Hold period: LOCKED (until session ends)
├─ Other parkers: CAN'T book at all
├─ Duration: Whatever booking duration is
└─ Session officially ACTIVE

Timeline on map:
├─ Shown to PARKER: "Parking active"
├─ Shown to OWNER: "Parker confirmed"
├─ Shown to OTHERS: "Space occupied"
└─ Status: 🔴 OCCUPIED

This space is 100% unavailable until:
├─ Parker clicks [I am Leaving] AND
├─ Owner clicks [Release Space]
└─ OR emergency cancellation

───────────────────────────────────────

TIME: 5:50 PM (after usage)

STEP 4: Parker clicks [I am Leaving]
├─ Space status: Still RED (finalizing)
├─ Owner gets notification to release
├─ Parker can't do anything else
├─ Owner must click [Release Space]
└─ Duration: Until owner releases (usually <5 mins)

Timeline on map:
├─ Shown to OTHERS: Still "Occupied"
└─ Status: 🔴 FINALIZING

───────────────────────────────────────

TIME: 5:50 PM (owner releases)

STEP 5: Owner clicks [Release Space]
├─ Space status: GREEN on map (available)
├─ Other parkers: Can now see & book
├─ Session moved to history
├─ Amount finalized
└─ Space FREE for new bookings

Timeline on map:
├─ Shown to ALL: "Available now"
├─ Shown to PARKER: Moved to History
├─ Shown to OWNER: Space available again
└─ Status: 🟢 AVAILABLE

New parker can immediately book it
```

---

## 📊 COMPLETE CANCEL OPTIONS TABLE

```
┌─────────────────┬───────────┬────────────┬──────────────┐
│ Stage           │ Parker    │ Owner      │ Auto-cancel? │
├─────────────────┼───────────┼────────────┼──────────────┤
│ Stage 1: Request│ Cancel ✓  │ Decline ✓  │ After 5 min  │
│ (5 min hold)    │           │            │ if no action │
├─────────────────┼───────────┼────────────┼──────────────┤
│ Stage 2: Approve│ Cancel ✓  │ Cancel? ❓ │ After 30 min │
│ (30 min hold)   │           │            │ if no OTP    │
├─────────────────┼───────────┼────────────┼──────────────┤
│ Stage 3: Before │ Cancel ✓  │ Cancel? ❓ │ After 30 min │
│ OTP (30 min)    │           │            │ if no OTP    │
├─────────────────┼───────────┼────────────┼──────────────┤
│ Stage 4: Active │ NO ❌     │ NO ❌      │ NO ❌        │
│ (OTP verified)  │ [I am     │ [Release   │              │
│                 │ Leaving]  │ Space]     │              │
├─────────────────┼───────────┼────────────┼──────────────┤
│ Stage 5: After  │ NO ❌     │ NO ❌      │ NO ❌        │
│ [I am Leaving]  │           │            │              │
├─────────────────┼───────────┼────────────┼──────────────┤
│ Stage 6:        │ Rate ⭐   │ Rate ⭐    │ NO ❌        │
│ Completed       │ NO cancel │ NO cancel  │              │
└─────────────────┴───────────┴────────────┴──────────────┘
```

---

## ✅ RECOMMENDED ANSWERS

### 1. CANCEL BEFORE OTP
```
YES - Both can cancel before OTP verified:

Parker can cancel:
├─ Stage 1 (Pending): [Cancel Request]
├─ Stage 2 (Approved): [Cancel Booking]
└─ Stage 3 (Before OTP): [Cancel Booking] (last chance)

Owner can:
├─ Stage 1: [Decline] request
└─ Stage 2+: Manual [Cancel] option? 
   (or auto-cancel after 30 mins)
```

### 2. AFTER OTP VERIFIED
```
NO ONE can fully cancel:

Parker:
├─ Can only use [I am Leaving]
└─ Still charged for time used

Owner:
├─ Can only use [Release Space]
└─ After parker clicks [I am Leaving]

Both must complete the session
```

### 3. NO-SHOW AFTER 1 HOUR
```
AUTO-CANCEL after timeout:

Scenario: Owner accepts at 2:47 PM
├─ Parker ETA: 15 mins (2:55 PM)
├─ Hold period: 30 mins (until 3:17 PM)
├─ If no OTP by 3:17 PM:
│  ├─ Auto-cancel
│  ├─ Space becomes GREEN
│  ├─ Both get notifications
│  └─ Parker notified (payment was direct — no in-app refund)
│
OR Manual cancel by owner:
├─ Owner [Cancel Booking] button
├─ Available during hold period
├─ Before OTP verified
└─ Space immediately available

RECOMMENDATION: 
├─ Auto-cancel after 30 mins (no OTP)
├─ Owner can cancel manually anytime before OTP
└─ After OTP: No cancellation (locked in)
```

### 4. MAP OCCUPANCY
```
OPTION C - HOLDING PERIODS (Best Practice):

Stage 1 - Request (5 min hold):
├─ Space: GRAY/UNAVAILABLE on map
├─ Only for this parker
└─ Others can't see it

Stage 2 - Approved (30 min hold):
├─ Space: ORANGE/HOLD on map
├─ Others can't book
└─ Shows: "Booking in progress"

Stage 3 - OTP Verified (Active):
├─ Space: RED/OCCUPIED on map
├─ Others can't see it
└─ Shows: "Space occupied"

Stage 4 - Released:
├─ Space: GREEN/AVAILABLE on map
├─ Others can immediately book
└─ Shows: "Available now"

Auto-release on timeout:
├─ After 5 mins (Stage 1): If owner doesn't accept
├─ After 30 mins (Stage 2): If parker doesn't verify OTP
└─ Space returns to GREEN automatically
```

---

## 🎯 FINAL SUMMARY - YOUR ANSWERS

```
Q1: Before OTP can cancel?
A: YES - Both parker & owner can cancel before OTP ✓

Q2: After OTP, who can cancel?
A: NO ONE - Only [I am Leaving] (parker) & 
              [Release Space] (owner) ✓

Q3: No-show after 1 hour?
A: Auto-cancel after 30 mins + 
   Owner manual cancel option ✓

Q4: When map blocked?
A: Using booking hold periods:
   - Stage 1 (5 min): GRAY hold
   - Stage 2 (30 min): ORANGE hold  
   - Stage 3: RED occupied
   - Released: GREEN available ✓

Q5: BookMyShow style?
A: YES - Holding periods prevent 
         double-booking ✓
```

---

## 📝 READY TO IMPLEMENT

Please confirm these approaches:

1. ✅ Cancel before OTP: YES (both sides)
2. ✅ Cancel after OTP: NO (locked in)
3. ✅ No-show: Auto-cancel after 30 mins + manual option
4. ✅ Map: Holding periods (5 min, 30 min, then active)
5. ✅ BookMyShow style: YES - prevents double-booking

Should I update the complete flow with these details? 🚀

