# ParkSwift — Find Space & Payment Model

**Type:** Find Space feature with direct owner-parker payment
**Payment Model:** Direct between parker and owner (Cash/GPay/PhonePe/Paytm)
**Last Updated:** 2026-05-26

---

## Payment Philosophy

ParkSwift has **two distinct payment contexts**. These must never be confused:

| Context | Method | Details |
|---------|--------|---------|
| **Parking fees** (parker → owner) | OFFLINE / DIRECT | Cash, GPay, PhonePe, Paytm — outside the app |
| **Subscription fees** (owner → platform) | IN-APP via Razorpay | Owner pays monthly/annual plan to list spaces |

### Parking Fees — What the App Does
- Connects parkers with available parking spaces
- Facilitates booking requests between parker and owner
- Calculates parking duration and estimates payable amount (for reference only)
- Tracks booking session details and status
- Allows owner to manually mark parking payment as Paid / Pending

### Parking Fees — What the App Does NOT Do
- Process parking payments online (no Razorpay/Stripe for parking)
- Collect parking money on behalf of owners
- Handle parking refunds (no in-app payment = no in-app refund)
- Manage wallets or saved cards for parking
- Charge commission or transaction fees on parking

> **Note:** Razorpay IS used in ParkSwift — but **only for owner subscription payments**, not for parking fees.

---

## Direct Payment Methods (Outside the App)

Parker and owner settle payment at the parking location using any method they agree on:

- Cash
- GPay
- PhonePe
- Paytm
- Any other UPI or digital payment app

---

## Find Space User Flow

```
Find Parking (map/list)
    ↓
Tap Space → Space Detail
    ↓
Select duration → "Reserve Now"
    ↓
Select Vehicle
    ↓
Confirm Booking (shows estimated amount for reference)
    ↓
Booking Requested — owner notified
    ↓
Owner approves/rejects
    ↓
Parker goes to space → pays owner directly
    ↓
Owner marks payment as Paid in app (optional)
```

---

## Estimated Amount Display

The app shows:
```
₹{pricePerHour}/hr × {hours}h = ₹{estimate}
```

This is a **reference estimate only**. The actual amount may vary based on the real duration of parking. No GST or transaction charges are applied by the app.

---

## Booking Confirmation Screen

After selecting a vehicle and tapping "Confirm Booking":
- Shows space name, date/time, vehicle, and estimated amount
- Button label: **"Confirm Booking"** (not "Confirm & Pay")
- On confirm: booking request sent to owner
- Success screen shows: "Pay the owner directly at the space via Cash, GPay, PhonePe, or Paytm"

---

## Owner Dashboard

- Owner sees incoming booking requests
- Approves or rejects each request
- After parker arrives and pays: owner marks booking as **Paid**
- If payment not received: owner marks as **Pending**

---

## Cancellation & No-Show

Since no parking money is collected by the app:
- Cancellation = booking status set to CANCELLED. No refund flow needed.
- No-show = booking expires. No penalty charged via app.
- Any compensation or cancellation arrangement is between parker and owner directly.

---

## Owner Subscriptions (Separate System — Uses Razorpay)

Owner subscription payments are handled in a completely separate flow:

```
Owner taps [Subscribe Now]
    ↓
Selects plan (Basic ₹499/mo, Pro ₹999/mo, Annual ₹4999/yr)
    ↓
POST /api/subscriptions/create-order → Razorpay order created
    ↓
Razorpay payment sheet (UPI/Card/Net Banking — for subscription only)
    ↓
POST /api/subscriptions/verify-payment → Signature verified, subscription activated
    ↓
Owner can now list and manage parking spaces
```

This subscription payment system is **completely independent** of the parker-owner parking fee flow described above.
