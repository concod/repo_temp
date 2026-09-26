import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { ApiError } from '../types/api';

/**
 * HTTP Client with automatic authorization and error handling
 * Features:
 * - Automatic Bearer token injection (except auth endpoints)
 * - 401 error handling with automatic redirect to login
 * - Request/response logging in development
 * - Centralized error handling
 */
export class HttpClient {
  private axiosInstance: AxiosInstance;
  
  // Endpoints that should NOT have authorization headers
  private readonly authExcludePatterns = [
    '/glogin',
    '/api/generate_captcha_token',
    '/reset-session'
  ];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  /**
   * Setup request interceptor for automatic authorization header injection
   */
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add authorization header if needed
        if (this.shouldAddAuthHeader(config.url)) {
          const token = this.getAuthToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }

        return config;
      },
      (error) => {
        console.error('[HTTP] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup response interceptor for error handling and logging
   */
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
          console.log(`[HTTP] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
        }
        return response;
      },
      (error: AxiosError<ApiError>) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Determine if authorization header should be added to the request
   */
  private shouldAddAuthHeader(url?: string): boolean {
    if (!url) return false;
    return !this.authExcludePatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Handle HTTP errors with specific logic for different status codes
   */
  private handleError(error: AxiosError<ApiError>): never {
    if (error.response) {
      const { status, data } = error.response;
      
      // Log error in development
      if (import.meta.env.DEV) {
        console.error(`[HTTP] ${status} Error:`, {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          response: data
        });
      }

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          this.handleUnauthorized();
          throw new Error('Session expired. Please login again.');
          
        case 403:
          throw new Error('Access forbidden. You do not have permission to perform this action.');
          
        case 404:
          throw new Error('Resource not found.');
          
        case 408:
          throw new Error('Request timeout. Please try again.');
          
        case 422:
          throw new Error(data?.detail || 'Validation error. Please check your input.');
          
        case 500:
          throw new Error('Internal server error. Please try again later.');
          
        default:
          throw new Error(data?.detail || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      // Network error
      console.error('[HTTP] Network error:', error.request);
      throw new Error('Network error. Please check your internet connection.');
    } else {
      // Request setup error
      console.error('[HTTP] Request setup error:', error.message);
      throw new Error(error.message || 'Request failed');
    }
  }

    /**
   * Properly join base URL and path, handling trailing/leading slashes
   */
    private joinUrls(baseUrl: string, path: string): string {
      // Remove trailing slash from baseUrl and leading slash from path
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const cleanPath = path.replace(/^\/+/, '');
      
      // Join with single slash
      return `${cleanBase}/${cleanPath}`;
    }

  /**
   * Handle unauthorized error by clearing token and redirecting to login
   */
  private handleUnauthorized(): void {
    // Clear all auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('name');
    localStorage.removeItem('picture');
    localStorage.removeItem('my_email');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  // ==================== HTTP Methods ====================

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

    /**
   * Streaming fetch request for Server-Sent Events or ReadableStream
   * Uses native fetch API since Axios doesn't support streaming well
   */
    async fetchStream(url: string, options: RequestInit = {}): Promise<Response> {
      // Construct full URL using the same base URL as Axios
      const baseURL = this.axiosInstance.defaults.baseURL || '';
      const fullUrl = url.startsWith('http') ? url : this.joinUrls(baseURL, url);
      
      // Debug logging
      console.log('[HttpClient] Streaming request:', { baseURL, url, fullUrl });
  
      // Prepare headers
      const headers: Record<string, string> = {
        ...options.headers as Record<string, string>,
      };
  
      // Add authorization header if needed
      if (this.shouldAddAuthHeader(url)) {
        const token = this.getAuthToken();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
  
      // Make the streaming request
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });
  
      // Handle errors similar to axios interceptor
      if (!response.ok) {
        // Create an axios-like error for consistency
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any;
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: { detail: response.statusText }
        };
        
        // Use the same error handling logic
        return this.handleError(error);
      }
  
      return response;
    }

  /**
   * Get the underlying Axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Export singleton instance
export const httpClient = new HttpClient();


