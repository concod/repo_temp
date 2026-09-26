import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

type ProtectedRouteProps = {
    children: ReactNode;
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated, isInitialized } = useAuthStore();
    const location = useLocation();

    if (!isInitialized) {
        return null;
    }

    if (!isAuthenticated) {
        return <Navigate to="../login" replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
};
