import { pspStoreHubConfig } from "../config/pspStoreHubConfig";
import type {
  DashboardData,
  StoreSentimentResponse,
} from "../types/dashboard.types";
import type {
  ChatHistoryMessage,
  ChatHistorySession,
  Message,
  MessageBlock,
  MessageResponse,
} from "../types/chat.types";
import { AUTH_KEY } from "../../agent-launcher/store/authStore";

const STOREHUB_SESSION_ID = "storehub-sessionid";

export class PspStoreHubService {
  private config = pspStoreHubConfig;
  private API_URL = this.config.baseUrl;

  /**
   * Get the bearer token from auth store
   */
  // private getBearerToken(): string {
  //   const accessToken = useAuthStore.getState();
  //   if (!accessToken) {
  //     throw new Error("No access token available. Please login first.");
  //   }
  //   return accessToken;
  // }

  /**
   * Get sessionId from localStorage
   */
  private getSessionId(): string | null {
    return localStorage.getItem(STOREHUB_SESSION_ID);
  }

  /**
   * Store sessionId in localStorage
   */
  private setSessionId(sessionId: string): void {
    localStorage.setItem(STOREHUB_SESSION_ID, sessionId);
  }

  /**
   * Clear sessionId from localStorage
   */
  clearSessionId(): void {
    localStorage.removeItem(STOREHUB_SESSION_ID);
  }

