import Toast from 'react-native-toast-message';

export const toast = {
  error: (message: string) =>
    Toast.show({ type: 'error', text1: message, position: 'top', visibilityTime: 3500 }),
  success: (message: string) =>
    Toast.show({ type: 'success', text1: message, position: 'top', visibilityTime: 2500 }),
  info: (message: string) =>
    Toast.show({ type: 'info', text1: message, position: 'top', visibilityTime: 2500 }),
};
