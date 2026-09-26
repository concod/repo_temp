/**
 * TypeScript types for PSP-SOP Chat Application
 */

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: string[];
  suggestions?: string[];
  timing?: string | null;
  isTyping?: boolean;
}

export interface MessageGroup {
  timestamp: Date;
  messages: Message[];
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

export interface PspSopConfig {
  name: string;
  title: string;
  description: string;
  publicRoute: string;
  agentId: string;
  apiKey: string;
  apiEndpoint: string;
  baseUrl: string;
}

export interface PspSopPayload {
  agentId: string;
  userInput: string;
  user?: string;
  session_id?: string;
}

export interface ChatHistorySession {
  session_id: string;
  session_title: string;
  first_request: string;
  last_request: string;
  request_count: number;
  avg_execution_time: number;
  agents_used: string;
}

export interface ChatHistoryGroup {
  dateRange: string;
  history: ChatHistorySession[];
}

export interface ChatHistoryMessage {
  id: number;
  timestamp: string;
  user_input: string;
  ai_message: {
    type: string;
    content: {
      text: string;
      html: string;
    };
  };
  log_url: string;
  agent_name: string;
  execution_time: number;
  execution_id: string;
}
