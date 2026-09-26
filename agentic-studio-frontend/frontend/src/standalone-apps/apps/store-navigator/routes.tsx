import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home/Home";
import Product from "./pages/Product/Product";
import StoreMap from "./pages/StoreMap/StoreMap";
import ChatWindow from "./pages/ChatWindow/ChatWindow";
import { ProtectedRoute } from "../agent-launcher/components/ProtectedRoute";

export const PspSopRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root route - redirect to chat */}
      <Route
        path="/"
        element={<Navigate to="/apps/navigator/home" replace />}
      />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/product/:productId"
        element={
          <ProtectedRoute>
            <Product />
          </ProtectedRoute>
        }
      />

      <Route
        path="/store/:productId"
        element={
          <ProtectedRoute>
            <StoreMap />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatWindow />
          </ProtectedRoute>
        }
      />

      {/* Fallback - redirect to chat */}
      {/* <Route
        path="*"
        element={<Navigate to="/apps/navigator/home" replace />}
      /> */}
    </Routes>
  );
};
