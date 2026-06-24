import Toast from 'react-native-toast-message';

/**
 * react-native-toast-message passes text1/text2 straight to the native bridge,
 * which REQUIRES a string. If a caller accidentally passes an object (e.g. a raw
 * Error, an API error payload, or a ReadableNativeMap), the app crashes with
 * "Value for message cannot be cast from ReadableNativeMap to String".
 *
 * So we coerce EVERYTHING to a safe string here — the toast helper can never be
 * the source of that crash again, no matter what a caller throws at it.
 */
const toMessage = (input: unknown, fallback = 'Something went wrong'): string => {
  if (input == null) return fallback;
  if (typeof input === 'string') return input.trim() || fallback;
  if (typeof input === 'number' || typeof input === 'boolean') return String(input);
  if (input instanceof Error) return input.message || fallback;
  if (typeof input === 'object') {
    const o = input as Record<string, unknown>;
    const candidate = o.message ?? o.error ?? o.msg ?? o.text1;
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    try {
      const json = JSON.stringify(input);
      return json && json !== '{}' ? json : fallback;
    } catch {
      return fallback;
    }
  }
  return String(input);
};

export const toast = {
  error: (message: unknown) =>
    Toast.show({ type: 'error', text1: toMessage(message), position: 'top', visibilityTime: 3500 }),
  success: (message: unknown) =>
    Toast.show({ type: 'success', text1: toMessage(message, 'Done'), position: 'top', visibilityTime: 2500 }),
  info: (message: unknown) =>
    Toast.show({ type: 'info', text1: toMessage(message, ''), position: 'top', visibilityTime: 2500 }),
};
