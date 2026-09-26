import { useState, useCallback } from 'react';
import type { LoginResponse } from '../types/auth';
import { AuthService } from '../services/authService';

// Custom hook for Google Login functionality
export const useGoogleLogin = (debugMode: boolean = false) => {
  const [isLoading, setIsLoading] = useState(debugMode); // Start with debug state
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = useCallback(async (googleToken: string): Promise<LoginResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await AuthService.loginWithGoogle(googleToken);
      
      // Store authentication data
      AuthService.storeAuthData(data);

      // Keep loading state for debug mode, otherwise turn off
      setIsLoading(debugMode);
      return data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      // Keep loading state for debug mode, otherwise turn off
      setIsLoading(debugMode);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loginWithGoogle,
    isLoading,
    error,
    clearError,
  };
};
