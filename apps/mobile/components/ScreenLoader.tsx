import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Spinner from './Loading/Spinner';

interface ScreenLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

const ScreenLoader: React.FC<ScreenLoaderProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  const inner = (
    <View style={styles.inner}>
      <Spinner size={40} color="#DC0159" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );

  if (fullScreen) {
    return <SafeAreaView style={styles.fullScreen}>{inner}</SafeAreaView>;
  }

  return <View style={styles.flex}>{inner}</View>;
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ScreenLoader;
