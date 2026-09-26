import { create } from 'zustand';
import { authService, type AuthTokenData } from '../services/AuthService';
import { useChatStore } from "./chatStore";
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokenData: AuthTokenData | null;
  // Convenience getters for backward compatibility
  userEmail: string | null;
  userName: string | null;
  userPicture: string | null;
  accessToken: string | null;
  district: string | null;
  districtName: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

export type AuthStore = AuthState & AuthActions;

// Helper functions for sessionStorage persistence
const STORAGE_KEY_TOKEN = 'psp-storehub-auth-token';
const STORAGE_KEY_DISTRICT = 'psp-storehub-district';

const getStoredTokenData = (): AuthTokenData | null => {
  try {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(STORAGE_KEY_TOKEN);
    if (stored) {
      const tokenData = JSON.parse(stored) as AuthTokenData;
      // Validate that we have the required fields
      if (tokenData && tokenData.access_token && tokenData.user_email) {
        return tokenData;
      }
    }
  } catch (error) {
    console.error('Error reading auth token from sessionStorage:', error);
  }
  return null;
};

const getStoredDistrict = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(STORAGE_KEY_DISTRICT);
  } catch (error) {
    console.error('Error reading district from sessionStorage:', error);
    return null;
  }
};

const setStoredTokenData = (tokenData: AuthTokenData | null): void => {
  try {
    if (typeof window === 'undefined') return;
    if (tokenData) {
      sessionStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(tokenData));
      // Also save district separately
      if (tokenData.district) {
        sessionStorage.setItem(STORAGE_KEY_DISTRICT, tokenData.district);
      }
    } else {
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
      sessionStorage.removeItem(STORAGE_KEY_DISTRICT);
    }
  } catch (error) {
    console.error('Error saving auth token to sessionStorage:', error);
  }
};

const clearStoredAuth = (): void => {
  try {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_DISTRICT);
  } catch (error) {
    console.error('Error clearing auth from sessionStorage:', error);
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tokenData: null,
  userEmail: null,
  userName: null,
  userPicture: null,
  accessToken: null,
  district: null,
  districtName: null,

  // Initialize auth state from sessionStorage
  initializeAuth: () => {
    const storedTokenData = getStoredTokenData();
    const storedDistrict = getStoredDistrict();
    
    if (storedTokenData) {
      set({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        tokenData: storedTokenData,
        userEmail: storedTokenData.user_email,
        userName: storedTokenData.user_name,
        userPicture: storedTokenData.user_picture,
        accessToken: storedTokenData.access_token,
        district: storedTokenData.district || storedDistrict || null,
        districtName: storedTokenData.district_name || null
      });
    }
  },

  // Actions
  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(email, password);

      if (response.success && response.tokenData) {
        const { tokenData } = response;
        
        // Save to sessionStorage for persistence
        setStoredTokenData(tokenData);
        
        set({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenData,
          userEmail: tokenData.user_email,
          userName: tokenData.user_name,
          userPicture: tokenData.user_picture,
          accessToken: tokenData.access_token,
          district: tokenData.district || null,
          districtName: tokenData.district_name || null
        });
        
        return true;
      } else {
        // Clear storage on failed login
        clearStoredAuth();
        
        set({
          isAuthenticated: false,
          isLoading: false,
          error: response.message || 'Login failed',
          tokenData: null,
          userEmail: null,
          userName: null,
          userPicture: null,
          accessToken: null,
          district: null,
          districtName: null
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Clear storage on error
      clearStoredAuth();
      
      set({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        tokenData: null,
        userEmail: null,
        userName: null,
        userPicture: null,
        accessToken: null,
        district: null
      });
      return false;
    }
  },

  signup: async (name: string, email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.signup(name, email, password);

      if (response.success && response.tokenData) {
        const { tokenData } = response;
        
        // Save to sessionStorage for persistence
        setStoredTokenData(tokenData);
        
        set({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenData,
          userEmail: tokenData.user_email,
          userName: tokenData.user_name,
          userPicture: tokenData.user_picture,
          accessToken: tokenData.access_token,
          district: tokenData.district || null,
          districtName: tokenData.district_name || null
        });
        
        return true;
      } else {
        // Clear storage on failed signup
        clearStoredAuth();
        
        set({
          isAuthenticated: false,
          isLoading: false,
          error: response.message || 'Sign up failed',
          tokenData: null,
          userEmail: null,
          userName: null,
          userPicture: null,
          accessToken: null,
          district: null
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Clear storage on error
      clearStoredAuth();
      
      set({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        tokenData: null,
        userEmail: null,
        userName: null,
        userPicture: null,
        accessToken: null,
        district: null
      });
      return false;
    }
  },

  logout: () => {
    authService.logout();

    // Clear chat messages on logout
    useChatStore.getState().clearMessages();

    // Clear sessionStorage
    clearStoredAuth();

    set({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tokenData: null,
      userEmail: null,
      userName: null,
      userPicture: null,
      accessToken: null,
      district: null,
      districtName: null
    });
  },

  clearError: () => {
    set({ error: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  }
}));
