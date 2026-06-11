import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the error. Replace with Sentry/Bugsnag report in production.
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <AlertTriangle size={42} color="#EF4444" strokeWidth={1.5} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The screen ran into an unexpected error. Tap below to try again.
        </Text>

        {__DEV__ && this.state.error && (
          <ScrollView style={styles.devBox} contentContainerStyle={{ padding: 12 }}>
            <Text style={styles.devLabel}>DEV — error details</Text>
            <Text style={styles.devText}>{this.state.error.message}</Text>
            {this.state.error.stack && (
              <Text style={styles.devStack}>{this.state.error.stack}</Text>
            )}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.button} onPress={this.reset} activeOpacity={0.85}>
          <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 28,
  },
  devBox: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  devText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  devStack: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#64748B',
    lineHeight: 14,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC0159',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
