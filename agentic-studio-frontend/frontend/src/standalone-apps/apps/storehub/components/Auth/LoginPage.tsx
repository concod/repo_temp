import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import logoImage from '../../assets/ia-logo.svg';
import {Login} from "../../../../shared/packages/auth-ui"
import type { FormProps, FormFields } from "../../../../shared/packages/auth-ui";

interface LoginPageProps {
  onLoginSuccess?: () => void;
  onNavigateToSignUp?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, error, clearError } = useAuthStore();

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

  const handleFormSubmit = async (data: FormFields) => {
    clearError();
    
    if (!data.email.trim() || !data.password.trim()) {
      return;
    }

    const success = await login(data.email.trim(), data.password);
    
    if (success) {
      onLoginSuccess?.();
    }
  };

  const formData: FormProps = {
    title: "Sign in to your account",
    onSubmit: handleFormSubmit,
    error: error || null,
  };

  return (
    <Login logo={logoImage} formHeader={formData} />
  );
};
