import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Spinner from './Loading/Spinner';
import { useTheme } from '../hooks/useTheme';

interface ScreenLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

const ScreenLoader: React.FC<ScreenLoaderProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  const { colors } = useTheme();

  const inner = (
    <View style={styles.inner}>
      <Spinner size={40} color={colors.primary} />
      {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
    </View>
  );

  if (fullScreen) {
    return (
      <SafeAreaView style={[styles.fullScreen, { backgroundColor: colors.screenBg }]}>
        {inner}
      </SafeAreaView>
    );
  }

  return <View style={styles.flex}>{inner}</View>;
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
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
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ScreenLoader;
