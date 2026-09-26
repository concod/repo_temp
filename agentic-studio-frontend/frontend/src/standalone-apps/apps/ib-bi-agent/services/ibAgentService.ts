import { ibAgentConfig, DEEP_RESEARCH_CLASSIFIER_AGENT_ID } from "../config/ibAgentConfig";
import type {
  SessionConversationApiResponse,
  StructuredDataResponse,
  UserSessionsApiResponse,
} from "../types/chat.types";

const AUTH_STORAGE_KEY = "ib-bi-auth-token";
const IB_BI_UNAUTHORIZED_EVENT = "ib-bi-agent:unauthorized";

export type QueryClassificationType = "simple" | "complex";

export type QueryClassification = {
  type: QueryClassificationType;
  status: string;
  /** Classification title used for chat history drawer titles */
  title?: string;
};

type AgentResponse = {
  text: string;
  htmlContent?: string;
  sources: string[];
  suggestions: string[];
  timing: string | null;
  executionId?: string;
  sessionId?: string;
};

export class IBAgentService {
  private config = ibAgentConfig;

  private getStoredTokenData(): Record<string, unknown> | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private notifyUnauthorized(): never {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(IB_BI_UNAUTHORIZED_EVENT));
    }
    throw new Error("Session expired. Please login again.");
  }

  private assertAuthorized(response: Response): void {
    if (response.status === 401) {
      this.notifyUnauthorized();
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private readSuggestiveQuestions(...candidates: unknown[]): string[] {
    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) continue;

      const normalized = candidate
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);

      if (normalized.length > 0) {
        return Array.from(new Set(normalized));
      }
    }

    return [];
  }

  private getAccessToken(): string | null {
    const tokenData = this.getStoredTokenData();
    return typeof tokenData?.access_token === "string" && tokenData.access_token.trim()
      ? tokenData.access_token
      : null;
  }

  private getUserEmail(): string | null {
    const tokenData = this.getStoredTokenData();
    return typeof tokenData?.user_email === "string" && tokenData.user_email.trim()
      ? tokenData.user_email
      : null;
  }

  private buildExecuteHeaders(): Record<string, string> {
    const token = this.getAccessToken();

    return {
      "Content-Type": "application/json",
      "AGENT-API-KEY": this.config.apiKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private buildAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();

    if (!token) {
      throw new Error("Authentication token is missing. Please login again.");
    }

    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "AGENT-API-KEY": this.config.apiKey,
    };
  }

  async fetchUserSessions(): Promise<UserSessionsApiResponse> {
    const sessionsUrl = new URL("api/user-sessions", this.config.baseUrl);
    sessionsUrl.searchParams.set("agent_id", this.config.agentId);

    const response = await fetch(sessionsUrl.toString(), {
      method: "GET",
      headers: this.buildAuthHeaders(),
    });

    this.assertAuthorized(response);

    if (!response.ok) {
      let errorMessage = "Failed to fetch previous chats.";
      try {
        const errorData = await response.json();
        if (typeof errorData?.message === "string") {
          errorMessage = errorData.message;
        }
      } catch {
        // ignore malformed error payload
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as UserSessionsApiResponse;
  }

  async fetchSessionConversation(sessionId: string): Promise<SessionConversationApiResponse> {
    const encodedSessionId = encodeURIComponent(sessionId);
    const response = await fetch(
      `${this.config.baseUrl}api/user-sessions/session/${encodedSessionId}/conversation`,
      {
        method: "GET",
        headers: this.buildAuthHeaders(),
      }
    );

    this.assertAuthorized(response);

    if (!response.ok) {
      let errorMessage = "Failed to fetch session conversation.";
      try {
        const errorData = await response.json();
        if (typeof errorData?.message === "string") {
          errorMessage = errorData.message;
        }
      } catch {
        // ignore malformed error payload
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as SessionConversationApiResponse;
  }

  /**
   * Calls the execute API with the classifier agent to get query type and status.
   * Same endpoint and payload shape, only agentId differs.
   */
  async fetchQueryClassification(userMessage: string, sessionId?: string): Promise<QueryClassification> {
    const userEmail = this.getUserEmail();
    const payload = {
      agentId: DEEP_RESEARCH_CLASSIFIER_AGENT_ID,
      userInput: userMessage,
      ...(userEmail ? { user: userEmail } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    };

    const response = await fetch(
      `${this.config.baseUrl}${this.config.apiEndpoint}`,
      {
        method: "POST",
        headers: this.buildExecuteHeaders(),
        body: JSON.stringify(payload),
      }
    );

    this.assertAuthorized(response);

    if (!response.ok) {
      const fallback: QueryClassification = {
        type: "simple",
        status: "Analyzing your request",
      };
      try {
        const errorData = await response.json();
        const msg = errorData.message ?? errorData.error ?? errorData.detail;
        if (typeof msg === "string") fallback.status = msg;
      } catch {
        // ignore
      }
      return fallback;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const result = (data.result ?? data) as Record<string, unknown> | undefined;

    // Response may be { text: "```json\n{ \"type\": \"simple\", \"status\": \"...\" }\n```" }
    const rawText =
      (result?.text ?? data.text ?? (result?.content as Record<string, unknown>)?.text) as
      | string
      | undefined;
    let type: string | undefined;
    let status: string | undefined;
    let title: string | undefined;

    if (typeof rawText === "string" && rawText.trim()) {
      const parsed = this.parseClassificationFromText(rawText);
      if (parsed) {
        type = parsed.type;
        status = parsed.status;
        title = parsed.title;
      }
    }

    if (type === undefined || status === undefined) {
      type = (result?.type ?? data.type) as string | undefined;
      status = (result?.status ?? data.status) as string | undefined;
    }

    if (title === undefined) {
      const rawTitle = (result?.title ?? data.title) as string | undefined;
      if (typeof rawTitle === "string" && rawTitle.trim()) {
        title = rawTitle.trim();
      }
    }

    const classificationType: QueryClassificationType =
      type === "complex" ? "complex" : "simple";
    const classificationStatus =
      typeof status === "string" && status.trim()
        ? status.trim()
        : "Analyzing your request";

    return {
      type: classificationType,
      status: classificationStatus,
      ...(title ? { title } : {}),
    };
  }

  /**
   * Extracts type and status from a text field that may contain JSON in markdown code blocks.
   */
  private parseClassificationFromText(text: string): { type: string; status: string; title?: string } | null {
    let jsonStr = text.trim();
    const codeBlockMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    try {
      const obj = JSON.parse(jsonStr) as Record<string, unknown>;
      const t = obj?.type;
      const s = obj?.status;
      if (typeof t === "string" && typeof s === "string") {
        const title = typeof obj?.title === "string" ? obj.title : undefined;
        return { type: t, status: s, title };
      }
    } catch {
      // ignore
    }
    return null;
  }

  async sendMessage(userMessage: string, agentId?: string, sessionId?: string): Promise<AgentResponse> {
    const userEmail = this.getUserEmail();
    const payload = {
      agentId: agentId || this.config.agentId,
      userInput: userMessage,
      ...(userEmail ? { user: userEmail } : {}),
      ...(sessionId ? { session_id: sessionId } : {}),
    };

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.apiEndpoint}`,
        {
          method: "POST",
          headers: this.buildExecuteHeaders(),
          body: JSON.stringify(payload),
        }
      );

      this.assertAuthorized(response);

      const endTime = performance.now();
      const actualResponseTime = ((endTime - startTime) / 1000).toFixed(2);
      const actualTiming = `${actualResponseTime} seconds`;

      if (!response.ok) {
        let errorMessage = "An error occurred while processing your request.";

        try {
          const errorData = await response.json();
          if (errorData.message) errorMessage = errorData.message;
          else if (errorData.error) errorMessage = errorData.error;
          else if (errorData.detail) errorMessage = errorData.detail;
        } catch {
          if (response.status === 401) errorMessage = "Invalid API key or agent ID";
          else if (response.status === 403) errorMessage = "Access denied to this agent";
          else if (response.status === 404) errorMessage = "Agent not found";
          else if (response.status >= 500) errorMessage = "Server error. Please try again later.";
          else errorMessage = `Request failed with status ${response.status}`;
        }

        throw new Error(errorMessage);
      }

      const responseData = (await response.json()) as Record<string, unknown>;
      const resultUnknown = responseData.result ?? responseData;
      const result =
        this.isRecord(resultUnknown)
          ? (resultUnknown as Record<string, unknown>)
          : ({} as Record<string, unknown>);
      const resultContent = this.isRecord(result.content)
        ? result.content
        : ({} as Record<string, unknown>);

      const executionId = [
        result.execution_id,
        result.executionId,
        responseData.execution_id,
        responseData.executionId,
      ].find((value) => typeof value === "string") as string | undefined;

      const sessionId = [
        result.session_id,
        result.sessionId,
        responseData.session_id,
        responseData.sessionId,
      ].find((value) => typeof value === "string") as string | undefined;

      if (result && result.type === "error") {
        let errorMessage = "An error occurred while processing your request.";
        const content = this.isRecord(result.content)
          ? result.content
          : null;

        if (content && typeof content.message === "string") {
          errorMessage = content.message;
          if (typeof content.details === "string") {
            errorMessage += `\n\nDetails: ${content.details}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Use content.text for chat output (ib-agent standalone)
      let responseText = "";
      if (typeof resultContent.text === "string" && resultContent.text.trim()) {
        responseText = resultContent.text;
      } else if (
        typeof resultContent.response === "string" &&
        resultContent.response.trim()
      ) {
        responseText = resultContent.response;
      } else if (typeof result?.answer === "string") {
        responseText = result.answer;
      } else if (typeof result?.response === "string") {
        responseText = result.response;
      } else if (typeof result?.result === "string") {
        responseText = result.result;
      } else if (typeof result?.text === "string") {
        responseText = result.text;
      } else if (typeof resultUnknown === "string") {
        responseText = resultUnknown;
      } else {
        responseText =
          "Response received but couldn't extract text. Please try again.";
      }

      const parsed = this.parseContent(responseText);
      const text = parsed.content.trim() ? parsed.content : responseText;
      const suggestiveQuestions = this.readSuggestiveQuestions(
        resultContent.suggestive_questions,
        resultContent.suggestiveQuestions,
        result.suggestive_questions,
        result.suggestiveQuestions,
        responseData.suggestive_questions,
        responseData.suggestiveQuestions
      );
      const suggestions = suggestiveQuestions.length
        ? suggestiveQuestions
        : parsed.suggestions;

      return {
        text,
        htmlContent: undefined,
        sources: parsed.sources,
        suggestions,
        timing: actualTiming,
        executionId,
        sessionId,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "I'm having trouble connecting right now. Please try again in a moment.";

      throw new Error(message);
    }
  }

  private parseContent(responseText: string): {
    content: string;
    sources: string[];
    suggestions: string[];
  } {
    const lines = responseText.split("\n");
    let content = "";
    const sources: string[] = [];
    const suggestions: string[] = [];
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
      }

      if (line.startsWith("Suggestive Questions:")) {
        inSuggestions = true;
        inSources = false;
        continue;
      }

      if (line.toLowerCase().includes("seconds")) {
        inSources = false;
        inSuggestions = false;
        continue;
      }

      if (inSources) {
        const cleanSource = line.replace(/^\*\s*/, "").trim();
        if (cleanSource) sources.push(cleanSource);
      } else if (inSuggestions && line.endsWith("?")) {
        const cleanSuggestion = line.replace(/^\*\s*/, "").trim();
        if (cleanSuggestion) suggestions.push(cleanSuggestion);
      } else if (!inSources && !inSuggestions) {
        content += line + "\n";
      }
    }

    return {
      content: content.trim(),
      sources,
      suggestions,
    };
  }

  /**
   * Fetch and validate structured data JSON from a URL.
   * Used when response text contains a Data File link to .json.
   */
  async fetchStructuredData(url: string): Promise<StructuredDataResponse> {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch structured data: ${response.status}`);
      }
      const data = (await response.json()) as unknown;
      if (!this.isValidStructuredData(data)) {
        throw new Error("Invalid structured data format");
      }
      return data as StructuredDataResponse;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Failed to fetch structured data");
    }
  }

  private isValidStructuredData(data: unknown): data is StructuredDataResponse {
    if (!data || typeof data !== "object") return false;
    const o = data as Record<string, unknown>;
    const summary = o.summary;
    if (!summary || typeof summary !== "object") return false;
    const s = summary as Record<string, unknown>;
    if (
      typeof s.title !== "string" ||
      typeof s.answer !== "string" ||
      !Array.isArray(s.key_insights)
    ) {
      return false;
    }
    // Accept both old and new table/chart/metric formats
    if (o.tables !== undefined && !Array.isArray(o.tables)) return false;
    if (o.charts !== undefined && !Array.isArray(o.charts)) return false;
    if (o.metrics !== undefined && !Array.isArray(o.metrics)) return false;
    return true;
  }

  async getAudioTranscription(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    const response = await fetch(
      "https://inference-hub-engine.impact-agents.ai/api/transcribe",
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
      throw new Error("Transcription failed");
    }

    const data: { success: boolean; text: string; language: string } =
      await response.json();

    return data.text ?? "";
  }
}

