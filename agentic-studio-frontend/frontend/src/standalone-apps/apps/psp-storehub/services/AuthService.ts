import { pspStoreHubConfig } from "../config/pspStoreHubConfig";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthTokenData {
  access_token: string;
  token_type: string;
  user_name: string;
  user_email: string;
  user_picture: string | null;
  district: string;
  district_name: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  tokenData?: AuthTokenData;
}

export class AuthService {
  private static instance: AuthService;
  private API_URL = pspStoreHubConfig.baseUrl;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_URL}api/sessions-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      if (response.status === 200) {
        try {
          const tokenData: AuthTokenData = await response.json();
          return {
            success: true,
            message: 'Login successful',
            tokenData
          };
        } catch (parseError) {
          // If response is not JSON, return success without token data
          return {
            success: true,
            message: 'Login successful'
          };
        }
      } else {
        // Handle different error status codes
        let errorMessage = 'Authentication failed : Please check your email and password';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status-based message
          if (response.status === 401) {
            errorMessage = 'Invalid email or password';
          } else if (response.status === 403) {
            errorMessage = 'Access denied';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = `Login failed (${response.status})`;
          }
        }

        return {
          success: false,
          message: errorMessage
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error. Please check your connection and try again.'
        };
      }

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Register new user with name, email and password
   */
  async signup(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_URL}api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: name,
          email: email,
          password: password,
          role: "user"
        })
      });

      if (response.status === 200 || response.status === 201) {
        try {
          const tokenData: AuthTokenData = await response.json();
          return {
            success: true,
            message: 'Account created successfully',
            tokenData
          };
        } catch (parseError) {
          // If response is not JSON, return success without token data
          return {
            success: true,
            message: 'Account created successfully'
          };
        }
      } else {
        // Handle different error status codes
        let errorMessage = 'Sign up failed. Please try again.';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status-based message
          if (response.status === 400) {
            errorMessage = 'Invalid information provided';
          } else if (response.status === 409) {
            errorMessage = 'Email already exists';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = `Sign up failed (${response.status})`;
          }
        }

        return {
          success: false,
          message: errorMessage
        };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error. Please check your connection and try again.'
        };
      }

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  /**
   * Get current user information
   * @deprecated Use authStore to get user info from token data
   */
  getUserInfo(): { name?: string; email?: string; picture?: string } | null {
    // This method is deprecated - user info should come from authStore
    return null;
  }

  /**
   * Logout user (clear session)
   */
  logout(): void {
    // Since we're not storing tokens, logout just clears any session state
    // This will be handled by the auth store
    console.log('User logged out');
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
