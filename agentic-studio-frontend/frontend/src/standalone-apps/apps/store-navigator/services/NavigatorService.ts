import type { Product } from "../components/ProductCard/ProductCard";
import { pspSopConfig } from "../config/pspSopConfig";
import type { ProductRecommendation } from "../hooks/useFetchSearchResults";
import type {
  AgentExecutionResponse,
  ChatHistoryMessage,
  ChatHistorySession,
  Message,
  ParsedResponse,
  PspSopPayload,
} from "../types/chat.types";
import type { StoreConfig } from "../types/store.types";
import {
  parseMarkdownResponse,
  parseHTMLResponse,
  formatText,
} from "../utils/messageParser";

export const BASE_URL = "https://tools.impact-agents.ai/api/store_navigator";
const NAVIGATOR_SESSION_ID = "navigator-sessionid";

export class NavigatorService {
  private config = pspSopConfig;

  /**
   * Get sessionId from localStorage
   */
  private getSessionId(): string | null {
    return localStorage.getItem(NAVIGATOR_SESSION_ID);
  }

  /**
   * Store sessionId in localStorage
   */
  private setSessionId(sessionId: string): void {
    localStorage.setItem(NAVIGATOR_SESSION_ID, sessionId);
  }

  /**
   * Clear sessionId from localStorage
   */
  clearSessionId(): void {
    localStorage.removeItem(NAVIGATOR_SESSION_ID);
  }

  private parseMessage(aiMessage: any): ParsedResponse {
    let parsed: ParsedResponse;

    if (
      aiMessage &&
      (aiMessage as any).content &&
      typeof (aiMessage as any).content.text === "string" &&
      (aiMessage as any).content.text.trim()
    ) {
      // Use markdown content parser for the new response format
      parsed = parseMarkdownResponse((aiMessage as any).content.text);
    } else if (
      aiMessage &&
      (aiMessage as any).content &&
      typeof (aiMessage as any).content.html === "string" &&
      (aiMessage as any).content.html.trim()
    ) {
      // Fallback to HTML content parser for legacy responses
      parsed = parseHTMLResponse((aiMessage as any).content.html);
    } else {
      parsed = {
        content: "Couldn't parse the message",
        sources: [],
        references: [],
        suggestions: [],
        timing: null,
      };
    }

    return parsed;
  }

