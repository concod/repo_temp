import { pspStoreHubConfig } from "../config/pspStoreHubConfig";
import { formatText } from "../utils/messageParser";
import type {
  AllStores,
  DashboardData,
  DataDateRange,
  StoreData,
  StoreSentimentResponse,
} from "../types/dashboard.types";
import { useAuthStore } from "../store/authStore";
import { formatDateYYYYMMDD } from "../utils/dateFormatter";

export class PspStoreHubService {
  private config = pspStoreHubConfig;
  private API_URL = this.config.baseUrl;

  /**
   * Get the bearer token from auth store
   */
  private getBearerToken(): string {
    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      throw new Error("No access token available. Please login first.");
    }
    return accessToken;
  }

  /**
   * Handle 401 unauthorized response by logging out the user
   */
  private handleUnauthorized(): void {
    const authStore = useAuthStore.getState();
    if (authStore.isAuthenticated) {
      console.warn("401 Unauthorized response received. Logging out user.");
      authStore.logout();
    }
  }
  /**
   * Send message to PSP-StoreHub agent and get response
   */
  async sendMessage(userMessage: string): Promise<{
    text?: string;
    htmlContent?: string;
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
        // Handle 401 unauthorized immediately
        if (response.status === 401) {
          this.handleUnauthorized();
        }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (
        result &&
        typeof result === "object" &&
        "type" in result &&
        (result as any).type === "error"
      ) {
        let errorMessage = "An error occurred while processing your request.";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorResult = result as any;
        if (errorResult.content && errorResult.content.message) {
          errorMessage = errorResult.content.message;

          if (errorResult.content.details) {
            errorMessage += `\n\nDetails: ${errorResult.content.details}`;
          }
        }

        throw new Error(errorMessage);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resultObj = result as any;

      // Priority: html_content > content.text > other text fields
      let htmlContent: string | undefined;
      let text: string | undefined;

      // Check for html_content first (preferred format)
      if (
        resultObj &&
        resultObj.html_content &&
        typeof resultObj.html_content === "string" &&
        resultObj.html_content.trim()
      ) {
        htmlContent = resultObj.html_content;
      }
      // Fallback to content.text (markdown/plain text)
      else if (
        resultObj &&
        resultObj.content &&
        typeof resultObj.content.text === "string" &&
        resultObj.content.text.trim()
      ) {
        text = resultObj.content.text;
      }
      // Fallback to other text fields
      else {
        let responseText = "";
        if (
          resultObj &&
          typeof resultObj.answer === "string" &&
          resultObj.answer.trim()
        ) {
          responseText = resultObj.answer;
        } else if (
          resultObj &&
          typeof resultObj.response === "string" &&
          resultObj.response.trim()
        ) {
          responseText = resultObj.response;
        } else if (
          resultObj &&
          typeof resultObj.result === "string" &&
          resultObj.result.trim()
        ) {
          responseText = resultObj.result;
        } else if (
          resultObj &&
          typeof resultObj.text === "string" &&
          resultObj.text.trim()
        ) {
          responseText = resultObj.text;
        } else if (result && typeof result === "string" && result.trim()) {
          responseText = result;
        } else {
          console.warn("Couldn't find a valid response field in:", result);
          responseText =
            "Response received but couldn't extract text. Please try again.";
        }

        text = formatText(responseText.trim());
      }

      return {
        ...(htmlContent ? { htmlContent } : {}),
        ...(text ? { text } : {}),
        timing: actualTiming, // Use actual measured API response time
      };
    } catch (error) {
      console.error("PSP-StoreHub API Error:", error);

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
  async getDashboardData(
    districtId: string = "308",
    startDate: Date,
    endDate: Date
  ): Promise<DashboardData> {
    try {
      const bearerToken = this.getBearerToken();

      const response = await fetch(
        `${
          this.API_URL
        }api/agents/custom/store-hub/graph?district_id=${districtId}&start_date=${formatDateYYYYMMDD(
          startDate
        )}&end_date=${formatDateYYYYMMDD(endDate)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );

      if (!response.ok) {
        // Handle 401 unauthorized immediately
        if (response.status === 401) {
          this.handleUnauthorized();
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
          if (response.status === 401) {
            errorMessage = "Unauthorized access to dashboard data";
          } else if (response.status === 403) {
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
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StoreSentimentResponse> {
    try {
      const bearerToken = this.getBearerToken();

      // Get district_name from sessionStorage token data
      let districtName = districtId;
      try {
        const stored = sessionStorage.getItem("psp-storehub-auth-token");
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

      const response = await fetch(
        `${
          this.API_URL
        }api/agents/custom/store-hub/store/graph?district_id=${districtName}&store_id=${storeId}&start_date=${formatDateYYYYMMDD(
          startDate
        )}&end_date=${formatDateYYYYMMDD(endDate)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );

      if (!response.ok) {
        // Handle 401 unauthorized immediately
        if (response.status === 401) {
          this.handleUnauthorized();
        }

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

  async getAllStores(districtId: string): Promise<StoreData[]> {
    try {
      const bearerToken = this.getBearerToken();

      const response = await fetch(
        `${this.API_URL}api/agents/custom/store-hub/all-stores?district_id=${districtId}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );

      if (!response.ok) {
        // Handle 401 unauthorized immediately
        if (response.status === 401) {
          this.handleUnauthorized();
        }

        let errorMessage = "Failed to fetch store data";

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          if (response.status === 401) {
            errorMessage = "Unauthorized access to store data";
          } else if (response.status === 403) {
            errorMessage = "Access denied to store data";
          } else if (response.status === 404) {
            errorMessage = "Store data not found";
          } else if (response.status >= 500) {
            errorMessage = "Server error while fetching store data";
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data: { allStores: AllStores } = await response.json();
      return data.allStores.stores.map((item) => ({
        store_id: item.id,
        store_name: item.name,
      }));
    } catch (error) {
      console.error("Store API Error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch store data. Please try again.";

      throw new Error(errorMessage);
    }
  }

  async getDateRange(): Promise<DataDateRange> {
    try {
      const bearerToken = this.getBearerToken();

      const response = await fetch(
        `${this.API_URL}api/agents/custom/store-hub/date-ranges`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );

      if (!response.ok) {
        // Handle 401 unauthorized immediately
        if (response.status === 401) {
          this.handleUnauthorized();
        }

        let errorMessage = "Failed to fetch date range";

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          if (response.status === 401) {
            errorMessage = "Unauthorized access to date range";
          } else if (response.status === 403) {
            errorMessage = "Access denied to date range";
          } else if (response.status === 404) {
            errorMessage = "Date range not found";
          } else if (response.status >= 500) {
            errorMessage = "Server error while fetching date range";
          } else {
            errorMessage = `Request failed with status ${response.status}`;
          }
        }

        throw new Error(errorMessage);
      }

      const data: DataDateRange = await response.json();
      return data;
    } catch (error) {
      console.error("Store API Error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch date range. Please try again.";

      throw new Error(errorMessage);
    }
  }
}

export const pspStoreHubService = new PspStoreHubService();
