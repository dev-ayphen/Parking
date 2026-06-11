import { db } from '../config/database';

// Preference fields live directly on the User table.
// Keys match exactly what the mobile settings screen sends/reads.
const PREFERENCE_FIELDS = [
  'pushNotifications',
  'emailNotifications',
  'locationServices',
  'darkTheme',
] as const;

type PreferenceKey = (typeof PREFERENCE_FIELDS)[number];

const pickPreferences = (user: Record<string, any>) => ({
  pushNotifications: user.pushNotifications,
  emailNotifications: user.emailNotifications,
  locationServices: user.locationServices,
  darkTheme: user.darkTheme,
});

export const userPreferencesService = {
  get: async (userId: number) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        pushNotifications: true,
        emailNotifications: true,
        locationServices: true,
        darkTheme: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { success: true, preferences: pickPreferences(user) };
  },

  update: async (userId: number, data: any) => {
    const sanitized: Partial<Record<PreferenceKey, boolean>> = {};

    for (const key of PREFERENCE_FIELDS) {
      if (data[key] !== undefined) {
        sanitized[key] = Boolean(data[key]);
      }
    }

    if (Object.keys(sanitized).length === 0) {
      throw new Error('No valid fields to update');
    }

    const user = await db.user.update({
      where: { id: userId },
      data: sanitized,
      select: {
        pushNotifications: true,
        emailNotifications: true,
        locationServices: true,
        darkTheme: true,
      },
    });

    return { success: true, preferences: pickPreferences(user) };
  },
};
