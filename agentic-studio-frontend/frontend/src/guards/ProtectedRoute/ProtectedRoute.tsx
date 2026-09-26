import React from 'react';
import { AuthGuard } from '../AuthGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
}

/**
 * ProtectedRoute wrapper component that uses AuthGuard internally
 * This provides a cleaner API for wrapping individual routes
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiresAuth = true 
}) => {
  return (
    <AuthGuard requiresAuth={requiresAuth}>
      {children}
    </AuthGuard>
  );
};

export default ProtectedRoute;
