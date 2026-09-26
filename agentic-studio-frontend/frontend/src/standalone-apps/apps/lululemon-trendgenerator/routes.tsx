import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatContainer } from './components/Chat/ChatContainer.tsx';

export const LululemonTrendRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root route - public chat */}
      <Route 
        path="/" 
        element={<ChatContainer />} 
      />

      {/* Explicit chat route */}
      <Route 
        path="/chat" 
        element={<ChatContainer />} 
      />

      {/* Fallback - redirect to root */}
      <Route path="*" element={<Navigate to="/apps/lululemon-trendgenerator/" replace />} />
    </Routes>
  );
};

 