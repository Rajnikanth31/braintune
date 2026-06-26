import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../theme/colors';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error?: Error;
  info?: string;
}

/**
 * Top-level safety net. Catches any JavaScript render/runtime error in the tree
 * below it and shows a friendly recovery screen *with the error text* instead of
 * a white-screen crash. Surfacing the message lets a parent screenshot it on a
 * device where the app fails, which is invaluable for diagnosing device-specific
 * crashes.
 *
 * Note: this catches JS errors only — it cannot catch pure-native crashes. For
 * those, capture `adb logcat` or the Play Console crash report.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Keep a copy for display; also log for adb/Metro.
    this.setState({ info: info?.componentStack });
    console.error('Braintune crashed:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, info: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, info } = this.state;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>🤖</Text>
          <Text style={styles.title}>Oops! Something hiccuped.</Text>
          <Text style={styles.subtitle}>
            Don't worry — tap below to try again. If it keeps happening, please
            show this screen to a grown-up.
          </Text>

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again 🔄</Text>
          </TouchableOpacity>

          <View style={styles.detailsBox}>
            <Text style={styles.detailsLabel}>Technical details</Text>
            <Text style={styles.detailsText} selectable>
              {error?.toString() || 'Unknown error'}
            </Text>
            {info ? (
              <Text style={styles.detailsStack} selectable numberOfLines={12}>
                {info.trim()}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 18,
    marginBottom: 24,
  },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  detailsBox: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailsText: { fontSize: 13, color: COLORS.secondary, marginBottom: 8 },
  detailsStack: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },
});
