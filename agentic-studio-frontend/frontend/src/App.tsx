import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Suspense } from 'react'
import { getAllRoutes } from './config/routes'
import Spinner from './components/Spinner/Spinner'
import { AppLayout } from './components/Layout'
import { StudioChatbot } from './components/StudioChatbot'
import { AuthGuard } from './guards'
import { AuthProvider } from './contexts/AuthContext'

const standaloneAliasPrefixes = ['/ib-bi-agent', '/banner-agent']

function App() {
  const routes = getAllRoutes();
  const location = useLocation();

  // Hide chatbot on login page and standalone apps.
  const hideChatbot = location.pathname === '/login' ||
    location.pathname === '/' ||
    location.pathname.startsWith('/apps/') ||
    standaloneAliasPrefixes.some((prefix) => location.pathname.startsWith(prefix));

  const renderRoute = (route: any) => {
    const Component = route.component;
    const requiresAuth = route.requiresAuth !== false; // Default to true unless explicitly set to false

    const routeContent = route.useLayout ? (
      <AppLayout
        showBreadcrumb={route.layoutProps?.showBreadcrumb}
        breadcrumbProps={route.layoutProps?.breadcrumbProps}
        className={route.layoutProps?.className}
        contentClassName={route.layoutProps?.contentClassName}
      >
        <Component />
      </AppLayout>
    ) : (
      <Component />
    );

    // Wrap with AuthGuard for authentication protection
    return (
      <AuthGuard requiresAuth={requiresAuth}>
        {routeContent}
      </AuthGuard>
    );
  };

  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="loading-overlay">
          <Spinner />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={renderRoute(route)}
            />
          ))}
        </Routes>
      </Suspense>

      {/* Global Studio Chatbot - Available on all pages except login */}
      {!hideChatbot && (
        <StudioChatbot
          position="bottom-right"
          theme="light"
        />
      )}
    </AuthProvider>
  )
}

export default App