import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Home from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { SignUpPage } from "./pages/SignUp";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const AgentLauncherRoutes: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate("/apps/agent-studio/home");
  };

  const handleNavigateToLogin = () => {
    navigate("/apps/agent-studio/");
  };

  return (
    <Routes>
      {/* Root route - show login or redirect to chat */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/apps/agent-studio/home" replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      {/* Sign up route */}
      <Route
        path="/signup"
        element={
          isAuthenticated ? (
            <Navigate to="/apps/agent-studio/home" replace />
          ) : (
            <SignUpPage onSignUpSuccess={handleNavigateToLogin} />
          )
        }
      />

      {/* Protected route */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* Fallback - redirect to root */}
      <Route path="*" element={<Navigate to="/apps/agent-studio/" replace />} />
    </Routes>
  );
};
