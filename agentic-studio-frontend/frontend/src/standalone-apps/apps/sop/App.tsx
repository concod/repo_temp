import { useEffect } from "react";
import { useThemeStore } from "./store";
import { PspSopRoutes } from "./routes";
import "./styles/psp-sop.scss";
import { Bounce, ToastContainer } from "react-toastify";
import { useAuthStore } from "../agent-launcher/store/authStore";

export default function PspSopApp() {
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
    <div className={`psp-sop-app ${theme === "dark" ? "dark-mode" : ""}`}>
      <PspSopRoutes />
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
  );
}
