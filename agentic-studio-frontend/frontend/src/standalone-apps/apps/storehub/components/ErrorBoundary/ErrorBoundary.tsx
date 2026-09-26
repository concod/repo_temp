import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }



  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError && error) {
      
      

      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <h2 style={{ color: '#FF4B4B', marginBottom: '1rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            {error.message || 'An unexpected error occurred'}
          </p>
          
        </div>
      );
    }

    return children;
  }
}