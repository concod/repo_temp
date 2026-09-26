import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { IBAgentLanding } from "./components/Landing/IBAgentLanding";
import { LoginPage, SignUpPage, ProtectedRoute } from "./components/Auth";
import { useAuthStore } from "./store/authStore";

export const IBAgentRoutes: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate("../chat", { replace: true, relative: "path" });
  };

  const handleNavigateToSignUp = () => {
    navigate("../signup", { replace: true, relative: "path" });
  };

  const handleNavigateToLogin = () => {
    navigate("../login", { replace: true, relative: "path" });
  };

  const handleSignUpSuccess = () => {
    navigate("../login", { replace: true, relative: "path" });
  };

  return (
    <Routes>
      <Route
        index
        element={
          isAuthenticated ? (
            <Navigate to="chat" replace />
          ) : (
            <Navigate to="login" replace />
          )
        }
      />
      <Route
        path="login"
        element={
          isAuthenticated ? (
            <Navigate to="../chat" replace relative="path" />
          ) : (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onNavigateToSignUp={handleNavigateToSignUp}
            />
          )
        }
      />
      <Route
        path="signup"
        element={
          isAuthenticated ? (
            <Navigate to="../chat" replace relative="path" />
          ) : (
            <SignUpPage
              onSignUpSuccess={handleSignUpSuccess}
              onBackToLogin={handleNavigateToLogin}
            />
          )
        }
      />
      <Route
        path="chat"
        element={
          <ProtectedRoute>
            <IBAgentLanding />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
};

