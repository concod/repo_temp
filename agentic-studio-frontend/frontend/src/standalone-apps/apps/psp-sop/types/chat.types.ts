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
  sessionId?: string;
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
  loading: boolean;
}

export interface ThemeState {
  theme: 'light' | 'dark';
  language: 'english' | 'spanish';
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
  baseUrl: string;
  agentId: string;
  apiKey: string;
  apiEndpoint: string;
}

export interface PspSopPayload {
  agentId: string;
  userInput: string;
  user?: string;
  session_id?: string;
}

// Session & Conversation API types
export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  requestCount: number;
  avgExecutionTime: number | null;
  agentsUsed: string | null;
}

export interface UserSessionListItemApi {
  session_id?: string | null;
  first_request?: string | null;
  last_request?: string | null;
  request_count?: number | null;
  avg_execution_time?: number | null;
  agents_used?: string | null;
  session_title?: string | null;
}

export interface UserSessionsApiResponse {
  user_email?: string | null;
  total_sessions?: number | null;
  sessions?: UserSessionListItemApi[] | null;
}

export interface ConversationMessageApi {
  id?: number | string | null;
  timestamp?: string | null;
  user_input?: string | null;
  ai_message?: {
    type?: string | null;
    content?: {
      text?: string | null;
      html?: string | null;
      suggestive_questions?: string[] | null;
    } | null;
    message_blocks?: Array<{
      type?: string | null;
      content?: unknown;
    }> | null;
  } | null;
  log_url?: string | null;
  agent_name?: string | null;
  execution_time?: number | null;
  execution_id?: string | null;
}

export interface SessionConversationApiResponse {
  session_id?: string | null;
  total_messages?: number | null;
  messages?: ConversationMessageApi[] | null;
}