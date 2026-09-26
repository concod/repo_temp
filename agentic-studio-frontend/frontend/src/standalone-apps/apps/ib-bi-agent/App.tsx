import { useState, useEffect } from "react";
import { IBAgentRoutes } from "./routes";
import IBIcon from "./assets/ib-icon.svg";
import { useAuthStore } from "./store/authStore";
import "./styles/ib-agent.scss";

const IB_BI_UNAUTHORIZED_EVENT = "ib-bi-agent:unauthorized";

export default function IBAgentApp() {
  const [isLoading, setIsLoading] = useState(true);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    initializeAuth();

    // Hide loader after component mounts
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Small delay to show the icon

    return () => clearTimeout(timer);
  }, [initializeAuth]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener(IB_BI_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(IB_BI_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [logout]);

  if (isLoading) {
    return (
      <div className="ib-agent-app">
        <div className="ib-agent-app__loader">
          <img src={IBIcon} alt="IB Agent" className="ib-agent-app__loader-icon" />
        </div>
      </div>
    );
  }

  return (
    <div className="ib-agent-app">
      <IBAgentRoutes />
    </div>
  );
}

