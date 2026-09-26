/**
 * TypeScript types for Lululemon Trend Generator App
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
  theme: 'light' | 'dark';
  language: 'english' | 'spanish';
}

export interface LululemonTrendConfig {
  name: string;
  title: string;
  description: string;
  publicRoute: string;
  agentId: string;
  apiKey: string;
  apiEndpoint: string;
  baseUrl: string;
}


