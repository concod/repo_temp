import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChatContainer } from './components/Chat/ChatContainer';
import { LoginPage, SignUpPage, ProtectedRoute } from './components/Auth';
import { AppLayout } from './components/Layout';
import { Dashboard, StoreDeepDive } from './components/Dashboard';
import { useAuthStore } from './store/authStore';

export const PspStoreHubRoutes: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/apps/psp-storehub/dashboard');
  };

  const handleNavigateToSignUp = () => {
    navigate('/apps/psp-storehub/signup');
  };

  const handleNavigateToLogin = () => {
    navigate('/apps/psp-storehub/');
  };

  return (
    <Routes>
      {/* Root route - show login or redirect to dashboard */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/apps/psp-storehub/dashboard" replace />
          ) : (
            <LoginPage 
              onLoginSuccess={handleLoginSuccess}
              onNavigateToSignUp={handleNavigateToSignUp}
            />
          )
        } 
      />

      {/* Sign up route */}
      <Route 
        path="/signup" 
        element={
          isAuthenticated ? (
            <Navigate to="/apps/psp-storehub/dashboard" replace />
          ) : (
            <SignUpPage 
              onSignUpSuccess={handleNavigateToLogin}
              onBackToLogin={handleNavigateToLogin}
            />
          )
        } 
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
      <Route path="*" element={<Navigate to="/apps/psp-storehub/" replace />} />
    </Routes>
  );
};
