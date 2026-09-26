import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ChatContainer } from './components/Chat/ChatContainer';
import { LoginPage, SignUpPage, ProtectedRoute } from './components/Auth';
import { useAuthStore } from './store/authStore';

export const PspSopRoutes: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/apps/psp-sop/chat');
  };


  const handleNavigateToSignUp = () => {
    navigate('/apps/psp-sop/signup');
  };

  const handleNavigateToLogin = () => {
    navigate('/apps/psp-sop/');
  };

  return (
    <Routes>
      {/* Root route - show login or redirect to chat */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            <Navigate to="/apps/psp-sop/chat" replace />
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
            <Navigate to="/apps/psp-sop/chat" replace />
          ) : (
            <SignUpPage 
              onSignUpSuccess={handleNavigateToLogin}
              onBackToLogin={handleNavigateToLogin}
            />
          )
        } 
      />
      
      {/* Protected chat route */}
      <Route 
        path="/chat" 
        element={
          <ProtectedRoute>
            <ChatContainer />
          </ProtectedRoute>
        } 
      />
      
      {/* Fallback - redirect to root */}
      <Route path="*" element={<Navigate to="/apps/psp-sop/" replace />} />
    </Routes>
  );
};
