import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ChatContainer } from "./components/Chat/ChatContainer";
import { AppLayout } from "./components/Layout";
import { Dashboard, StoreDeepDive } from "./components/Dashboard";
import ChatHistoryPage from "./components/Chat/ChatHistory";
import { ProtectedRoute } from "../agent-launcher/components/ProtectedRoute";

export const PspStoreHubRoutes: React.FC = () => {
  // const { isAuthenticated } = useAuthStore();
  // const navigate = useNavigate();

  // const handleLoginSuccess = () => {
  //   navigate("/apps/store-data-analyst/dashboard");
  // };

  // const handleNavigateToSignUp = () => {
  //   navigate("/apps/store-data-analyst/signup");
  // };

  // const handleNavigateToLogin = () => {
  //   navigate("/apps/store-data-analyst/");
  // };

  return (
    <Routes>
      {/* Root route - show login or redirect to dashboard */}
      {/* <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/apps/store-data-analyst/dashboard" replace />
          ) : (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onNavigateToSignUp={handleNavigateToSignUp}
            />
          )
        }
      /> */}

      {/* Sign up route */}
      {/* <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to="/apps/store-data-analyst/dashboard" replace />
          ) : (
            <SignUpPage
              onSignUpSuccess={handleNavigateToLogin}
              onBackToLogin={handleNavigateToLogin}
            />
          )
        }
      /> */}

      <Route
        path="/"
        element={<Navigate to="/apps/store-data-analyst/dashboard" replace />}
      />

      {/* Protected dashboard route */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected chat route */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ChatContainer />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat/:sessionId/:sessionTitle"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ChatHistoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Protected store deep dive route */}
      <Route
        path="/store-deep-dive"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StoreDeepDive />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback - redirect to root */}
      {/* <Route
        path="*"
        element={<Navigate to="/apps/store-data-analyst/" replace />}
      /> */}
    </Routes>
  );
};
