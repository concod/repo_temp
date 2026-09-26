import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../store/authStore";
import logoImage from "../../../../assets/images/ia-logo.svg";
import "./Auth.scss";
import { useNavigate } from "react-router-dom";

interface SignUpPageProps {
  onSignUpSuccess?: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUpSuccess }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [emailError, setEmailError] = useState(false);
  // const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { signup, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

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

  // Check password match only when fields have been touched
  useEffect(() => {
    if (passwordTouched && confirmPassword && password !== confirmPassword) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [password, confirmPassword, passwordTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    const success = await signup(name.trim(), email.trim(), password);

    if (success) {
      onSignUpSuccess?.();
    }
  };

  const handleInputChange = () => {
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    handleInputChange();
    // Clear email error when user starts typing
    if (emailError) {
      setEmailError(false);
    }
  };

  // const handleEmailBlur = () => {
  //   setEmailTouched(true);
  // };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
  };

  const handleConfirmPasswordBlur = () => {
    setPasswordTouched(true);
  };

  const isFormValid =
    name.trim() &&
    email.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    !passwordMismatch &&
    !emailError;

  return (
    <div className="psp-sop-login-container psp-sop-signup-container">
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
          <h1>Store Agents Suite</h1>
          <p>Sign up to get started with your agents</p>
        </motion.div>

        {/* Sign Up Form */}
        <motion.form
          className="psp-sop-login-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Error Messages Container */}
          <div
            className={`psp-sop-error-container ${
              error || emailError || passwordMismatch ? "has-errors" : ""
            }`}
          >
            {/* API Error Message */}
            <div
              className={`psp-sop-login-error ${error ? "visible" : "hidden"}`}
            >
              <i className="fas fa-exclamation-circle"></i>
              <span>{error || "Error message"}</span>
            </div>

            {/* Email Domain Error */}
            {/* <div
              className={`psp-sop-login-error ${
                !error && emailError ? "visible" : "hidden"
              }`}
            >
              <i className="fas fa-exclamation-circle"></i>
              <span>Email must be from @petsuppliesplus.com</span>
            </div> */}

            {/* Password Mismatch Error */}
            <div
              className={`psp-sop-login-error ${
                !error && !emailError && passwordMismatch ? "visible" : "hidden"
              }`}
            >
              <i className="fas fa-exclamation-circle"></i>
              <span>Passwords do not match</span>
            </div>
          </div>

          {/* Name Field */}
          <div className="psp-sop-form-group">
            <label htmlFor="name">Full Name</label>
            <div className="psp-sop-input-wrapper">
              <i className="fas fa-user"></i>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  handleInputChange();
                }}
                placeholder="Enter your full name"
                required
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="psp-sop-form-group">
            <label htmlFor="email">Email Address</label>
            <div className="psp-sop-input-wrapper">
              <i className="fas fa-envelope"></i>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                // onBlur={handleEmailBlur}
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
                onBlur={handlePasswordBlur}
                placeholder="Enter your password"
                required
                disabled={isLoading}
                autoComplete="new-password"
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

          {/* Confirm Password Field */}
          <div className="psp-sop-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="psp-sop-input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  handleInputChange();
                }}
                onBlur={handleConfirmPasswordBlur}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="psp-sop-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <i
                  className={
                    showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"
                  }
                ></i>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="psp-sop-login-button"
            disabled={isLoading || !isFormValid}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <i className="fas fa-user-plus"></i>
                <span>Create Account</span>
              </>
            )}
          </button>
        </motion.form>

        {/* Sign In Link */}
        <motion.div
          className="psp-sop-signup-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p>
            Already have an account?{" "}
            <button
              className="psp-sop-signup-link-text"
              onClick={(e) => {
                e.preventDefault();
                navigate("/apps/agent-studio/");
              }}
            >
              Sign In
            </button>
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
