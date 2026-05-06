import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../constants/theme';

// ---------------------------------------------------------------------------
// Fallback UI — functional so it can use hooks if needed later
// ---------------------------------------------------------------------------
function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/splash-icon.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.title}>Algo deu errado 😔</Text>
      <Text style={styles.subtitle}>
        O app encontrou um erro inesperado. Tente novamente.
      </Text>
      {__DEV__ && error && (
        <Text style={styles.devError} numberOfLines={6}>
          {error.message}
        </Text>
      )}
      <TouchableOpacity style={styles.button} onPress={onReset} activeOpacity={0.8}>
        <Text style={styles.buttonLabel}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Class component — required by React for error boundary lifecycle
// ---------------------------------------------------------------------------
interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  icon: {
    width: 80,
    height: 80,
    marginBottom: Spacing.sm,
    opacity: 0.6,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  devError: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.error,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: Spacing.sm,
    width: '100%',
    marginTop: Spacing.sm,
  },
  button: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing['2xl'],
  },
  buttonLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
  },
});
