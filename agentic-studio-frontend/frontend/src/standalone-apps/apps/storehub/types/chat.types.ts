/**
 * TypeScript types for StoreHub Chat Application
 */
export type BlockType =
  | "html"
  | "product_carousel"
  | "chart"
  | "kpi"
  | "divider";

interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
}

export interface HtmlBlock extends BaseBlock {
  html: string;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  currency: string;
}

export interface ProductCarousel {
  id: string;
  title?: string;
  products: Product[];
}

export interface ProductCarouselBlock extends BaseBlock {
  label?: string;
  carousels: ProductCarousel[];
}

export interface ChartBlock extends BaseBlock {
  title?: string;
  chart: unknown;
}

export type MessageBlock = HtmlBlock | ProductCarouselBlock | ChartBlock;

export interface MessageResponse {
  session_id: string;
  message_blocks: MessageBlock[];
}

export interface Message {
  id: string;
  text?: string;
  blocks: MessageBlock[];
  isUser: boolean;
  timestamp: Date;
  timing?: string | null;
  isTyping?: boolean;
}

export interface MessageGroup {
  timestamp: Date;
  messages: Message[];
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isWaitingForResponse: boolean;
  currentError: string | null;
}

export interface ThemeState {
  theme: "light" | "dark";
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

export interface ParsedResponse {
  content: string;
  sources: string[];
  references: string[];
  suggestions: string[];
  timing: string | null;
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
    message_blocks: MessageBlock[] | null;
  };
  log_url: string;
  agent_name: string;
  execution_time: number;
  execution_id: string;
}
