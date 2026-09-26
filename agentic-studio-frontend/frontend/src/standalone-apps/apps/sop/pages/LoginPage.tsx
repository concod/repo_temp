import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import logoImage from "../assets/ia-logo.svg";
import { useAuthStore } from "../store/authStore";

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onNavigateToSignUp?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToSignUp,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuthStore();

  // Clear error when component mounts or when inputs change
  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (error) {
      // Clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      return;
    }

    const success = await login(email.trim(), password);

    if (success) {
      onLoginSuccess?.();
    }
  };

  const handleInputChange = () => {
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  return (
    <div className="psp-sop-login-container">
      <div className="psp-sop-login-content">
        {/* Header */}
        <motion.div
          className="psp-sop-login-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="psp-sop-login-logo">
            <img src={logoImage} alt="SOP Navigator Logo" />
          </div>
          <h1>SOP Navigator</h1>
          <p>Sign in to access your SOP assistant</p>
        </motion.div>

        {/* Login Form */}
        <motion.form
          className="psp-sop-login-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Error Message */}
          {error && (
            <motion.div
              className="psp-sop-login-error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </motion.div>
          )}

          {/* Email Field */}
          <div className="psp-sop-form-group">
            <label htmlFor="email">Email Address</label>
            <div className="psp-sop-input-wrapper">
              <i className="fas fa-envelope"></i>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputChange();
                }}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="psp-sop-form-group">
            <label htmlFor="password">Password</label>
            <div className="psp-sop-input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleInputChange();
                }}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="psp-sop-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <i
                  className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}
                ></i>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="psp-sop-login-button"
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                <span>Sign In</span>
              </>
            )}
          </button>
        </motion.form>

        {/* Sign Up Link */}
        <motion.div
          className="psp-sop-signup-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p>
            Don't have an account?{" "}
            <a
              href="#"
              className="psp-sop-signup-link-text"
              onClick={(e) => {
                e.preventDefault();
                onNavigateToSignUp?.();
              }}
            >
              Sign Up
            </a>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="psp-sop-login-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p>
            A product of{" "}
            <a
              href="https://app.impact-agents.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4259EE", fontWeight: "500" }}
            >
              Agentic Retail Automation Platform
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
