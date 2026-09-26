import { create } from "zustand";
import { authService, type AuthTokenData } from "../services/AuthService";
import { useChatStore } from "./chatStore";

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    tokenData: AuthTokenData | null;
    userEmail: string | null;
    userName: string | null;
    accessToken: string | null;
}

export interface AuthActions {
    initializeAuth: () => void;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => void;
    clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

const STORAGE_KEY_TOKEN = "ib-bi-auth-token";

const getStoredTokenData = (): AuthTokenData | null => {
    try {
        if (typeof window === "undefined") return null;
        const stored = sessionStorage.getItem(STORAGE_KEY_TOKEN);
        if (!stored) return null;

        const tokenData = JSON.parse(stored) as AuthTokenData;
        if (tokenData?.access_token && tokenData?.user_email) {
            return tokenData;
        }
    } catch {
        // Ignore parsing and storage errors.
    }
    return null;
};

const setStoredTokenData = (tokenData: AuthTokenData | null): void => {
    try {
        if (typeof window === "undefined") return;
        if (tokenData) {
            sessionStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(tokenData));
        } else {
            sessionStorage.removeItem(STORAGE_KEY_TOKEN);
        }
    } catch {
        // Ignore storage errors.
    }
};

export const useAuthStore = create<AuthStore>((set) => ({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    tokenData: null,
    userEmail: null,
    userName: null,
    accessToken: null,

    initializeAuth: () => {
        const storedTokenData = getStoredTokenData();
        if (!storedTokenData) {
            return;
        }

        set({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            tokenData: storedTokenData,
            userEmail: storedTokenData.user_email,
            userName: storedTokenData.user_name,
            accessToken: storedTokenData.access_token,
        });
    },

    login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
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
                    userName: tokenData.user_name,
                    accessToken: tokenData.access_token,
                });

                return true;
            }

            setStoredTokenData(null);
            set({
                isAuthenticated: false,
                isLoading: false,
                error: response.message || "Login failed",
                tokenData: null,
                userEmail: null,
                userName: null,
                accessToken: null,
            });
            return false;
        } catch (error) {
            setStoredTokenData(null);
            set({
                isAuthenticated: false,
                isLoading: false,
                error: error instanceof Error ? error.message : "An unexpected error occurred",
                tokenData: null,
                userEmail: null,
                userName: null,
                accessToken: null,
            });
            return false;
        }
    },

    signup: async (name: string, email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.signup(name, email, password);
            if (response.success) {
                // Don't auto-authenticate on signup - user should log in manually
                // Clear any stored auth data
                setStoredTokenData(null);

                set({
                    isAuthenticated: false,
                    isLoading: false,
                    error: null,
                    tokenData: null,
                    userEmail: null,
                    userName: null,
                    accessToken: null,
                });

                return true;
            }

            setStoredTokenData(null);
            set({
                isAuthenticated: false,
                isLoading: false,
                error: response.message || "Sign up failed",
                tokenData: null,
                userEmail: null,
                userName: null,
                accessToken: null,
            });
            return false;
        } catch (error) {
            setStoredTokenData(null);
            set({
                isAuthenticated: false,
                isLoading: false,
                error: error instanceof Error ? error.message : "An unexpected error occurred",
                tokenData: null,
                userEmail: null,
                userName: null,
                accessToken: null,
            });
            return false;
        }
    },

    logout: () => {
        authService.logout();
        setStoredTokenData(null);
        useChatStore.getState().clearAllSessions();

        set({
            isAuthenticated: false,
            isLoading: false,
            error: null,
            tokenData: null,
            userEmail: null,
            userName: null,
            accessToken: null,
        });
    },

    clearError: () => {
        set({ error: null });
    },
}));
