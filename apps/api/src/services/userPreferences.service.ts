import { db } from '../config/database';

const BOOL_FIELDS = [
  'pushNotifications',
  'emailNotifications',
  'locationServices',
  'darkTheme',
] as const;

type BoolField = (typeof BOOL_FIELDS)[number];

const VALID_THEME_MODES = ['light', 'dark', 'system'] as const;
type ThemeMode = (typeof VALID_THEME_MODES)[number];

const SELECT = {
  pushNotifications: true,
  emailNotifications: true,
  locationServices: true,
  darkTheme: true,
  themeMode: true,
} as const;

const pickPreferences = (user: Record<string, any>) => ({
  pushNotifications: user.pushNotifications,
  emailNotifications: user.emailNotifications,
  locationServices: user.locationServices,
  darkTheme: user.darkTheme,
  themeMode: user.themeMode,
});

export const userPreferencesService = {
  get: async (userId: number) => {
    const user = await db.user.findUnique({ where: { id: userId }, select: SELECT });
    if (!user) throw new Error('User not found');
    return { success: true, preferences: pickPreferences(user) };
  },

  update: async (userId: number, data: any) => {
    const sanitized: Partial<Record<BoolField, boolean> & { themeMode: ThemeMode }> = {};

    for (const key of BOOL_FIELDS) {
      if (data[key] !== undefined) {
        (sanitized as any)[key] = Boolean(data[key]);
      }
    }

    if (data.themeMode !== undefined) {
      if (!VALID_THEME_MODES.includes(data.themeMode)) {
        throw new Error('Invalid themeMode');
      }
      sanitized.themeMode = data.themeMode as ThemeMode;
    }

    if (Object.keys(sanitized).length === 0) {
      throw new Error('No valid fields to update');
    }

    const user = await db.user.update({
      where: { id: userId },
      data: sanitized,
      select: SELECT,
    });

    return { success: true, preferences: pickPreferences(user) };
  },
};
