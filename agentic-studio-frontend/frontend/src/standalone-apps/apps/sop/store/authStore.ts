import { create } from "zustand";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userEmail: string | null;
  userName: string | null;
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

// Helper functions for session storage
const getStoredAuth = () => {
  try {
    const stored = sessionStorage.getItem("sop-auth");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setStoredAuth = (authData: {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
}) => {
  try {
    sessionStorage.setItem("sop-auth", JSON.stringify(authData));
  } catch {
    // Ignore storage errors
  }
};

const clearStoredAuth = () => {
  // TODO: Use session storage instead of localstorage
  try {
    sessionStorage.removeItem("sop-auth");
    // sessionStorage.removeItem('sop-auth');
  } catch {
    // Ignore storage errors
  }
};

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state - will be updated by initializeAuth
  isAuthenticated: false,
  isLoading: false,
  error: null,
  userEmail: null,
  userName: null,

  // Initialize auth state from session storage
  initializeAuth: () => {
    const storedAuth = getStoredAuth();
    if (storedAuth && storedAuth.isAuthenticated) {
      set({
        isAuthenticated: true,
        userEmail: storedAuth.userEmail,
        error: null,
        userName: storedAuth.userName,
      });
    }
  },

  // Actions
  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      // Dynamic import to avoid circular dependencies
      const { authService } = await import("../services/AuthService");
      const response = await authService.login(email, password);

      if (response.success) {
        const userName = response.data?.user_name || null;

        const authData = {
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userEmail: email,
          userName: userName,
        };

        set(authData);

        // Store in session storage
        setStoredAuth({
          isAuthenticated: true,
          userEmail: email,
          userName: userName,
        });

        return true;
      } else {
        set({
          isAuthenticated: false,
          isLoading: false,
          error: response.message || "Login failed",
          userEmail: null,
        });
        clearStoredAuth();
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      set({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        userEmail: null,
      });
      clearStoredAuth();
      return false;
    }
  },

  signup: async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      // Dynamic import to avoid circular dependencies
      const { authService } = await import("../services/AuthService");
      const response = await authService.signup(name, email, password);

      if (response.success) {
        const authData = {
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userEmail: email,
        };

        set(authData);

        // Store in session storage
        setStoredAuth({
          isAuthenticated: true,
          userEmail: email,
          userName: null,
        });

        return true;
      } else {
        set({
          isAuthenticated: false,
          isLoading: false,
          error: response.message || "Sign up failed",
          userEmail: null,
        });
        clearStoredAuth();
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      set({
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        userEmail: null,
      });
      clearStoredAuth();
      return false;
    }
  },

  logout: () => {
    // Dynamic import to avoid circular dependencies
    import("../services/AuthService").then(({ authService }) => {
      authService.logout();
    });

    // Clear chat messages on logout
    import("./chatStore").then(({ useChatStore }) => {
      useChatStore.getState().clearMessages();
    });

    set({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userEmail: null,
    });

    // Clear session storage
    clearStoredAuth();
  },

  clearError: () => {
    set({ error: null });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
