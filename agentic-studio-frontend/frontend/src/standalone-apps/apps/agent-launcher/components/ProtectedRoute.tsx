import React from "react";
import { useAuthStore } from "../store/authStore";
import { LoginPage } from "../pages/Login";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback: Fallback,
}) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    if (Fallback) {
      return <Fallback />;
    }

    // Default fallback to login page
    return <LoginPage />;
  }

  return <>{children}</>;
};
