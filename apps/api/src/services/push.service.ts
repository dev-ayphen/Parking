import { db } from '../config/database';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendToUser(userId: number, payload: PushPayload): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { expoPushToken: true, pushNotifications: true } });
  if (!user?.expoPushToken || !user.pushNotifications) return;
  await sendToToken(user.expoPushToken, payload);
}

async function sendToMany(userIds: number[], payload: PushPayload): Promise<void> {
  const users = await db.user.findMany({
    where: { id: { in: userIds }, pushNotifications: true, expoPushToken: { not: null } },
    select: { expoPushToken: true },
  });
  const tokens = users.map((u) => u.expoPushToken!).filter(Boolean);
  if (!tokens.length) return;

  // Expo push API accepts up to 100 per request
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100).map((to) => ({ to, sound: 'default', title: payload.title, body: payload.body, data: payload.data || {} }));
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
  }
}

async function sendToToken(token: string, payload: PushPayload): Promise<void> {
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ to: token, sound: 'default', title: payload.title, body: payload.body, data: payload.data || {} }),
  });
}

export const pushService = { sendToUser, sendToMany, sendToToken };
