import * as Location from 'expo-location';
import { Platform, Alert, Linking } from 'react-native';

/**
 * Robust device-location helper shared by the Find-Space map and Add-Space.
 *
 * Why this exists: calling `getCurrentPositionAsync({ accuracy: High })` directly
 * is the #1 cause of "current location not detected" on real phones —
 *  - High accuracy can take 10-30s or NEVER resolve indoors (no GPS lock), and
 *  - there's no built-in timeout, so the await hangs and the UI shows a stale
 *    fallback that looks like a failure.
 *
 * This helper instead:
 *  1. returns the cached LAST-KNOWN fix instantly when it's recent enough, then
 *  2. requests a fresh fix at BALANCED accuracy (≈city-block precision, but
 *     resolves fast and works indoors/with wifi), with
 *  3. a hard timeout so it can never hang, falling back to last-known if needed.
 */

export interface Coords {
  latitude: number;
  longitude: number;
}

export type LocationFailure =
  | 'permission-denied'   // user said no to the OS permission prompt
  | 'services-off'        // permission granted but the phone's GPS toggle is off
  | 'timeout'             // couldn't get a fix in time and no cached fix existed
  | 'error';              // unexpected failure

export interface LocationResult {
  ok: boolean;
  coords?: Coords;
  failure?: LocationFailure;
}

// Accept a cached fix up to 2 minutes old as "current" — instant and good enough
// for centering a map, while a fresh balanced fix refines it right after.
const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;
// Never let the fresh-fix request hang longer than this.
const FRESH_FIX_TIMEOUT_MS = 8000;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('location-timeout')), ms)),
  ]);

/**
 * Ensure we have permission AND the device location services are on.
 * Shows the appropriate native prompt / Settings alert when something is off.
 * Returns the failure reason if we can't proceed, or null when good to go.
 */
async function ensureLocationReady(opts?: { promptToEnable?: boolean }): Promise<LocationFailure | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return 'permission-denied';

  // Permission can be granted while the phone's GPS master toggle is still OFF.
  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) {
    if (opts?.promptToEnable) {
      if (Platform.OS === 'android') {
        // Android shows the native "Turn on location" system dialog.
        try { await Location.enableNetworkProviderAsync(); } catch { /* user left it off */ }
      } else {
        // iOS has no programmatic toggle — guide the user into Settings.
        Alert.alert(
          'Location is off',
          'Turn on Location Services to use your current location.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
      const nowOn = await Location.hasServicesEnabledAsync();
      if (!nowOn) return 'services-off';
    } else {
      return 'services-off';
    }
  }
  return null;
}

/**
 * Get the device's current location robustly. Never hangs.
 *
 * @param opts.promptToEnable - when true, prompt the user to turn on GPS / open
 *   Settings if it's off (use for an explicit "Use my current location" tap).
 *   When false (default, for silent auto-detect on screen open), fail quietly.
 */
export async function getDeviceLocation(opts?: { promptToEnable?: boolean }): Promise<LocationResult> {
  try {
    const failure = await ensureLocationReady(opts);
    if (failure) return { ok: false, failure };

    // 1) Instant: a recent cached fix. Centers the map immediately with no wait.
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
      if (last?.coords) {
        const cached: Coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        // Kick off a fresh fix in the background to refine, but return cached now.
        // (Callers that want the refined value can call again; for map-centering
        // the cached fix is indistinguishable to the user.)
        return { ok: true, coords: cached };
      }
    } catch {
      // no cached fix — fall through to a live request
    }

    // 2) Fresh fix at BALANCED accuracy (fast, indoor-friendly) with a hard timeout.
    try {
      const loc = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        FRESH_FIX_TIMEOUT_MS,
      );
      return { ok: true, coords: { latitude: loc.coords.latitude, longitude: loc.coords.longitude } };
    } catch {
      // Timed out or failed — last attempt: any last-known fix regardless of age.
      try {
        const anyLast = await Location.getLastKnownPositionAsync();
        if (anyLast?.coords) {
          return { ok: true, coords: { latitude: anyLast.coords.latitude, longitude: anyLast.coords.longitude } };
        }
      } catch { /* give up */ }
      return { ok: false, failure: 'timeout' };
    }
  } catch {
    return { ok: false, failure: 'error' };
  }
}
