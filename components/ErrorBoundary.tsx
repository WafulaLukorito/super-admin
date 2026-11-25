import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Hourglass</Text>
            <Text style={styles.subtitle}>An unexpected error occurred while rendering</Text>
            
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error?.toString() || 'Unknown error'}
              </Text>
              {this.state.errorInfo?.componentStack && (
                <Text style={styles.stackText}>
                  {this.state.errorInfo.componentStack.slice(0, 500)}
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ED3A3',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A8B5B0',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  errorText: {
    color: '#F43F5E',
    fontFamily: 'monospace',
    fontSize: 13,
    marginBottom: 8,
  },
  stackText: {
    color: '#6E7A75',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  button: {
    backgroundColor: '#2ED3A3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#101A17',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
