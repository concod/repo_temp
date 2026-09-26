import { pspSopConfig } from '../config/pspSopConfig';
import type { PspSopPayload, UserSessionsApiResponse, SessionConversationApiResponse } from '../types/chat.types';
import { parseMarkdownResponse, parseHTMLResponse, formatText } from '../utils/messageParser';

const AUTH_STORAGE_KEY = 'psp-sop-auth-token';

export class PspSopService {
  private static isHandlingSignedUrlAuthFailure = false;
  private static isHandlingUnauthorized = false;
  private config = pspSopConfig;
  private SIGNED_URL_API = 'https://impact-agents.ai/generate_signed_url';

  private getStoredTokenData(): Record<string, unknown> | null {
    try {
      const storedAuth = sessionStorage.getItem(AUTH_STORAGE_KEY);
      return storedAuth ? (JSON.parse(storedAuth) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private getSignedUrlToken(): string | null {
    const tokenData = this.getStoredTokenData();
    return typeof tokenData?.signed_url === 'string' && tokenData.signed_url.trim()
      ? tokenData.signed_url
      : null;
  }

  private getAccessToken(): string | null {
    const tokenData = this.getStoredTokenData();
    return typeof tokenData?.access_token === 'string' && tokenData.access_token.trim()
      ? tokenData.access_token
      : null;
  }

  private getUserEmail(): string | null {
    const tokenData = this.getStoredTokenData();
    return typeof tokenData?.user_email === 'string' && tokenData.user_email.trim()
      ? tokenData.user_email
      : null;
  }

  private buildExecuteHeaders(): Record<string, string> {
    const token = this.getAccessToken();

    return {
      'Content-Type': 'application/json',
      'AGENT-API-KEY': this.config.apiKey,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  private buildAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();

    return {
      'Accept': 'application/json',
      'AGENT-API-KEY': this.config.apiKey,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  }

  private async handleUnauthorized(): Promise<never> {
    if (!PspSopService.isHandlingUnauthorized) {
      PspSopService.isHandlingUnauthorized = true;

      try {
        this.clearSessionId();
        const { useAuthStore } = await import('../store');
        useAuthStore.getState().logout();
      } catch (logoutError) {
        console.error('Failed to logout after unauthorized response:', logoutError);
      } finally {
        PspSopService.isHandlingUnauthorized = false;
      }
    }

    throw new Error('Session expired. Please login again.');
  }

  buildSignedCitationRedirectUrl(url: string): string {
    const signedUrlToken = this.getSignedUrlToken();

    if (!signedUrlToken) {
      return url;
    }

    const redirectUrl = new URL(this.SIGNED_URL_API);
    redirectUrl.searchParams.set('url', url);
    redirectUrl.searchParams.set('token', `Bearer ${signedUrlToken}`);
    return redirectUrl.toString();
  }

  private async handleSignedUrlAuthFailure(): Promise<void> {
    if (PspSopService.isHandlingSignedUrlAuthFailure) {
      return;
    }

    PspSopService.isHandlingSignedUrlAuthFailure = true;

    try {
      try {
        const { useAuthStore } = await import('../store');
        useAuthStore.getState().logout();
      } catch (logoutError) {
        console.error('Failed to trigger auth store logout after signed URL auth failure:', logoutError);
      }

      this.clearSessionId();

      try {
        sessionStorage.clear();
      } catch (storageError) {
        console.error('Failed to clear sessionStorage:', storageError);
      }

      try {
        const localStorageKeys = Object.keys(localStorage).filter((key) => key.startsWith('psp-'));
        for (const key of localStorageKeys) {
          localStorage.removeItem(key);
        }
      } catch (storageError) {
        console.error('Failed to clear PSP localStorage keys:', storageError);
      }

      if (typeof caches !== 'undefined') {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
        } catch (cacheError) {
          console.error('Failed to clear browser caches:', cacheError);
        }
      }
    } finally {
      window.location.assign('/apps/psp-sop/');
    }
  }

  /**
   * Get sessionId from localStorage
   */
  private getSessionId(): string | null {
    return localStorage.getItem('psp-sessionid');
  }

  /**
   * Resolve a citation URL to a time-limited signed URL.
   * Uses the signed_url token returned during authentication.
   */
  async getSignedCitationUrl(url: string, expirationMinutes = 1440): Promise<string> {
    const signedUrlToken = this.getSignedUrlToken();

    if (!signedUrlToken) {
      throw new Error('Missing signed URL token');
    }

    const response = await fetch(this.SIGNED_URL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signedUrlToken}`,
      },
      body: JSON.stringify({
        url,
        expiration_minutes: expirationMinutes,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.handleSignedUrlAuthFailure();
        const authError = new Error('AUTH_EXPIRED');
        authError.name = 'AuthExpiredError';
        throw authError;
      }

      throw new Error(`Signed URL request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data?.status === 'success' && typeof data?.signed_url === 'string' && data.signed_url) {
      return data.signed_url;
    }

    throw new Error('Signed URL response is invalid');
  }

  /**
   * Store sessionId in localStorage
   */
  private setSessionId(sessionId: string): void {
    localStorage.setItem('psp-sessionid', sessionId);
  }

  /**
   * Clear sessionId from localStorage
   */
  clearSessionId(): void {
    localStorage.removeItem('psp-sessionid');
  }

  /**
   * Send message to PSP-SOP agent and get response
   */
  async sendMessage(userMessage: string): Promise<{
    text: string;
    sources: string[];
    suggestions: string[];
    timing: string | null;
    sessionId?: string;
  }> {
    const payload: PspSopPayload = {
      agentId: this.config.agentId,
      userInput: userMessage,
    };

    // Start timing the actual API request
    const startTime = performance.now();

    const userEmail = this.getUserEmail();
    if (userEmail) {
      payload.user = userEmail;
    }

    // Include sessionId if available
    const sessionId = this.getSessionId();
    if (sessionId) {
      payload.session_id = sessionId;
    }

    try {
      // Make direct fetch call to avoid httpClient auth issues
      const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}`, {
        method: 'POST',
        headers: this.buildExecuteHeaders(),
        body: JSON.stringify(payload),
      });

      // Calculate actual API response time
      const endTime = performance.now();
      const actualResponseTime = ((endTime - startTime) / 1000).toFixed(2);
      const actualTiming = `${actualResponseTime} seconds`;

      if (response.status === 401) {
        await this.handleUnauthorized();
      }

      if (!response.ok) {
        // Handle HTTP errors
        let errorMessage = 'An error occurred while processing your request.';

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If response is not JSON, use status-based message
          if (response.status === 403) {
            errorMessage = 'Access denied to this agent';
          } else if (response.status === 404) {
            errorMessage = 'Agent not found';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const result = responseData.result || responseData;

      // Extract and store session_id from response
      const returnedSessionId = responseData.session_id && typeof responseData.session_id === 'string'
        ? responseData.session_id
        : undefined;

      if (returnedSessionId) {
        const existingSessionId = this.getSessionId();
        // Only store if we don't already have a sessionId
        if (!existingSessionId) {
          this.setSessionId(returnedSessionId);
        }
      }

      // Check if this is an error response
      if (result && (result as any).type === 'error') {
        let errorMessage = 'An error occurred while processing your request.';

        if ((result as any).content && (result as any).content.message) {
          errorMessage = (result as any).content.message;

          if ((result as any).content.details) {
            errorMessage += `\n\nDetails: ${(result as any).content.details}`;
          }
        }

        throw new Error(errorMessage);
      }

      // Parse the response content
      let parsed;

      if (result && (result as any).content && typeof (result as any).content.text === 'string' && (result as any).content.text.trim()) {
        // Use markdown content parser for the new response format
        parsed = parseMarkdownResponse((result as any).content.text);
      } else if (result && (result as any).html_content && typeof (result as any).html_content === 'string' && (result as any).html_content.trim()) {
        // Fallback to HTML content parser for legacy responses
        parsed = parseHTMLResponse((result as any).html_content);
      } else {
        // Fallback to text parsing for other formats
        let responseText = '';
        if (result && typeof (result as any).answer === 'string' && (result as any).answer.trim()) {
          responseText = (result as any).answer;
        } else if (result && typeof (result as any).response === 'string' && (result as any).response.trim()) {
          responseText = (result as any).response;
        } else if (result && typeof (result as any).result === 'string' && (result as any).result.trim()) {
          responseText = (result as any).result;
        } else if (result && typeof (result as any).text === 'string' && (result as any).text.trim()) {
          responseText = (result as any).text;
        } else if (result && typeof result === 'string' && result.trim()) {
          responseText = result;
        } else {
          console.warn("Couldn't find a valid response field in:", result);
          responseText = "Response received but couldn't extract text. Please try again.";
        }

        // Parse the response to extract content, sources, and suggestions
        const lines = responseText.split('\n');
        let content = '';
        let sources: string[] = [];
        let suggestions: string[] = [];
        let inSources = false;
        let inSuggestions = false;

        for (let line of lines) {
          line = line.trim();

          if (!line) {
            if (inSources) inSources = false;
            continue;
          }

          if (line.startsWith('Sources:')) {
            inSources = true;
            inSuggestions = false;
            continue;
          } else if (line.startsWith('Suggestive Questions:')) {
            inSuggestions = true;
            inSources = false;
            continue;
          } else if (line.toLowerCase().includes('seconds')) {
            // Skip parsing timing from content - we'll use actual measured time
            inSources = false;
            inSuggestions = false;
            continue;
          }

          if (inSources && line) {
            const cleanSource = line.replace(/^\*\s*/, '').trim();
            if (cleanSource) sources.push(cleanSource);
          } else if (inSuggestions && line.endsWith('?')) {
            const cleanSuggestion = line.replace(/^\*\s*/, '').trim();
            if (cleanSuggestion) suggestions.push(cleanSuggestion);
          } else if (!inSources && !inSuggestions && line) {
            content += line + '\n';
          }
        }

        parsed = {
          content: formatText(content.trim()),
          sources: sources,
          references: [],
          suggestions: suggestions,
          timing: null // Will be overridden with actual timing
        };
      }

      const apiSuggestions = Array.isArray((result as any)?.suggestive_questions)
        ? (result as any).suggestive_questions
        : Array.isArray((result as any)?.content?.suggestive_questions)
          ? (result as any).content.suggestive_questions
          : [];
      const mergedSuggestions = [...parsed.suggestions, ...apiSuggestions]
        .filter((suggestion) => typeof suggestion === 'string' && suggestion.trim());
      const uniqueSuggestions = Array.from(new Set(mergedSuggestions));

      return {
        text: parsed.content,
        sources: parsed.sources.length > 0 ? parsed.sources : parsed.references,
        suggestions: uniqueSuggestions,
        timing: actualTiming,
        sessionId: returnedSessionId,
      };
    } catch (error) {
      console.error('PSP-SOP API Error:', error);

      // Return user-friendly error message
      const errorMessage = error instanceof Error
        ? error.message
        : "I'm having trouble connecting right now. Please try again in a moment.";

      throw new Error(errorMessage);
    }
  }

  /**
   * Fetch all user chat sessions (history)
   */
  async fetchUserSessions(): Promise<UserSessionsApiResponse> {
    const sessionsUrl = new URL('api/user-sessions', this.config.baseUrl);
    sessionsUrl.searchParams.set('agent_id', this.config.agentId);

    const response = await fetch(sessionsUrl.toString(), {
      method: 'GET',
      headers: this.buildAuthHeaders(),
    });

    if (response.status === 401) {
      await this.handleUnauthorized();
    }

    if (!response.ok) {
      let errorMessage = 'Failed to fetch previous chats.';
      try {
        const errorData = await response.json();
        if (typeof errorData?.message === 'string') {
          errorMessage = errorData.message;
        }
      } catch {
        // ignore malformed error payload
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as UserSessionsApiResponse;
  }

  /**
   * Fetch conversation messages for a specific session
   */
  async fetchSessionConversation(sessionId: string): Promise<SessionConversationApiResponse> {
    const encodedSessionId = encodeURIComponent(sessionId);

    const response = await fetch(
      `${this.config.baseUrl}api/user-sessions/session/${encodedSessionId}/conversation`,
      {
        method: 'GET',
        headers: this.buildAuthHeaders(),
      }
    );

    if (response.status === 401) {
      await this.handleUnauthorized();
    }

    if (!response.ok) {
      let errorMessage = 'Failed to fetch session conversation.';
      try {
        const errorData = await response.json();
        if (typeof errorData?.message === 'string') {
          errorMessage = errorData.message;
        }
      } catch {
        // ignore malformed error payload
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as SessionConversationApiResponse;
  }
}