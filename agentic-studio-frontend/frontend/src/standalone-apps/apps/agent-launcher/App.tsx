import { ErrorBoundary } from "./components/ErrorBoundary";
import "./App.scss";
import { AgentLauncherRoutes } from "./Routes";
import { useAuthStore } from "./store/authStore";
import { useEffect } from "react";

export default function AgentLauncher() {
  const { initializeAuth } = useAuthStore();

  // Initialize authentication state from session storage
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ErrorBoundary>
      <div className="app">
        <AgentLauncherRoutes />
      </div>
    </ErrorBoundary>
  );
}
