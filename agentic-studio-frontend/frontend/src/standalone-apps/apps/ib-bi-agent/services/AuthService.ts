import { ibAgentConfig } from "../config/ibAgentConfig";

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

export class AuthService {
    private static instance: AuthService;
    private API_URL = ibAgentConfig.baseUrl;

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    async login(email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.API_URL}api/sessions-login`, {
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
            console.error("IB-BI login error:", error);

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
    }

    async signup(name: string, email: string, password: string): Promise<AuthResponse> {
        try {
            const response = await fetch(`${this.API_URL}api/register`, {
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
                // Try to use the backend error message directly
                errorMessage = errorData.message || errorData.detail || errorMessage;
            } catch {
                // If response is not JSON, use status code based messages
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
            console.error("IB-BI sign up error:", error);

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
    }

    logout(): void {
        console.info("IB-BI user logged out");
    }
}

export const authService = AuthService.getInstance();
