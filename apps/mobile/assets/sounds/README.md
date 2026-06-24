# Alert sounds

Drop a short (1–3 second) notification chime here named exactly:

```
new-request.wav
```

(`.wav` and `.mp3` both bundle fine — if you use mp3, update the `require`
extension in `components/OwnerBookingAlert.tsx`.)

It is played **once** when an owner receives an incoming booking-request
(the OwnerBookingAlert modal), alongside the vibration. See
`components/OwnerBookingAlert.tsx` → `playRequestSound()`.

If this file is absent the app falls back to vibration only — it will **not**
crash (the require is wrapped in try/catch).

## Where to get a free sound
- https://pixabay.com/sound-effects/search/notification/
- https://mixkit.co/free-sound-effects/notification/
- https://notificationsounds.com/

Search terms: "notification bell mp3", "doorbell notification mp3",
"booking alert sound mp3". Keep it short and not jarring.

> Note: the require path is `require('../assets/sounds/new-request.wav')`
> (relative to `components/`). If you rename the file, update that line.
