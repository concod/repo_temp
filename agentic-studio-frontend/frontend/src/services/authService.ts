import { httpClient } from './httpClient';
import { AUTH_ENDPOINTS } from './endpoints';
import type { LoginResponse, TokenData } from '../types/api';

/**
 * Authentication Service
 * Handles user authentication and token management
 * 
 * Endpoints:
 * - POST /glogin - Google OAuth login
 * - POST /api/generate_captcha_token - Generate captcha token (if needed)
 */
export class AuthService {

  /**
   * Login with Google OAuth token
   * POST /glogin
   * 
   * @param googleToken - Google OAuth ID token
   * @returns Promise<LoginResponse> - Login response with JWT token
   * @throws Error if login fails or token is invalid
   */
  static async loginWithGoogle(googleToken: string): Promise<LoginResponse> {
    try {
      if (!googleToken?.trim()) {
        throw new Error('Google token is required');
      }

      const tokenData: TokenData = { token: googleToken };
      
      const response = await httpClient.post<LoginResponse>(
        AUTH_ENDPOINTS.GOOGLE_LOGIN,
        tokenData
      );

      // Store authentication data on successful login
      this.storeAuthData(response.data);
      
      return response.data;
    } catch (error) {
      console.error('[AuthService] Google login failed:', error);
      throw error;
    }
  }

  /**
   * Generate captcha token for guest access
   * POST /api/generate_captcha_token
   * 
   * @param captchaToken - reCAPTCHA token
   * @returns Promise<{message: string, token: string, expires: string}>
   * @throws Error if captcha verification fails
   */
  static async generateCaptchaToken(captchaToken: string): Promise<{
    message: string;
    token: string;
    expires: string;
  }> {
    try {
      if (!captchaToken?.trim()) {
        throw new Error('Captcha token is required');
      }

      const response = await httpClient.post(
        AUTH_ENDPOINTS.GENERATE_CAPTCHA_TOKEN,
        { token: captchaToken }
      );

      return response.data;
    } catch (error) {
      console.error('[AuthService] Captcha token generation failed:', error);
      throw error;
    }
  }

  // ==================== Token Management Methods ====================

  /**
   * Get stored authentication token
   * 
   * @returns string | null - JWT token or null if not found
   */
  static getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Check if user is currently logged in
   * Note: If token is expired, user will need to login again (no refresh endpoint available)
   * 
   * @returns boolean - True if user has valid token
   */
  static isLoggedIn(): boolean {
    const token = this.getAuthToken();
    if (!token) return false;
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      // If token parsing fails, consider it invalid
      return false;
    }
  }

  /**
   * Store authentication data in localStorage
   * 
   * @param data - Login response data containing token and user info
   */
  static storeAuthData(data: LoginResponse): void {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('name', data.name);
    localStorage.setItem('picture', data.picture);
    localStorage.setItem('my_email', data.email);
    
    // Store additional user info if available
    if (data.role) {
      localStorage.setItem('user_role', data.role);
    }
    if (typeof data.is_admin === 'boolean') {
      localStorage.setItem('is_admin', data.is_admin.toString());
    }
  }

  /**
   * Get stored user information
   * 
   * @returns Object with user details or null if not logged in
   */
  static getUserInfo(): {
    name: string;
    email: string;
    picture: string;
    role?: string;
    isAdmin?: boolean;
  } | null {
    const token = this.getAuthToken();
    if (!token) return null;

    const name = localStorage.getItem('name');
    const email = localStorage.getItem('my_email');
    const picture = localStorage.getItem('picture');
    const role = localStorage.getItem('user_role');
    const isAdmin = localStorage.getItem('is_admin');

    if (!name || !email || !picture) return null;

    return {
      name,
      email,
      picture,
      ...(role && { role }),
      ...(isAdmin && { isAdmin: isAdmin === 'true' }),
    };
  }

  /**
   * Clear all authentication data and logout user
   * This method is also called automatically by httpClient on 401 errors
   */
  static logout(): void {
    // Clear all auth-related data
    const keysToRemove = [
      'authToken',
      'name', 
      'picture',
      'my_email',
      'user_role',
      'is_admin'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Optionally redirect to login page
    // window.location.href = '/login';
  }

}

export default AuthService;
