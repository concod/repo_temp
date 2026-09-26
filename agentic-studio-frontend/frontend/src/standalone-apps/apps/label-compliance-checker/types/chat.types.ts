/**
 * TypeScript types for PSP-SOP Chat Application
 */

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date | string;
  sources?: string[];
  suggestions?: string[];
  timing?: string | null;
  isTyping?: boolean;
  imageUrl?: string;
}

export interface Source {
  id: number;
  name: string;
  url?: string;
}

export interface ParsedResponse {
  content: string;
  sources: string[];
  references: string[];
  suggestions: string[];
  timing: string | null;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isWaitingForResponse: boolean;
  currentError: string | null;
}

export interface ThemeState {
  theme: "light" | "dark";
  language: "english" | "spanish";
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

export interface LabelComplianceAgentConfigInterface {
  name: string;
  title: string;
  baseUrl: string;
  toolsBaseUrl: string;
  description: string;
  publicRoute: string;
  agentId: string;
  apiKey: string;
  apiEndpoint: string;
}
