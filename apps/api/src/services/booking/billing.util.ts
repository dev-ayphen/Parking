// Shared parking-fee math. ONE formula, used everywhere so the "current charge"
// shown live on the owner's screen always matches the final amount billed at
// release/self-complete. Never duplicate this math inline — call this helper.
//
// Rule: minimum 30-minute charge, then pro-rata by the hour, rounded to whole
//       rupees. Bill from the rate snapshotted at booking time (ratePerHour),
//       never the space's live rate.
//
//   45 min @ ₹20/hr → round(0.75 * 20) = ₹15
//   18 min @ ₹20/hr → round(max(0.5, 0.3) * 20) = round(0.5 * 20) = ₹10  (min charge)
//   90 min @ ₹20/hr → round(1.5 * 20) = ₹30

/** Billable hours for an elapsed duration, with the 30-min minimum applied. */
export const billableHours = (entry: Date, exit: Date): number => {
  const ms = Math.max(0, exit.getTime() - entry.getTime());
  return Math.max(0.5, ms / (1000 * 60 * 60));
};

/** Final/current charge in whole rupees for an elapsed duration. */
export const computeCharge = (entry: Date, exit: Date, ratePerHour: number): number => {
  return Math.round(billableHours(entry, exit) * (ratePerHour || 0));
};

/** The fixed 30-minute minimum charge for a given rate (display-only). */
export const minimumCharge = (ratePerHour: number): number => {
  return Math.round(0.5 * (ratePerHour || 0));
};
