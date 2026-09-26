import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/psp.png';

interface SignUpPageProps {
  onSignUpSuccess?: () => void;
  onBackToLogin?: () => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUpSuccess, onBackToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { signup, isLoading, error, clearError } = useAuthStore();

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

  // Check email domain validation only when field has been touched
  useEffect(() => {
    if (emailTouched && email && !email.endsWith('@petsuppliesplus.com')) {
      setEmailError(true);
    } else {
      setEmailError(false);
    }
  }, [email, emailTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    if (!email.endsWith('@petsuppliesplus.com')) {
      setEmailError(true);
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

  const handleEmailBlur = () => {
    setEmailTouched(true);
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
  };

  const handleConfirmPasswordBlur = () => {
    setPasswordTouched(true);
  };

  const isFormValid = name.trim() && email.trim() && password.trim() && confirmPassword.trim() && !passwordMismatch && !emailError;

  return (
    <div className="psp-storehub-login-container psp-storehub-signup-container">
      <div className="psp-storehub-login-content">
        {/* Header */}
        <motion.div 
          className="psp-storehub-login-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="psp-storehub-login-logo">
            <img src={logoImage} alt="StoreHub Navigator Logo" />
          </div>
          <h1>Create Account</h1>
          <p>Sign up to get started with PSP StoreHub Navigator</p>
        </motion.div>

        {/* Sign Up Form */}
        <motion.form 
          className="psp-storehub-login-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Error Messages Container */}
          <div className={`psp-storehub-error-container ${(error || emailError || passwordMismatch) ? 'has-errors' : ''}`}>
            {/* API Error Message */}
            <div className={`psp-storehub-login-error ${error ? 'visible' : 'hidden'}`}>
              <i className="fas fa-exclamation-circle"></i>
              <span>{error || 'Error message'}</span>
            </div>

            {/* Email Domain Error */}
            <div className={`psp-storehub-login-error ${!error && emailError ? 'visible' : 'hidden'}`}>
              <i className="fas fa-exclamation-circle"></i>
              <span>Email must be from @petsuppliesplus.com</span>
            </div>

            {/* Password Mismatch Error */}
            <div className={`psp-storehub-login-error ${!error && !emailError && passwordMismatch ? 'visible' : 'hidden'}`}>
              <i className="fas fa-exclamation-circle"></i>
              <span>Passwords do not match</span>
            </div>
          </div>

          {/* Name Field */}
          <div className="psp-storehub-form-group">
            <label htmlFor="name">Full Name</label>
            <div className="psp-storehub-input-wrapper">
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
          <div className="psp-storehub-form-group">
            <label htmlFor="email">Email Address</label>
            <div className="psp-storehub-input-wrapper">
              <i className="fas fa-envelope"></i>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder="Enter your email"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="psp-storehub-form-group">
            <label htmlFor="password">Password</label>
            <div className="psp-storehub-input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
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
                className="psp-storehub-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="psp-storehub-form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="psp-storehub-input-wrapper">
              <i className="fas fa-lock"></i>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
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
                className="psp-storehub-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="psp-storehub-login-button"
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
          className="psp-storehub-signup-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p>
            Already have an account?{' '}
            <a href="#" className="psp-storehub-signup-link-text" onClick={(e) => {
              e.preventDefault();
              onBackToLogin?.();
            }}>
              Sign In
            </a>
          </p>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="psp-storehub-login-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p>A product of <strong>Agentic Retail Automation Platform</strong></p>
        </motion.div>
      </div>
    </div>
  );
};
