import { useEffect } from "react";
import { useThemeStore } from "./store";
import { PspStoreHubRoutes } from "./routes";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/psp-storehub.scss";
import { Bounce, ToastContainer } from "react-toastify";
import { useAuthStore } from "../agent-launcher/store/authStore";

export default function PspStoreHubApp() {
  const { theme } = useThemeStore();
  const { initializeAuth } = useAuthStore();

  // Initialize authentication state from session storage
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Apply theme class to body
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove("dark-mode");
    };
  }, [theme]);

  return (
    <ErrorBoundary>
      <div
        className={`psp-storehub-app ${theme === "dark" ? "dark-mode" : ""}`}
      >
        <PspStoreHubRoutes />
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable={false}
          pauseOnHover
          theme={theme}
          transition={Bounce}
        />
      </div>
    </ErrorBoundary>
  );
}
