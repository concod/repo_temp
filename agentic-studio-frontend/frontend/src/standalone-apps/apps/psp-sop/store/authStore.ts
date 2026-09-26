import { create } from 'zustand';
import type { AuthTokenData } from '../services/AuthService';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  tokenData: AuthTokenData | null;
  userEmail: string | null;
  accessToken: string | null;
  signedUrlToken: string | null;
  district: string | null;
  districtName: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithMicrosoft: (code: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => void;
}

export type AuthStore = AuthState & AuthActions;

const STORAGE_KEY_TOKEN = 'psp-sop-auth-token';
const STORAGE_KEY_LEGACY = 'psp-sop-auth';

type LegacyAuthData = {
  isAuthenticated: boolean;
  userEmail: string | null;
};

const getStoredTokenData = (): AuthTokenData | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_TOKEN);
    if (!stored) return null;

    const tokenData = JSON.parse(stored) as AuthTokenData;
    if (tokenData && tokenData.access_token && tokenData.user_email) {
      return tokenData;
    }

    return null;
  } catch {
    return null;
  }
};

const getStoredLegacyAuth = (): LegacyAuthData | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_LEGACY);
    return stored ? (JSON.parse(stored) as LegacyAuthData) : null;
  } catch {
    return null;
  }
};

const setStoredTokenData = (tokenData: AuthTokenData | null): void => {
  try {
    if (tokenData) {
      sessionStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(tokenData));
      sessionStorage.setItem(
        STORAGE_KEY_LEGACY,
        JSON.stringify({
          isAuthenticated: true,
          userEmail: tokenData.user_email,
        })
      );
    } else {
      sessionStorage.removeItem(STORAGE_KEY_TOKEN);
      sessionStorage.removeItem(STORAGE_KEY_LEGACY);
    }
  } catch {
    // Ignore storage errors
  }
};

const clearStoredAuth = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_LEGACY);
  } catch {
    // Ignore storage errors
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state - will be updated by initializeAuth
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tokenData: null,
  userEmail: null,
  accessToken: null,
  signedUrlToken: null,
  district: null,
  districtName: null,

  // Initialize auth state from session storage
  initializeAuth: () => {
    const storedTokenData = getStoredTokenData();
    if (storedTokenData) {
      set({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        tokenData: storedTokenData,
        userEmail: storedTokenData.user_email,
        accessToken: storedTokenData.access_token,
        signedUrlToken: storedTokenData.signed_url || null,
        district: storedTokenData.district,
        districtName: storedTokenData.district_name
      });
      return;
    }

    const legacyAuth = getStoredLegacyAuth();
    if (legacyAuth && legacyAuth.isAuthenticated) {
      set({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        tokenData: null,
        userEmail: legacyAuth.userEmail,
        accessToken: null,
        signedUrlToken: null,
        district: null,
        districtName: null
      });
    }
  },

  // Actions
  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      // Dynamic import to avoid circular dependencies
      const { authService } = await import('../services/AuthService');
      const response = await authService.login(email, password);

      if (response.success && response.tokenData) {
        const { tokenData } = response;

        setStoredTokenData(tokenData);

        set({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenData,
          userEmail: tokenData.user_email,
          accessToken: tokenData.access_token,
          signedUrlToken: tokenData.signed_url || null,
          district: tokenData.district || null,
          districtName: tokenData.district_name || null
        });

        return true;
      } else if (response.success) {
        // Keep backward compatibility for non-token legacy responses
        set({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenData: null,
          userEmail: email,
          accessToken: null,
          signedUrlToken: null,
          district: null,
          districtName: null
        });

        sessionStorage.setItem(
          STORAGE_KEY_LEGACY,
          JSON.stringify({ isAuthenticated: true, userEmail: email })
        );

        return true;
      } else {
        set({
          isAuthenticated: false,
          isLoading: false,
          error: response.message || 'Login failed',
          tokenData: null,
          userEmail: null,
          accessToken: null,
          signedUrlToken: null,
          district: null,
          districtName: null
        });
        clearStoredAuth();
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      set({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        tokenData: null,
        userEmail: null,
        accessToken: null,
        signedUrlToken: null,
        district: null,
        districtName: null
      });
      clearStoredAuth();
      return false;
    }
  },

  signup: async (name: string, email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      // Dynamic import to avoid circular dependencies
      const { authService } = await import('../services/AuthService');
      const response = await authService.signup(name, email, password);

      if (response.success) {
        clearStoredAuth();

        set({
          isAuthenticated: false,
          isLoading: false,
          error: null,
          tokenData: null,
          userEmail: null,
          accessToken: null,
          signedUrlToken: null,
          district: null,
          districtName: null
        });

        return true;
      } else {
        set({
          isAuthenticated: false,
          isLoading: false,
          error: response.message || 'Sign up failed',
          tokenData: null,
          userEmail: null,
          accessToken: null,
          signedUrlToken: null,
          district: null,
          districtName: null
        });
        clearStoredAuth();
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      set({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        tokenData: null,
        userEmail: null,
        accessToken: null,
        signedUrlToken: null,
        district: null,
        districtName: null
      });
      clearStoredAuth();
      return false;
    }
  },

  loginWithMicrosoft: async (code: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const { authService } = await import('../services/AuthService');
      const response = await authService.loginWithMicrosoft(code);

      if (response.success && response.tokenData) {
        const { tokenData } = response;

        setStoredTokenData(tokenData);

        set({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          tokenData,
          userEmail: tokenData.user_email,
          accessToken: tokenData.access_token,
          signedUrlToken: tokenData.signed_url || null,
          district: tokenData.district || null,
          districtName: tokenData.district_name || null
        });

        return true;
      }

      set({
        isAuthenticated: false,
        isLoading: false,
        error: response.message || 'Microsoft login failed',
        tokenData: null,
        userEmail: null,
        accessToken: null,
        signedUrlToken: null,
        district: null,
        districtName: null
      });
      clearStoredAuth();
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      set({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        tokenData: null,
        userEmail: null,
        accessToken: null,
        signedUrlToken: null,
        district: null,
        districtName: null
      });
      clearStoredAuth();
      return false;
    }
  },

  logout: () => {
    // Dynamic import to avoid circular dependencies
    import('../services/AuthService').then(({ authService }) => {
      authService.logout();
    });

    // Clear chat messages on logout
    import('./chatStore').then(({ useChatStore }) => {
      useChatStore.getState().clearMessages();
    });

    set({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      tokenData: null,
      userEmail: null,
      accessToken: null,
      signedUrlToken: null,
      district: null,
      districtName: null
    });

    // Clear session storage
    clearStoredAuth();
  },

  clearError: () => {
    set({ error: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  }
}));
