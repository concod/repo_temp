import { useEffect } from 'react';
import { useThemeStore } from './store';
import { LululemonTrendRoutes } from './routes';
import './styles/lululemon-trendgenerator.scss';

export default function LululemonTrendApp() {
  const { theme } = useThemeStore();

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
    <div className={`lululemon-trend-app ${theme === 'dark' ? 'dark-mode' : ''}`}>
      <LululemonTrendRoutes />
    </div>
  );
}


