import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ChatContainer } from "./components/Chat/ChatContainer";
import { ProtectedRoute } from "../agent-launcher/components/ProtectedRoute";

export const LabelComplianceCheckerRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root route - redirect to chat */}
      <Route
        path="/"
        element={<Navigate to="/apps/label-compliance-agent/chat" replace />}
      />

      {/* Chat route - directly accessible */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatContainer />
          </ProtectedRoute>
        }
      />

      {/* Fallback - redirect to chat */}
      {/* <Route
        path="*"
        element={<Navigate to="/apps/label-compliance-agent/chat" replace />}
      /> */}
    </Routes>
  );
};