  /**
   * Send message to StoreHub agent and get response
   */
  async sendMessage(userMessage: string): Promise<{
    blocks: MessageBlock[];
    timing: string | null;
  }> {
    const payload: Record<string, string> = {
      agentId: this.config.agentId,
      userInput: userMessage,
    };

    const authDataStr = localStorage.getItem(AUTH_KEY);
    const authData = authDataStr ? JSON.parse(authDataStr) : null;
    const userEmail = authData?.userEmail || "";

    if (userEmail) {
      payload.user = userEmail;
    }

    // Include sessionId if available
    const sessionId = this.getSessionId();
    if (sessionId) {
      payload.session_id = sessionId;
    }

    // Start timing the actual API request
    const startTime = performance.now();

    try {
      // Make direct fetch call to avoid httpClient auth issues
      const response = await fetch(
        `${this.API_URL}${this.config.apiEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "AGENT-API-KEY": this.config.apiKey,
          },
          body: JSON.stringify(payload),
        }
      );

      // Calculate actual API response time
      const endTime = performance.now();
      const actualResponseTime = ((endTime - startTime) / 1000).toFixed(2);
      const actualTiming = `${actualResponseTime} seconds`;

      if (!response.ok) {
        // Handle HTTP errors
        let errorMessage = "An error occurred while processing your request.";

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
          if (response.status === 401) {
            errorMessage = "Invalid API key or agent ID";
          } else if (response.status === 403) {
            errorMessage = "Access denied to this agent";
          } else if (response.status === 404) {
            errorMessage = "Agent not found";
          } else if (response.status >= 500) {
            errorMessage = "Server error. Please try again later.";
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }

        throw new Error(errorMessage);
      }

      const responseData: MessageResponse = await response.json();

      // Extract and store session_id from response only if we don't already have one
      if (responseData.session_id) {
        const existingSessionId = this.getSessionId();
        // Only store if we don't already have a sessionId
        if (!existingSessionId) {
          this.setSessionId(responseData.session_id);
        }
      }

      return {
        blocks: responseData.message_blocks,
        timing: actualTiming, // Use actual measured API response time
      };
    } catch (error) {
      console.error("StoreHub API Error:", error);

      // Return user-friendly error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "I'm having trouble connecting right now. Please try again in a moment.";

      throw new Error(errorMessage);
    }
  }

  /**
   * Fetch dashboard data from the store-hub graph API
   */
  async getDashboardData(districtId: string = "308"): Promise<DashboardData> {
    try {
      const authDataStr = localStorage.getItem(AUTH_KEY);
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const authToken = authData?.authToken || "";

      const response = await fetch(
        `${this.API_URL}api/agents/custom/store-hub/nrf/graph?district_id=${districtId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        let errorMessage = "Failed to fetch dashboard data";

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          if (response.status === 403) {
            errorMessage = "Access denied to dashboard data";
          } else if (response.status === 404) {
            errorMessage = "Dashboard data not found";
          } else if (response.status >= 500) {
            errorMessage = "Server error while fetching dashboard data";
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        throw error;
      }
      console.error("Dashboard API Error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard data. Please try again.";

      throw new Error(errorMessage);
    }
  }

  /**
   * Fetch store-specific dashboard data from the store-hub graph API
   */
  async getStoreDashboardData(
    districtId: string,
    storeId: string
  ): Promise<StoreSentimentResponse> {
    try {
      const authDataStr = localStorage.getItem(AUTH_KEY);
      const authData = authDataStr ? JSON.parse(authDataStr) : null;
      const authToken = authData?.authToken || "";

      // Get district_name from sessionStorage token data
      let districtName = districtId;
      try {
        const stored = sessionStorage.getItem("storehub-auth-token");
        if (stored) {
          const tokenData = JSON.parse(stored);
          if (tokenData.district_name) {
            districtName = tokenData.district_name;
          }
        }
      } catch (error) {
        console.error(
          "Error reading district_name from sessionStorage:",
          error
        );
      }

      console.log("District ID:", districtId);
      const response = await fetch(
        `${this.API_URL}api/agents/custom/store-hub/store/graph?district_id=${districtName}&store_id=${storeId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = "Failed to fetch store dashboard data";

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          if (response.status === 401) {
            errorMessage = "Unauthorized access to store dashboard data";
          } else if (response.status === 403) {
            errorMessage = "Access denied to store dashboard data";
          } else if (response.status === 404) {
            errorMessage = "Store dashboard data not found";
          } else if (response.status >= 500) {
            errorMessage = "Server error while fetching store dashboard data";
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Store Dashboard API Error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch store dashboard data. Please try again.";

      throw new Error(errorMessage);
    }
  }

  async getAudioTranscription(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    try {
      const response = await fetch(
        `https://inference-hub-engine.impact-agents.ai/api/transcribe`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: {
            Accept: "*/*",
          },
        }
      );
      if (!response.ok) {
        throw new Error("Something went wrong");
      }

      const data: { success: boolean; text: string; language: string } =
        await response.json();

      return data.text;
    } catch {
      throw new Error("Something went wrong");
    }
  }

  async getHistoryList(
    offset: number,
    limit: number
  ): Promise<ChatHistorySession[]> {
    const authDataStr = localStorage.getItem(AUTH_KEY);
    const authData = authDataStr ? JSON.parse(authDataStr) : null;
    const authToken = authData?.authToken || "";
    try {
      const res = await fetch(
        `${this.API_URL}api/user-sessions?limit=${limit}&offset=${offset}&agentId=${this.config.agentId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        throw new Error("Something went wrong");
      }

      const { sessions }: { sessions: ChatHistorySession[] } = await res.json();
      return sessions;
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        throw err;
      }
      throw new Error("Something went wrong");
    }
  }

  async getChatHistoryBySessionId(
    offset: number,
    limit: number,
    sessionId: string
  ): Promise<Message[]> {
    const authDataStr = localStorage.getItem(AUTH_KEY);
    const authData = authDataStr ? JSON.parse(authDataStr) : null;
    const authToken = authData?.authToken || "";

    try {
      const res = await fetch(
        `${this.API_URL}api/user-sessions/session/${sessionId}/conversation?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        throw new Error("Something went wrong");
      }

      const { messages }: { messages: ChatHistoryMessage[] } = await res.json();

      const conversation: Message[] = messages.flatMap((item) => {
        const aiMessage: Message = {
          id: `${item.id}_bot`,
          blocks: item.ai_message.message_blocks || [],
          isUser: false,
          timestamp: new Date(item.timestamp),
          isTyping: false,
        };
        const userMessage: Message = {
          id: `${item.id}_user`,
          text: item.user_input,
          isUser: true,
          timestamp: new Date(item.timestamp),
          isTyping: false,
          blocks: [],
        };

        return [aiMessage, userMessage];
      });

      return conversation;
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        throw err;
      }
      throw new Error("Something went wrong");
    }
  }
}

export const pspService = new PspStoreHubService();
