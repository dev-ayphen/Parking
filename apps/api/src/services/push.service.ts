import { db } from '../config/database';

/**
 * Expo Push Notification sender.
 *
 * Expo exposes a simple HTTPS endpoint — no SDK required. We POST an array of
 * messages; Expo relays them to APNs (iOS) / FCM (Android). Tokens look like
 * `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`.
 *
 * Design: FIRE-AND-FORGET. A push failure must never break the request that
 * triggered it (a booking still succeeds even if the ding doesn't land), so
 * every path here swallows errors and logs instead of throwing. Callers should
 * still `.catch(() => {})` for safety since these return promises.
 *
 * Gating: respects the user's `pushNotifications` preference.
 * Hygiene: clears tokens Expo reports as `DeviceNotRegistered` (app uninstalled).
 *
 * Docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  title: string;
  body: string;
  /** Delivered verbatim to the app — drives deep linking (e.g. { screen, bookingId }). */
  data?: Record<string, unknown>;
}

/** Expo tokens have a strict shape; reject anything else so we don't POST garbage. */
function isExpoToken(token: string | null | undefined): token is string {
  return !!token && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

function buildMessage(to: string, payload: PushPayload) {
  return {
    to,
    sound: 'default',        // device default notification sound
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    priority: 'high',
    channelId: 'parkswift',  // matches the Android channel registered in the app
  };
}

/**
 * POST a batch of already-built messages to Expo, then reconcile the response:
 * any token Expo reports as DeviceNotRegistered is nulled out so we stop trying
 * to reach a dead device. `userIds` is parallel to `tokens` for that cleanup.
 */
async function postBatch(tokens: string[], payload: PushPayload, userIds: number[]): Promise<void> {
  if (tokens.length === 0) return;
  const messages = tokens.map((to) => buildMessage(to, payload));

  let json: any;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    json = await res.json();
  } catch (err) {
    console.error('[PUSH] Expo request failed:', (err as Error)?.message);
    return;
  }

  // Expo returns { data: [ { status, id?, message?, details? }, ... ] } parallel to input.
  const tickets: any[] = json?.data || [];
  await Promise.all(
    tickets.map(async (ticket, idx) => {
      if (ticket?.status !== 'error') return;
      const code = ticket?.details?.error;
      if (code === 'DeviceNotRegistered') {
        const deadUserId = userIds[idx];
        if (deadUserId != null) {
          await db.user
            .update({ where: { id: deadUserId }, data: { expoPushToken: null } })
            .catch(() => {});
        }
      }
      console.error('[PUSH] ticket error:', { code, message: ticket?.message });
    }),
  );
}

/** Send a push to ONE user (respects their preference + token validity). */
async function sendToUser(userId: number, payload: PushPayload): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true, pushNotifications: true },
    });
    if (!user?.pushNotifications) return;
    if (!isExpoToken(user.expoPushToken)) return;
    await postBatch([user.expoPushToken], payload, [userId]);
  } catch (err) {
    console.error('[PUSH] sendToUser failed:', { userId, err: (err as Error)?.message });
  }
}

/** Send the same push to MANY users (broadcasts), batched at Expo's 100/req limit. */
async function sendToMany(userIds: number[], payload: PushPayload): Promise<void> {
  try {
    if (userIds.length === 0) return;
    const users = await db.user.findMany({
      where: { id: { in: userIds }, pushNotifications: true, expoPushToken: { not: null } },
      select: { id: true, expoPushToken: true },
    });
    const valid = users.filter((u) => isExpoToken(u.expoPushToken));
    if (valid.length === 0) return;

    const CHUNK = 100;
    for (let i = 0; i < valid.length; i += CHUNK) {
      const slice = valid.slice(i, i + CHUNK);
      await postBatch(
        slice.map((u) => u.expoPushToken as string),
        payload,
        slice.map((u) => u.id),
      );
    }
  } catch (err) {
    console.error('[PUSH] sendToMany failed:', { count: userIds.length, err: (err as Error)?.message });
  }
}

export const pushService = { sendToUser, sendToMany };
