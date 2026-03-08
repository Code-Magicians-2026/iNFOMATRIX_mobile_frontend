import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  isDark: boolean;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Unhandled app error:', error, errorInfo.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, isDark } = this.props;

    if (!error) {
      return children;
    }

    return (
      <View
        style={[styles.container, { backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7' }]}
        accessible
        importantForAccessibility="yes"
      >
        <Text style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]} allowFontScaling>
          Сталася помилка
        </Text>
        <Text
          style={[styles.subtitle, { color: isDark ? '#b8b8bd' : '#555555' }]}
          numberOfLines={3}
          accessibilityRole="alert"
          allowFontScaling
        >
          {error.message || 'Щось пішло не так.'}
        </Text>
        <Pressable
          onPress={this.handleRetry}
          style={styles.button}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
          accessibilityRole="button"
          accessibilityLabel="Спробувати ще раз"
          accessibilityHint="Повторно рендерить екран після помилки"
          importantForAccessibility="yes"
        >
          <Text style={styles.buttonText} allowFontScaling>
            Спробувати ще раз
          </Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#ff2d55',
    borderRadius: 10,
    minHeight: 44,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default AppErrorBoundary;
