/** Structured data response from JSON file (summary, tables, charts, metrics) */

export interface DataAvailability {
  requested_items: string[];
  found_items: string[];
  missing_items: string[];
}

export interface SummarySection {
  title: string;
  answer: string;
  data_availability?: DataAvailability;
  key_insights: string[];
}

/** New column format with name and data type */
export interface TableColumn {
  name: string;
  datatype: string;
  /** Optional display format hint (e.g. "$X.XXB", "X.XX%") */
  format?: string;
}

/** New row format with display values and raw numeric values */
export interface TableRow {
  values: string[];
  raw_values: (number | null)[];
}

export interface TableData {
  title: string;
  description?: string;
  /** Supports both legacy string[] and new TableColumn[] format */
  columns: TableColumn[] | string[];
  /** Supports both legacy string[][] and new TableRow[] format */
  rows: TableRow[] | string[][];
  relevant?: boolean;
}

/** A single data point for scatter charts */
export interface ScatterPoint {
  x: number;
  y: number;
}

/** All supported chart types */
export type ChartType =
  | "bar"
  | "horizontal-bar"
  | "line"
  | "pie"
  | "doughnut"
  | "scatter";

export interface ChartDataset {
  label: string;
  /** number[] for most chart types; ScatterPoint[] for scatter charts */
  data: number[] | ScatterPoint[];
  /** Formatted display values for labels/tooltips (e.g. "$3.72B", "37.40%") */
  formatted_data?: string[];
  /** Data type hint for interpreting values (e.g. "currency", "percentage") */
  datatype?: string;
  /** Single color string or array of colors (for pie/doughnut charts) */
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
}

export interface ChartData {
  type: ChartType | string;
  title: string;
  description?: string;
  xAxisTitle?: string;
  yAxisTitle?: string;
  /** Category labels. Optional for scatter charts which use numeric axes. */
  labels?: string[];
  datasets: ChartDataset[];
  stacking?: "normal" | "percent";
  relevant?: boolean;
}

export interface MetricData {
  label: string;
  value: string;
  raw_value?: number | null;
  datatype?: string;
  icon?: string;
  image?: string;
  subtitle?: string;
  relevant?: boolean;
}

/* ── Helper utilities for backward-compatible access ── */

/** Extract the display name from a column (handles both old string and new object format) */
export function getColumnName(col: TableColumn | string): string {
  return typeof col === "string" ? col : col.name;
}

/** Extract the data type from a column (returns "text" for legacy string columns) */
export function getColumnDatatype(col: TableColumn | string): string {
  return typeof col === "string" ? "text" : col.datatype;
}

/** Extract display values from a row (handles both old string[] and new TableRow format) */
export function getRowValues(row: TableRow | string[]): string[] {
  return Array.isArray(row) ? row : row.values;
}

/** Extract raw numeric values from a row (returns null[] for legacy string[] rows) */
export function getRowRawValues(row: TableRow | string[]): (number | null)[] {
  return Array.isArray(row) ? row.map(() => null) : row.raw_values;
}

export interface StructuredDataResponse {
  report_title?: string;
  classification?: string;
  citation_map?: Record<string, string>;
  source_links?: string[];
  summary: SummarySection;
  tables?: TableData[];
  charts?: ChartData[];
  metrics?: MetricData[];
}

export interface Message {
  id: string;
  text: string;
  htmlContent?: string;
  structuredData?: StructuredDataResponse;
  isUser: boolean;
  timestamp: Date;
  clientTimestamp: Date;
  sources?: string[];
  suggestions?: string[];
  timing?: string | null;
  isTyping?: boolean;
  executionId?: string;
  sessionId?: string;
  logUrl?: string;
  agentName?: string;
  executionTime?: number | null;
}

export type QueryClassificationType = "simple" | "complex";

export interface QueryClassificationResult {
  type: QueryClassificationType;
  status: string;
  /** Classification title used for chat history drawer titles */
  title?: string;
}

export interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isWaitingForResponse: boolean;
  currentError: string | null;
  loading: boolean;
  /** Set when classification API returns; drives Deep Research toggle and spinner text */
  classificationResult: QueryClassificationResult | null;
}

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

export interface ConversationMessageBlockApi {
  type?: string | null;
  content?: unknown;
  data?: unknown;
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
      suggestiveQuestions?: string[] | null;
    } | null;
    suggestive_questions?: string[] | null;
    suggestiveQuestions?: string[] | null;
    message_blocks?: ConversationMessageBlockApi[] | null;
  } | null;
  log_url?: string | null;
  agent_name?: string | null;
  execution_time?: number | null;
  execution_id?: string | null;
  feedback?: unknown;
}

export interface SessionConversationApiResponse {
  session_id?: string | null;
  total_messages?: number | null;
  messages?: ConversationMessageApi[] | null;
}

export interface IBAgentConfig {
  name: string;
  title: string;
  baseUrl: string;
  description?: string;
  publicRoute: string;
  agentId: string;
  apiKey: string;
  apiEndpoint: string;
}

