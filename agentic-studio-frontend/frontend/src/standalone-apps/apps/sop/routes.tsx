import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
// import { useAuthStore } from "./store/authStore";
// import { SignUpPage } from "./pages/SignUpPage";
// import { LoginPage } from "./pages/LoginPage";
import Chat from "./pages/Chat";
import Layout from "./components/Layout/Layout";
import ChatHistoryPage from "./pages/ChatHistory";
import { ProtectedRoute } from "../agent-launcher/components/ProtectedRoute";

export const PspSopRoutes: React.FC = () => {
  // const { isAuthenticated } = useAuthStore();
  // const navigate = useNavigate();

  // const handleLoginSuccess = () => {
  //   navigate("/apps/sop/chat");
  // };

  // const handleNavigateToSignUp = () => {
  //   navigate("/apps/sop/signup");
  // };

  // const handleNavigateToLogin = () => {
  //   navigate("/apps/sop/");
  // };

  return (
    <Routes>
      {/* Root route - show login or redirect to chat */}
      {/* <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/apps/sop/chat" replace />
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
            <Navigate to="/apps/sop/chat" replace />
          ) : (
            <SignUpPage
              onSignUpSuccess={handleNavigateToLogin}
              onBackToLogin={handleNavigateToLogin}
            />
          )
        }
      /> */}

      <Route path="/" element={<Navigate to="/apps/sop/chat" replace />} />

      {/* Protected chat route */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Layout>
              <Chat />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat/:sessionId"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatHistoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback - redirect to root */}
      {/* <Route path="*" element={<Navigate to="/apps/sop/" replace />} /> */}
    </Routes>
  );
};
