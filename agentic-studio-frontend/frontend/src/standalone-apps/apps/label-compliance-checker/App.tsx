import { useEffect } from "react";
import { useThemeStore } from "./store/index";
import { LabelComplianceCheckerRoutes } from "./routes";
import "./styles/label-compliance-checker.scss";
import { Bounce, ToastContainer } from "react-toastify";
import { useAuthStore } from "../agent-launcher/store/authStore";

export default function LabelComplianceCheckerApp() {
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

  //   to rename the class names later
  return (
    <div className={`psp-sop-app ${theme === "dark" ? "dark-mode" : ""}`}>
      <LabelComplianceCheckerRoutes />
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
