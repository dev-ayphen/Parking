// Dynamic Expo config — reads the Google Maps API key from the environment
// (EXPO_PUBLIC_MAP_API_KEY in .env) so it isn't hard-coded into version control.
// Replaces the static app.json.

const RAW_KEY = process.env.EXPO_PUBLIC_MAP_API_KEY || '';
// Only treat it as a real key if it isn't the placeholder. When there's no real
// key, we OMIT the googleMaps config entirely so Expo Go falls back to its own
// bundled key (otherwise an invalid "dummy" key makes the Android map blank).
const HAS_REAL_KEY = RAW_KEY && RAW_KEY !== 'dummy';

// iOS map config — only set when a real key exists
const iosConfig = HAS_REAL_KEY ? { googleMapsApiKey: RAW_KEY } : undefined;
// Android map config — only set when a real key exists
const androidConfig = HAS_REAL_KEY ? { googleMaps: { apiKey: RAW_KEY } } : undefined;

module.exports = {
  expo: {
    name: 'ParkSwift',
    slug: 'parkswift',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'parkswift',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    // ──────────────────────────────────────────────────────────────────────
    // PUSH NOTIFICATIONS — production credentials.
    // `projectId` is REQUIRED for getExpoPushTokenAsync() in a production/EAS
    // build (it works without one only inside Expo Go). Run `eas init` to create
    // the project, then paste the generated id here (or set EAS_PROJECT_ID in env).
    // Until this is real, production builds cannot obtain a push token.
    // ──────────────────────────────────────────────────────────────────────
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID || '', // TODO: set via `eas init`
      },
    },
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.hari11.parkswift',
      ...(iosConfig ? { config: iosConfig } : {}),
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'ParkSwift uses your location to find nearby parking spaces.',
        NSCameraUsageDescription:
          'ParkSwift needs camera access to capture photos of your parking space.',
        NSPhotoLibraryUsageDescription:
          'ParkSwift needs photo library access to upload parking space photos and videos.',
      },
      // iOS OTP autofill — tells the system this field expects a one-time code
      // from SMS so it offers the "123456 from Messages" keyboard suggestion.
      usesNonExemptEncryption: false,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.hari11.parkswift',
      ...(androidConfig ? { config: androidConfig } : {}),
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'RECEIVE_SMS',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-status-bar',
      'expo-video',
      'expo-audio',
      [
        // Registers the native location module + permission strings for EAS/
        // production builds. Without this, foreground-location requests can fail
        // to set up correctly outside Expo Go (current location "not detected").
        'expo-location',
        {
          locationWhenInUsePermission:
            'ParkSwift uses your location to find nearby parking spaces.',
          isAndroidForegroundServiceEnabled: false,
        },
      ],
      '@react-native-community/datetimepicker',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#DC0159',
          defaultChannel: 'parkswift',
          sounds: [],
        },
      ],
    ],
  },
};
