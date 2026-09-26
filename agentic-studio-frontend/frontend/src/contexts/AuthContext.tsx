import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthService } from '../services/authService';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  userInfo: ReturnType<typeof AuthService.getUserInfo>;
  login: (token: string, userData: any) => void;
  logout: () => void;
  checkAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<ReturnType<typeof AuthService.getUserInfo>>(null);

  const checkAuthStatus = useCallback(() => {
    try {
      const loggedIn = AuthService.isLoggedIn();
      setIsLoggedIn(loggedIn);
      
      if (loggedIn) {
        const info = AuthService.getUserInfo();
        setUserInfo(info);
      } else {
        setUserInfo(null);
        // Clean up invalid tokens
        if (AuthService.getAuthToken()) {
          AuthService.logout();
        }
      }
    } catch (error) {
      console.error('[AuthContext] Error checking auth status:', error);
      setIsLoggedIn(false);
      setUserInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((token: string, userData: any) => {
    // Store auth data using existing AuthService method
    AuthService.storeAuthData({ token, ...userData });
    checkAuthStatus();
  }, [checkAuthStatus]);

  const logout = useCallback(() => {
    AuthService.logout();
    setIsLoggedIn(false);
    setUserInfo(null);
  }, []);

  // Check auth status on mount and set up periodic checks
  useEffect(() => {
    checkAuthStatus();

    // Set up periodic auth status checks (every 60 seconds)
    const interval = setInterval(checkAuthStatus, 60000);

    // Listen for storage changes (logout in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken' || e.key === null) {
        checkAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthStatus]);

  const value: AuthContextType = {
    isLoggedIn,
    isLoading,
    userInfo,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
