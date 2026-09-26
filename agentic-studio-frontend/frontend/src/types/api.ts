// API Types based on OpenAPI specification
// Generated from api-specification.yaml

// ==================== Authentication Types ====================
export interface TokenData {
  token: string;
}

export interface LoginResponse {
  status: string;
  token: string;
  detail: string;
  name: string;
  picture: string;
  email: string;
  role: string;
  is_admin: boolean;
}

// ==================== User Types ====================
export interface User {
  id: number;
  email: string;
  name: string;
  picture: string;
  role: string;
  is_active: boolean;
  is_admin: boolean;
  avatar: string | null;
  preferences: Record<string, unknown> | null;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export interface LoginError {
  detail: string;
  status_code?: number;
}

// ==================== Agent Types ====================
export interface AgentFeatures {
  knowledgeBase?: boolean;
  dataQuery?: boolean;
}

export interface McpServerPayload {
  name: string;
  url: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

export interface AgentCreate {
  name: string;
  description: string;
  llmProvider: string;
  llmModel: string;
  apiKey: string;
  role: string;
  goal?: string;
  expectedOutput?: string;
  backstory?: string;
  sample_user_input?: string;
  ai_framework?: string;
  mcp_servers?: McpServerPayload[];
  instructions: string;
  knowledge_base_id?: string | null;
  verbose?: boolean;
  enable_memory?: boolean;
  enable_planning?: boolean;
  enable_short_term_memory?: boolean;
  enable_long_term_memory?: boolean;
  guardrails_req?: boolean;
  raw_output?: boolean;
  tools?: string[];
  advanced_tools?: string[];
  features: AgentFeatures;
}

export interface Agent extends AgentCreate {
  id: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  client_id?: string;
}

// Complete Agent Response Type (matches actual API response structure)
export interface AgentResponse {
  id: string;
  name: string;
  description: string;
  role: string;
  goal: string;
  expectedOutput: string;
  backstory: string;
  instructions: string;
  sample_user_input: string;
  ai_framework?: string;
  mcp_servers?: McpServerPayload[];
  llmProvider: string;
  llmModel: string;
  apiKey: string;
  verbose: boolean;
  enable_memory: boolean;
  enable_short_term_memory?: boolean;
  enable_long_term_memory?: boolean;
  enable_planning: boolean;
  guardrails_req?: boolean;
  features: AgentFeatures;
  tools: string[];
  knowledge_base_id?: string | null;
  client_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// Actual Agent API Response Type (matches the real API response structure exactly)
export interface AgentApiResponse {
  id: string;
  name: string;
  description: string;
  llmProvider: string;
  llmModel: string;
  apiKey: string;
  role: string;
  goal: string;
  expected_output: string;
  backstory: string;
  instructions: string;
  verbose: boolean;
  features: AgentFeatures;
  client_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  sample_user_input: string;
  enable_short_term_memory: boolean;
  enable_long_term_memory: boolean;
  enable_memory: boolean;
  enable_planning: boolean;
  tools: string[];
}

// ==================== Knowledge Base Types ====================
export interface KnowledgeCard {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  client_id: string;
  is_active?: boolean;
}

// Knowledge Card Source (used in API response)
export interface KnowledgeCardSource {
  id: string;
  type: 'text' | 'file';
  content: string;
  filename?: string | null;
  path?: string | null;
}

// Complete Knowledge Card Response Type (matches actual API response structure)
export interface KnowledgeCardResponse {
  id: string;
  title: string;
  sources: KnowledgeCardSource[];
}

// ==================== Data Connector Types ====================
export interface DataConnector {
  id: string;
  uniqueName: string;
  connectorType: 'postgres' | 'bigquery' | 'mysql' | 'mongodb' | string;
  // PostgreSQL specific fields
  vectorStoreUser?: string;
  vectorStoreHost?: string;
  vectorStorePassword?: string;
  vectorStorePort?: string;
  vectorStoreDBName?: string;
  // BigQuery specific fields
  projectId?: string;
  datasetId?: string;
  serviceAccountKey?: {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
    universe_domain: string;
  };
}

export interface DataConnectorCreate {
  id?: string;
  uniqueName: string;
  connectorType: string;
  vectorStoreUser?: string;
  vectorStoreHost?: string;
  vectorStorePassword?: string;
  vectorStorePort?: string;
  vectorStoreDBName?: string;
  projectId?: string;
  datasetId?: string;
  serviceAccountKey?: object;
}

export interface DataConnectorUpdate extends Partial<DataConnectorCreate> {
  id: string;
}

// ==================== Tools Types ====================


// OpenAPI Schema structure for tools
export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, Record<string, unknown>>;
    securitySchemes?: Record<string, Record<string, unknown>>;
  };
}

// Complete Tool Response Type (matches actual API response structure)
export interface ToolResponse {
  id: string;
  name: string;
  description: string;
  tags: string[];
  is_added: boolean;
  data_connector_id: string | null;
  is_internal: boolean;
  is_custom?: boolean;
  schema: OpenAPISchema;
  tool_schema: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  client_id?: string;
  agent_ids?: string[];
}

// Tool Creation Types
export interface ToolCreate {
  name: string;
  description: string;
  tags: string[];
  schema: OpenAPISchema;
  is_custom?: boolean;
  data_connector_id?: string | null;
}

export interface ToolUpdate extends Partial<ToolCreate> {
  id: string;
}

// ==================== Agent Execution Types ====================
export interface InferenceRequest {
  agentId: string;
  userInput: string;
}

export interface InferenceFormRequest extends InferenceRequest {
  file?: File;
}

// Response content types
export interface TextData {
  text: string;
}

export interface ErrorData {
  message: string;
  details?: string | null;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ChartData {
  type: string;
  data: object;
}

export interface CodeData {
  language: string;
  code: string;
}

export interface ListData {
  items: string[];
}

export type ResponseContent = TextData | ErrorData | TableData | ChartData | CodeData | ListData | object;

export interface MessageResponse {
  type: 'text' | 'error' | 'table' | 'chart' | 'code' | 'list';
  content: ResponseContent;
  execution_id?: string | null;
  log_url?: string | null;
  session_id?: string | null;
  html_content?: string | null;
  user_input?: string | null;
}

// ==================== Streaming Response Types ====================
export interface StreamingResponse {
  status: 'starting' | 'processing' | 'complete' | 'error';
  message?: string;
  result?: MessageResponse;
  execution_time_seconds?: number;
}
// Enhanced streaming response types based on actual API format
export interface StreamingStatusUpdate {
  status: 'starting' | 'processing' | 'complete' | 'error';
  message?: string;
  result?: StreamingResult;
  execution_time_seconds?: number;
}

export interface StreamingResult {
  type: 'text' | 'error' | 'table' | 'chart' | 'code' | 'list';
  content: {
    text?: string;
    message?: string; // For error messages
    details?: string; // For error details
  };
  execution_id: string;
  log_url: string;
  session_id: string | null;
  html_content: string | null; // Rich HTML content for rendering
  user_input: string;
}

export interface StreamingStep {
  id: string;
  message: string;
  status: 'starting' | 'processing' | 'complete';
  timestamp: string;
  order: number;
}

export interface StreamingState {
  status: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';
  steps: StreamingStep[];
  currentMessage: string;
  finalResult: StreamingResult | null;
  error: string | null;
  startTime: number | null;
  elapsedTime: number;
}

// ==================== Generic Types ====================
export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// ==================== Common Response Types ====================
export interface DeleteResponse {
  message: string;
}

// ==================== Memory Types ====================
export interface ShortTermMemoryItem {
  user_message: string;
  assistant_response: string;
  message_order: number;
}

// Type alias for short-term memory response (array of items)
export type ShortTermMemoryResponse = ShortTermMemoryItem[];

export interface FetchShortTermMemoryParams {
  agent_id: string;
  user_email: string;
  limit?: number;
}

// ==================== Agent Inference Types ====================
export interface AgentInferRequest {
  agentId: string;
  userInput: string;
}

export interface AgentInferResponse {
  type: 'success' | 'error';
  content: {
    text?: string;      // For success responses
    message?: string;   // For error responses
    details?: string;   // Additional error details
  };
  execution_id: string;
  html_content?: string | null;
  log_url?: string;
  session_id?: string | null;
}

// ==================== Multi-Agent Types ====================
export interface MultiAgentResponse {
  id: string;
  name: string;
  description: string;
  role: string;
  goal: string;
  backstory: string;
  expected_output: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  agent_ids: string[];
}

export interface MultiAgentCreate {
  name: string;
  description: string;
  role: string;
  goal: string;
  backstory: string;
  expected_output: string;
  agent_ids: string[];
}

export interface MultiAgentUpdate extends Partial<MultiAgentCreate> {
  id: string;
}

// ==================== Reports Types ====================
export interface LogEntry {
  id: number;
  session_id: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  user_input: string;
  response: string;
  execution_time_seconds: number;
  agent_id: string;
  agent_name: string;
  endpoint: string;
  method: string;
  created_at: string;
  feedback: string | null;
  execution_id: string;
  user?: string;
}

export interface FilteredLogsResponse {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
  filters: {
    from_date: string;
    to_date: string;
    agent_name: string | null;
  };
}

export interface AgentNamesResponse {
  agent_names: string[];
}

export interface ReportsStats {
  total_executions: number;
  unique_sessions: number;
  unique_agents: number;
  avg_execution_time: number;
  total_execution_time: number;
}

export interface FilteredLogsParams {
  from_date?: string;
  to_date?: string;
  agent_name?: string;
  limit?: number;
  offset?: number;
}

export interface StatsParams {
  from_date?: string;
  to_date?: string;
  agent_name?: string;
}

// ==================== Monitoring Types ====================
export interface PerformanceCharts {
  labels: string[];
  latency: number[];
  throughput: number[];
}

export interface CostCharts {
  labels: string[];
  cost: number[];
  tokens: number[];
}

// Executive Metrics
export interface ExecutiveOverviewMetrics {
  totalInteractions: number;
  interactions: number;
  successRate: number;
  p95Latency: number;
  p99Latency: number;
  totalCost: number;
  rpm: number;
  mostUsedAgents: Array<[string, number]>;
  mostUsedTools: Array<[string, number]>;
  mostUsedModels: Array<[string, number]>;
  costByModel: Array<[string, number]>;
}

// Safety Data
export interface SafetyData {
  safetyEvents: {
    labels: string[];
    data: number[];
  };
  blockedTopics: Array<[string, number]>;
  refusals: {
    labels: string[];
    data: number[];
  };
  requests: Array<{
    id: string;
    timestamp: string;
    status: string;
    statusLabel: string;
  }>;
}

// Component Props
export interface ExecutiveOverviewProps {
  metrics: ExecutiveOverviewMetrics;
  fromDate: string;
  toDate: string;
}

export interface PerformanceSectionProps {
  charts: PerformanceCharts;
  metrics: ExecutiveOverviewMetrics;
  errorLogs: LogEntry[];
}

export interface CostSectionProps {
  charts: CostCharts;
  metrics: ExecutiveOverviewMetrics;
  fromISO: string;
  toISO: string;
}

export interface SafetySectionProps {
  safetyData: SafetyData;
  blockedLogs?: LogEntry[];
}

export interface ClientAnalyticsSectionProps {
  clientAnalytics: Array<[string, number]>;
  clientAnalyticsLoading: boolean;
  onCountryClick?: (country: string) => void;
}

export interface MonitoringParams {
  from_time: string;
  to_time: string;
}

export interface GeoLocationData {
  ip: string;
  city: string | null;
  region: string | null;
  country: string | null;
  org: string | null;
  loc: string | null;
  map_url?: string; // <--- ADDED THIS FIELD
}

export interface DashboardResponse {
  metrics: ExecutiveOverviewMetrics;
  safetyData: SafetyData;
  performanceCharts: {
    labels: string[];
    latency: number[];
    throughput: number[];
  };
  costCharts: {
    labels: string[];
    cost: number[];
    tokens: number[];
  };
  clientAnalytics: Array<[string, number]>;
  // FIX: Map IP to GeoLocationData object (not just string)
  ipGeoData: Record<string, GeoLocationData>;
  errorLogs: LogEntry[];
  blockedLogs: LogEntry[];
  fromISO: string;
  toISO: string;
}