  /**
   * Send message to PSP-SOP agent and get response
   */
  async sendMessage(userMessage: string): Promise<{
    text: string;
    sources: string[];
    suggestions: string[];
    timing: string | null;
  }> {
    const payload: PspSopPayload = {
      agentId: this.config.agentId,
      userInput: userMessage,
    };

    // Start timing the actual API request
    const startTime = performance.now();

    const authDataStr = sessionStorage.getItem("psp-sop-auth");
    const authData = authDataStr ? JSON.parse(authDataStr) : null;
    const userEmail = authData?.userEmail || null;
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
      const response = await fetch(`${BASE_URL}/${this.config.apiEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "AGENT-API-KEY": this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

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

      const responseData = await response.json();
      const result = responseData.result || responseData;

      // Extract and store session_id from response only if we don't already have one
      if (
        responseData.session_id &&
        typeof responseData.session_id === "string"
      ) {
        const existingSessionId = this.getSessionId();
        // Only store if we don't already have a sessionId
        if (!existingSessionId) {
          this.setSessionId(responseData.session_id);
        }
      }

      // Check if this is an error response
      if (result && (result as any).type === "error") {
        let errorMessage = "An error occurred while processing your request.";

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

      if (
        result &&
        (result as any).content &&
        typeof (result as any).content.text === "string" &&
        (result as any).content.text.trim()
      ) {
        // Use markdown content parser for the new response format
        parsed = parseMarkdownResponse((result as any).content.text);
      } else if (
        result &&
        (result as any).html_content &&
        typeof (result as any).html_content === "string" &&
        (result as any).html_content.trim()
      ) {
        // Fallback to HTML content parser for legacy responses
        parsed = parseHTMLResponse((result as any).html_content);
      } else {
        // Fallback to text parsing for other formats
        let responseText = "";
        if (
          result &&
          typeof (result as any).answer === "string" &&
          (result as any).answer.trim()
        ) {
          responseText = (result as any).answer;
        } else if (
          result &&
          typeof (result as any).response === "string" &&
          (result as any).response.trim()
        ) {
          responseText = (result as any).response;
        } else if (
          result &&
          typeof (result as any).result === "string" &&
          (result as any).result.trim()
        ) {
          responseText = (result as any).result;
        } else if (
          result &&
          typeof (result as any).text === "string" &&
          (result as any).text.trim()
        ) {
          responseText = (result as any).text;
        } else if (result && typeof result === "string" && result.trim()) {
          responseText = result;
        } else {
          console.warn("Couldn't find a valid response field in:", result);
          responseText =
            "Response received but couldn't extract text. Please try again.";
        }

        // Parse the response to extract content, sources, and suggestions
        const lines = responseText.split("\n");
        let content = "";
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

          if (line.startsWith("Sources:")) {
            inSources = true;
            inSuggestions = false;
            continue;
          } else if (line.startsWith("Suggestive Questions:")) {
            inSuggestions = true;
            inSources = false;
            continue;
          } else if (line.toLowerCase().includes("seconds")) {
            // Skip parsing timing from content - we'll use actual measured time
            inSources = false;
            inSuggestions = false;
            continue;
          }

          if (inSources && line) {
            const cleanSource = line.replace(/^\*\s*/, "").trim();
            if (cleanSource) sources.push(cleanSource);
          } else if (inSuggestions && line.endsWith("?")) {
            const cleanSuggestion = line.replace(/^\*\s*/, "").trim();
            if (cleanSuggestion) suggestions.push(cleanSuggestion);
          } else if (!inSources && !inSuggestions && line) {
            content += line + "\n";
          }
        }

        parsed = {
          content: formatText(content.trim()),
          sources: sources,
          references: [],
          suggestions: suggestions,
          timing: null, // Will be overridden with actual timing
        };
      }

      return {
        text: parsed.content,
        sources: parsed.sources.length > 0 ? parsed.sources : parsed.references,
        suggestions: parsed.suggestions,
        timing: actualTiming, // Use actual measured API response time
      };
    } catch (error) {
      console.error("PSP-SOP API Error:", error);

      // Return user-friendly error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : "I'm having trouble connecting right now. Please try again in a moment.";

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
    try {
      const res = await fetch(
        `${BASE_URL}/api/user-sessions?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error();
      }

      const { sessions }: { sessions: ChatHistorySession[] } = await res.json();
      return sessions;
    } catch {
      throw new Error("Something went wrong");
    }
  }

  async getChatHistoryBySessionId(
    offset: number,
    limit: number,
    sessionId: string
  ): Promise<Message[]> {
    console.log(offset, limit, sessionId);

    try {
      const res = await fetch(
        `${BASE_URL}/api/user-sessions/session/${sessionId}/conversation?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error();
      }

      const { messages }: { messages: ChatHistoryMessage[] } = await res.json();

      const conversation: Message[] = messages.flatMap((item) => {
        const parsedAIMessage = this.parseMessage(item.ai_message);
        const aiMessage: Message = {
          id: `${item.id}_bot`,
          text: parsedAIMessage.content,
          isUser: false,
          timestamp: item.timestamp,
          isTyping: false,
        };
        const userMessage: Message = {
          id: `${item.id}_user`,
          text: item.user_input,
          isUser: true,
          timestamp: item.timestamp,
          isTyping: false,
        };

        return [aiMessage, userMessage];
      });

      return conversation;
    } catch {
      throw new Error("Something went wrong");
    }
  }

  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch(`${BASE_URL}/products`, {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data: Product[] = await response.json();
      return data;
    } catch {
      throw new Error("Something went wrong");
    }
  }

  async getStoreMap(): Promise<StoreConfig> {
    try {
      const response = await fetch(`${BASE_URL}/store`, {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data: StoreConfig = await response.json();
      return data;
    } catch {
      throw new Error("Something went wrong");
    }
  }

  async executeAgent(userMessage: string): Promise<AgentExecutionResponse> {
    const payload: PspSopPayload = {
      agentId: this.config.agentId,
      userInput: userMessage,
    };

    // Include sessionId if available
    const sessionId = this.getSessionId();
    if (sessionId) {
      payload.session_id = sessionId;
    }

    try {
      const response = await fetch(
        `https://impact-agents.ai/${this.config.apiEndpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "AGENT-API-KEY": this.config.apiKey,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data: AgentExecutionResponse = await response.json();
      if (data.type === "error") {
        throw new Error();
      }

      // Extract and store session_id from response only if we don't already have one
      if (data.session_id && typeof data.session_id === "string") {
        const existingSessionId = this.getSessionId();
        // Only store if we don't already have a sessionId
        if (!existingSessionId) {
          this.setSessionId(data.session_id);
        }
      }

      return data;
    } catch {
      throw new Error("Something went wrong");
    }
  }

  async getSearchRecommendations(
    query: string
  ): Promise<ProductRecommendation> {
    try {
      const response = await fetch(`${BASE_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          query: query,
          history: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data: ProductRecommendation = await response.json();
      return data;
    } catch {
      throw new Error("Something went wrong");
    }
  }

  async getProductRecommendations(
    productId: string
  ): Promise<ProductRecommendation> {
    try {
      const response = await fetch(`${BASE_URL}/ai/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          productIds: [productId],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data: ProductRecommendation = await response.json();
      return data;
    } catch {
      throw new Error("Something went wrong");
    }
  }
}

export const navigatorService = new NavigatorService();
