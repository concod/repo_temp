import { labelComplianceAgentConfig } from "../config/labelComplianceConfig";
import {
  parseMarkdownResponse,
  parseHTMLResponse,
  formatText,
} from "../utils/messageParser";

export class LabelComplianceService {
  private config = labelComplianceAgentConfig;

  /**
   * Upload file and get URL for processing
   */
  async uploadFile(file: File): Promise<{
    url: string;
    sources: string[];
    suggestions: string[];
    timing: string | null;
  }> {
    // const token = localStorage.getItem('authToken') || '';
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(
        `${this.config.toolsBaseUrl}/internal/upload-label-compliance-file`,
        {
          method: "POST",
          headers: {
            // 'Authorization': `Bearer ${token}`,
            "AGENT-API-KEY": this.config.apiKey,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        url: data?.url || "",
        sources: data?.sources || [],
        suggestions: data?.suggestions || [],
        timing: data?.timing || null,
      };
    } catch (error) {
      throw new Error(
        `Failed to process the uploaded file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Send message to Label Compliance Agent and get response
   */
  async sendMessage(userMessage: string): Promise<{
    text: string;
    sources: string[];
    suggestions: string[];
    timing: string | null;
  }> {
    const payload = {
      agentId: this.config.agentId,
      userInput: userMessage,
    };

    // Start timing the actual API request
    const startTime = performance.now();

    try {
      // Make direct fetch call to avoid httpClient auth issues
      const response = await fetch(
        `${this.config.baseUrl}${this.config.apiEndpoint}`,
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

      const responseData = await response.json();
      const result = responseData.result || responseData;

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
}
