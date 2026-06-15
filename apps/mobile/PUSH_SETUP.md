# ParkSwift — Push Notification Setup

One-page checklist to take push notifications from "code-complete" to "actually
delivering on real devices." The **code** is done; this covers the **operational**
setup (Expo/Apple/Google accounts) that can't live in the repo.

> TL;DR: run `eas init`, paste the projectId, wire FCM (Android) + APNs (iOS)
> credentials via `eas credentials`, build, and test on a physical device.

---

## Fixed project values (already in the repo — don't change these)

| Thing | Value | Where it's set |
|---|---|---|
| iOS bundle identifier | `com.hari11.parkswift` | `app.config.js` → `ios.bundleIdentifier` |
| Android package name | `com.hari11.parkswift` | `app.config.js` → `android.package` |
| Expo slug | `parkswift` | `app.config.js` → `slug` |
| Android notification channel | `parkswift` | created in `app/_layout.tsx`, sent as `channelId` from the backend |
| URL scheme | `parkswift` | `app.config.js` → `scheme` |
| Expo SDK | 56 | `package.json` |

The push **sound** is the device default (`sound: 'default'`). No custom bell —
deliberately deferred for V1.

---

## How the system works (so future-you remembers)

```
Event (booking approved, parker arrived, …)
        │
        ▼
adminService.notifyUser(userId, {...})      ← SINGLE chokepoint
        │
        ├─► writes a DB Notification row (inbox)
        ├─► emits a Socket.IO event (live, app-open)
        └─► pushService.sendToUser() → Expo Push API → APNs / FCM → device
                                                              │
                                                  tap ────────┘
                                                   │
                                                   ▼
                          useNotificationDeepLink → routes to the right screen
```

- **One push per notification** — all push flows through `notifyUser()` /
  `broadcastNotification()` in `apps/api/src/services/admin.service.ts`. Do NOT
  add ad-hoc `pushService` calls elsewhere or you'll get duplicates.
- **Dead tokens self-clean** — Expo `DeviceNotRegistered` → token nulled in DB
  (`apps/api/src/services/push.service.ts`).
- **Deep links** — payload carries `{ screen, bookingId }`; map lives in
  `buildDeepLinkData()` (server) and `useNotificationDeepLink.ts` (mobile).

---

## Step 1 — Create the EAS project (gets the projectId)

```bash
cd apps/mobile
eas login          # use the ParkSwift Expo account
eas init           # creates the project, prints a projectId (uuid)
```

Then set the projectId. Either:
- paste it into `app.config.js` → `extra.eas.projectId`, **or**
- set `EAS_PROJECT_ID=<uuid>` in the mobile `.env` (the config reads it).

> Without a real projectId, `getExpoPushTokenAsync()` throws in a production
> build and **no token is ever saved** → no pushes. In dev you'll see a
> `[PUSH] No EAS projectId configured` warning.

---

## Step 2 — Android (FCM)

1. Firebase console → create / open a project (suggested name: **ParkSwift**).
2. Add an **Android app** with package name **`com.hari11.parkswift`**.
3. Download **`google-services.json`** → place it in `apps/mobile/`.
   (It's gitignored-sensitive; keep it out of public commits if the repo is public.)
4. Give Expo the FCM credential so it can deliver to Android:
   ```bash
   eas credentials        # → Android → Push Notifications (FCM V1) → set up
   ```
   Use the **FCM V1 service account key** (JSON) from
   Firebase → Project Settings → Service accounts → Generate new private key.

---

## Step 3 — iOS (APNs)

Bundle id `com.hari11.parkswift` is already configured. You need an Apple
Developer account ($99/yr).

```bash
eas credentials          # → iOS → Push Notifications → set up a Push Key
```

Let EAS **generate and manage the APNs key** (easiest) — it creates the `.p8`
key in your Apple Developer account and stores it for you. No manual upload needed.

---

## Step 4 — Build & install on a REAL device

Push does **not** work in Expo Go for standalone delivery, and **never** works on
a simulator/emulator (no APNs/FCM). Use a physical device.

```bash
# Android internal APK (fastest to sideload)
eas build --profile preview --platform android

# iOS (needs the Apple account + a registered device for ad-hoc, or TestFlight)
eas build --profile preview --platform ios
```

Build profiles are defined in `eas.json`.

---

## Step 5 — Verify the full loop

1. Install the build, **log in** → on login the app calls
   `getExpoPushTokenAsync({ projectId })` and `POST /users/me/push-token`.
2. Confirm the token landed: check `users.expoPushToken` in the DB for your user
   (should look like `ExponentPushToken[…]`).
3. Trigger a real event (e.g. another account books your space → you're the owner).
4. **Background or kill the app**, lock the phone.
5. Expect: a push with sound arrives.
6. **Tap it** → app opens directly to the right screen
   (owner request → `booking-request`; parker booking event → `booking-status`).

### The 3 tests to actually pass before launch
- **Cold start**: app killed → tap push → lands on the correct screen, not Home.
- **Background**: app backgrounded → tap push → identical behavior.
- **No duplicates**: one action → exactly **1 push** and **1 DB notification**.

---

## Quick sanity check (Expo CLI, no full build)

Once a device token exists in the DB, you can fire a test push without going
through the backend:

```bash
# replace with a real token from the DB
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"ExponentPushToken[xxxx]","title":"Test","body":"Hello from ParkSwift","sound":"default","channelId":"parkswift"}'
```

A `"status":"ok"` ticket means Expo accepted it; a `DeviceNotRegistered` error
means the token is stale (the backend will auto-clear it on the next real send).

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Token never saved | No `projectId`, or testing on simulator/Expo Go |
| `[PUSH] No EAS projectId configured` warning | `extra.eas.projectId` still empty — do Step 1 |
| Android: token saved but no push | FCM credential not set in `eas credentials`, or wrong `google-services.json` |
| iOS: token saved but no push | APNs key missing/expired, or app not built with the push entitlement |
| Push arrives but tap opens Home | Deep-link `data` missing — check `buildDeepLinkData()` server-side |
| Duplicate pushes | An ad-hoc `pushService` call was added outside `notifyUser()` |

---

## Files involved (for future edits)

- `apps/mobile/app.config.js` — projectId, bundle ids, expo-notifications plugin
- `apps/mobile/eas.json` — build profiles
- `apps/mobile/app/_layout.tsx` — permission + token registration, channel setup
- `apps/mobile/hooks/useNotificationDeepLink.ts` — tap → screen routing
- `apps/api/src/services/push.service.ts` — Expo send + dead-token cleanup
- `apps/api/src/services/admin.service.ts` — `notifyUser()` / `broadcastNotification()` (the chokepoint) + `buildDeepLinkData()`
