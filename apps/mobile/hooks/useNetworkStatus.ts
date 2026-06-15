import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected && state.isInternetReachable !== false);
    });
    return unsub;
  }, []);

  return { isConnected };
}
