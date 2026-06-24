/**
 * Space-availability helpers.
 *
 * Custom-hours times are stored as 12-hour strings like "09:00 AM" / "06:00 PM"
 * (see Space.startTime / Space.endTime). Owners set these in IST, and parkers
 * are in India, so all "is it open now?" checks are evaluated in IST regardless
 * of the server's own timezone.
 */

const IST_OFFSET_MINUTES = 5 * 60 + 30; // +05:30

/** Parse "09:00 AM" / "6:00 PM" → minutes since midnight (0–1439), or null if unparseable. */
export const parseTimeToMinutes = (raw?: string | null): number | null => {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (hour < 1 || hour > 12 || min < 0 || min > 59) return null;
  if (ampm === 'AM') hour = hour === 12 ? 0 : hour; // 12 AM → 0
  else hour = hour === 12 ? 12 : hour + 12;        // 12 PM → 12, others + 12
  return hour * 60 + min;
};

/** Minutes-since-midnight for a given instant, expressed in IST. */
export const istMinutesOfDay = (at: Date = new Date()): number => {
  // Shift the UTC timestamp into IST, then read the wall-clock minutes.
  const istMs = at.getTime() + IST_OFFSET_MINUTES * 60_000;
  const ist = new Date(istMs);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
};

/** IST day-of-week (0 = Sun … 6 = Sat) for a given instant. */
export const istDayOfWeek = (at: Date = new Date()): number => {
  const istMs = at.getTime() + IST_OFFSET_MINUTES * 60_000;
  return new Date(istMs).getUTCDay();
};

/**
 * Is the space open at instant `at`, given its availability config?
 * - '24 Hours'      → always open
 * - 'Weekdays Only' → open Mon–Fri (closed Sat/Sun), all day
 * - 'Custom Hours'  → open only within [startTime, endTime); supports overnight
 *                     ranges (e.g. 10:00 PM – 06:00 AM)
 * Unknown/unset config defaults to open (fail-open, so a misconfigured space is
 * never silently unbookable).
 */
export const isSpaceOpenAt = (
  space: { availability?: string | null; startTime?: string | null; endTime?: string | null },
  at: Date = new Date(),
): boolean => {
  const availability = space.availability ?? '24 Hours';

  if (availability === '24 Hours') return true;

  if (availability === 'Weekdays Only') {
    const dow = istDayOfWeek(at);
    return dow >= 1 && dow <= 5; // Mon–Fri
  }

  if (availability === 'Custom Hours') {
    const start = parseTimeToMinutes(space.startTime);
    const end = parseTimeToMinutes(space.endTime);
    if (start === null || end === null) return true; // can't parse → fail open
    const now = istMinutesOfDay(at);
    if (start === end) return true;                  // degenerate → treat as 24h
    if (start < end) return now >= start && now < end;          // same-day window
    return now >= start || now < end;                            // overnight window
  }

  return true; // unknown config → open
};

/** Human-readable hours label, e.g. "9:00 AM – 6:00 PM" (for error messages). */
export const hoursLabel = (
  space: { availability?: string | null; startTime?: string | null; endTime?: string | null },
): string => {
  if (space.availability === 'Custom Hours' && space.startTime && space.endTime) {
    return `${space.startTime} – ${space.endTime}`;
  }
  if (space.availability === 'Weekdays Only') return 'weekdays (Mon–Fri)';
  return '24 hours';
};
