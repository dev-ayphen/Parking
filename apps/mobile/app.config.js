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
    version: '0.0.1',
    orientation: 'portrait',
    scheme: 'parkswift',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
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
