import { Alert, Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Shared media picker that lets the user choose CAMERA or GALLERY before picking,
 * and handles the right permission for whichever they pick. Returns the selected
 * asset (same shape screens already consume from expo-image-picker) or null if the
 * user cancelled / denied permission.
 *
 * Every upload screen funnels through this so the "Camera vs Gallery" choice and
 * permission handling are identical everywhere — instead of each screen wiring its
 * own gallery-only flow.
 *
 * Usage:
 *   const asset = await pickMedia({ aspect: [1, 1] });
 *   if (!asset) return;            // cancelled or denied
 *   // ...upload asset.uri
 */
export interface PickMediaOptions {
  /** 'images' (default) | 'videos' — what the picker should capture/select. */
  media?: 'images' | 'videos';
  /** Allow the in-picker crop/edit step. Default true for images. */
  allowsEditing?: boolean;
  /** Crop aspect ratio, e.g. [1, 1] for a square avatar. */
  aspect?: [number, number];
  /** Compression 0–1. Default 0.8. */
  quality?: number;
}

type PickedAsset = ImagePicker.ImagePickerAsset;

const mediaTypeFor = (media: 'images' | 'videos') =>
  media === 'videos'
    ? ImagePicker.MediaTypeOptions.Videos
    : ImagePicker.MediaTypeOptions.Images;

async function launchCamera(opts: PickMediaOptions): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Camera access needed',
      'Allow camera access in Settings to take a photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: mediaTypeFor(opts.media ?? 'images'),
    allowsEditing: opts.allowsEditing ?? (opts.media !== 'videos'),
    aspect: opts.aspect,
    quality: opts.quality ?? 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

async function launchGallery(opts: PickMediaOptions): Promise<PickedAsset | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Photo access needed',
      'Allow photo library access in Settings to choose a file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: mediaTypeFor(opts.media ?? 'images'),
    allowsEditing: opts.allowsEditing ?? (opts.media !== 'videos'),
    aspect: opts.aspect,
    quality: opts.quality ?? 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

/**
 * Show a Camera / Gallery action sheet, then run the chosen picker.
 * Resolves with the picked asset or null.
 */
export function pickMedia(opts: PickMediaOptions = {}): Promise<PickedAsset | null> {
  const isVideo = opts.media === 'videos';
  const cameraLabel = isVideo ? 'Record Video' : 'Take Photo';
  const galleryLabel = isVideo ? 'Choose Video' : 'Choose from Gallery';

  return new Promise((resolve) => {
    Alert.alert(
      isVideo ? 'Add Video' : 'Add Photo',
      undefined,
      [
        { text: cameraLabel, onPress: () => launchCamera(opts).then(resolve) },
        { text: galleryLabel, onPress: () => launchGallery(opts).then(resolve) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      // On Android, a back-press / outside-tap should resolve null, not hang.
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
