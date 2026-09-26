/**
 * TypeScript types for PSP-StoreHub Chat Application
 */

export interface Message {
  id: string;
  text?: string;
  htmlContent?: string; // Rich HTML content from API (preferred over text)
  isUser: boolean;
  timestamp: Date | string;
  timing?: string | null;
  isTyping?: boolean;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isWaitingForResponse: boolean;
  currentError: string | null;
}

export interface ThemeState {
  theme: 'light' | 'dark';
}

export interface ApiResponse {
  result?: {
    content?: {
      text?: string;
      message?: string;
      details?: string;
    };
    html_content?: string;
    answer?: string;
    response?: string;
    text?: string;
    type?: string;
    result?: string;
  };
}

export interface PspStoreHubConfig {
  name: string;
  title: string;
  baseUrl: string;
  description: string;
  publicRoute: string;
  agentId: string;
  apiKey: string;
  apiEndpoint: string;
}
