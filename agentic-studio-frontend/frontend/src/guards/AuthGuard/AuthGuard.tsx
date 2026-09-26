import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isValidInternalPath } from '../../utils/navigationSecurity';
import Spinner from '../../components/Spinner/Spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
}

/**
 * AuthGuard component that protects routes based on authentication status
 * 
 * Features:
 * - Redirects unauthenticated users to "/" (which redirects to "/login")
 * - Allows access to public routes without authentication
 * - Automatically clears invalid tokens
 * - Preserves the attempted route for post-login redirect (optional enhancement)
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiresAuth = true 
}) => {
  const location = useLocation();
  const { isLoggedIn, isLoading } = useAuth();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="loading-overlay">
        <Spinner />
      </div>
    );
  }

  // If route doesn't require auth, allow access
  if (!requiresAuth) {
    return <>{children}</>;
  }

  // If route requires auth but user is not logged in, redirect to home
  if (requiresAuth && !isLoggedIn) {
    // Store the attempted URL for potential redirect after login (with validation)
    const attemptedUrl = location.pathname + location.search;
    if (attemptedUrl !== '/' && attemptedUrl !== '/login' && isValidInternalPath(attemptedUrl)) {
      sessionStorage.setItem('redirectAfterLogin', attemptedUrl);
    }
    
    return <Navigate to="/" replace />;
  }

  // User is authenticated and route requires auth, allow access
  return <>{children}</>;
};

export default AuthGuard;
