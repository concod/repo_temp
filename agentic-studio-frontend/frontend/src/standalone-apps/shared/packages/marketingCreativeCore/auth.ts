import { createStore } from "zustand/vanilla";
import type { StoreApi } from "zustand/vanilla";

export interface AuthTokenData {
    access_token: string;
    token_type: string;
    user_name: string;
    user_email: string;
    user_picture: string | null;
    district: string | null;
    district_name: string | null;
    signed_url?: string | null;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    tokenData?: AuthTokenData;
}

export interface StandaloneCreativeAuthService {
    login: (email: string, password: string) => Promise<AuthResponse>;
    signup: (name: string, email: string, password: string) => Promise<AuthResponse>;
    logout: () => void;
}

export interface AuthState {
    isAuthenticated: boolean;
    isInitialized: boolean;
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

type CreateStandaloneCreativeAuthStoreOptions = {
    storageKey: string;
    authService: StandaloneCreativeAuthService;
};

function getStoredTokenData(storageKey: string): AuthTokenData | null {
    try {
        if (typeof window === "undefined") return null;
        const stored = sessionStorage.getItem(storageKey);
        if (!stored) return null;

        const tokenData = JSON.parse(stored) as AuthTokenData;
        if (tokenData?.access_token && tokenData?.user_email) {
            return tokenData;
        }
    } catch {
        // Ignore parsing and storage errors.
    }

    return null;
}

function setStoredTokenData(storageKey: string, tokenData: AuthTokenData | null): void {
    try {
        if (typeof window === "undefined") return;
        if (tokenData) {
            sessionStorage.setItem(storageKey, JSON.stringify(tokenData));
        } else {
            sessionStorage.removeItem(storageKey);
        }
    } catch {
        // Ignore storage errors.
    }
}

export function createStandaloneCreativeAuthService(
    baseUrl: string | (() => string),
    appTitle: string
): StandaloneCreativeAuthService {
    const resolveBaseUrl = (): string => {
        const rawBaseUrl = typeof baseUrl === "function" ? baseUrl() : baseUrl;
        return rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;
    };

    return {
        async login(email: string, password: string): Promise<AuthResponse> {
            try {
                const resolvedBaseUrl = resolveBaseUrl();
                const response = await fetch(`${resolvedBaseUrl}api/sessions-login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });

                if (response.status === 200) {
                    try {
                        const tokenData = (await response.json()) as AuthTokenData;
                        return {
                            success: true,
                            message: "Login successful",
                            tokenData,
                        };
                    } catch {
                        return {
                            success: true,
                            message: "Login successful",
                        };
                    }
                }

                let errorMessage = "Authentication failed: Please check your email and password";
                try {
                    const errorData = (await response.json()) as { message?: string };
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    if (response.status === 401) {
                        errorMessage = "Invalid email or password";
                    } else if (response.status === 403) {
                        errorMessage = "Access denied";
                    } else if (response.status >= 500) {
                        errorMessage = "Server error. Please try again later.";
                    } else {
                        errorMessage = `Login failed (${response.status})`;
                    }
                }

                return {
                    success: false,
                    message: errorMessage,
                };
            } catch (error) {
                console.error(`${appTitle} login error:`, error);

                if (error instanceof TypeError && error.message.includes("fetch")) {
                    return {
                        success: false,
                        message: "Network error. Please check your connection and try again.",
                    };
                }

                return {
                    success: false,
                    message: "An unexpected error occurred. Please try again.",
                };
            }
        },

        async signup(name: string, email: string, password: string): Promise<AuthResponse> {
            try {
                const resolvedBaseUrl = resolveBaseUrl();
                const response = await fetch(`${resolvedBaseUrl}api/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: name,
                        email,
                        password,
                        role: "user",
                    }),
                });

                if (response.status === 200 || response.status === 201) {
                    try {
                        const tokenData = (await response.json()) as AuthTokenData;
                        return {
                            success: true,
                            message: "Account created successfully",
                            tokenData,
                        };
                    } catch {
                        return {
                            success: true,
                            message: "Account created successfully",
                        };
                    }
                }

                let errorMessage = "Sign up failed. Please try again.";
                try {
                    const errorData = (await response.json()) as { message?: string; detail?: string };
                    errorMessage = errorData.message || errorData.detail || errorMessage;
                } catch {
                    if (response.status === 400) {
                        errorMessage = "Invalid information provided";
                    } else if (response.status === 409) {
                        errorMessage = "Account already exists with this email address";
                    } else if (response.status >= 500) {
                        errorMessage = "Server error. Please try again later.";
                    } else {
                        errorMessage = `Sign up failed (${response.status})`;
                    }
                }

                return {
                    success: false,
                    message: errorMessage,
                };
            } catch (error) {
                console.error(`${appTitle} sign up error:`, error);

                if (error instanceof TypeError && error.message.includes("fetch")) {
                    return {
                        success: false,
                        message: "Network error. Please check your connection and try again.",
                    };
                }

                return {
                    success: false,
                    message: "An unexpected error occurred. Please try again.",
                };
            }
        },

        logout(): void {
            console.info(`${appTitle} user logged out`);
        },
    };
}

export function createStandaloneCreativeAuthStore({
    storageKey,
    authService,
}: CreateStandaloneCreativeAuthStoreOptions): StoreApi<AuthStore> {
    return createStore<AuthStore>()((set) => ({
        isAuthenticated: false,
        isInitialized: false,
        isLoading: false,
        error: null,
        tokenData: null,
        userEmail: null,
        userName: null,
        accessToken: null,

        initializeAuth: () => {
            const storedTokenData = getStoredTokenData(storageKey);
            if (!storedTokenData) {
                set({ isInitialized: true, isAuthenticated: false });
                return;
            }

            set({
                isInitialized: true,
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
                    setStoredTokenData(storageKey, tokenData);

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

                setStoredTokenData(storageKey, null);
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
                setStoredTokenData(storageKey, null);
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
                    setStoredTokenData(storageKey, null);

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

                setStoredTokenData(storageKey, null);
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
                setStoredTokenData(storageKey, null);
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
            setStoredTokenData(storageKey, null);

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
}