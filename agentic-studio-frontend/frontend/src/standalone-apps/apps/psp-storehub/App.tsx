import { useEffect } from 'react';
import { useThemeStore } from './store';
import { useAuthStore } from './store/authStore';
import { PspStoreHubRoutes } from './routes';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/psp-storehub.scss';

export default function PspStoreHubApp() {
  const { theme } = useThemeStore();
  const { initializeAuth } = useAuthStore();

  // Initialize authentication state from session storage
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Apply theme class to body
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('dark-mode');
    };
  }, [theme]);

  return (
    <ErrorBoundary>
      <div className={`psp-storehub-app ${theme === 'dark' ? 'dark-mode' : ''}`}>
        <PspStoreHubRoutes />
      </div>
    </ErrorBoundary>
  );
}
