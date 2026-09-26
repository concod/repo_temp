/**
 * Services Index
 * Central export point for all API services
 */

// Core HTTP Client
export { httpClient, HttpClient } from './httpClient';

// API Endpoints
export { 
  API_ENDPOINTS, 
  AUTH_ENDPOINTS,
  AGENT_ENDPOINTS,
  AGENT_EXECUTION_ENDPOINTS, 
  TOOL_ENDPOINTS,
  SESSION_ENDPOINTS,
  SESSION_LOG_ENDPOINTS,
  KNOWLEDGE_BASE_ENDPOINTS,
  SYSTEM_ENDPOINTS,
  AI_GENERATION_ENDPOINTS,
  LOG_ENDPOINTS,
  REPORTS_ENDPOINTS,
  MONITORING_ENDPOINTS,
} from './endpoints';

// Authentication Services
export { AuthService } from './authService';

// Agent Services
export { AgentService } from './agentService';
export { AgentExecutionService } from './agentExecutionService';

// Knowledge Base Services
export { KnowledgeBaseService } from './knowledgeBaseService';

// Tools Services
export { ToolsService } from './toolsService';

// Data Connector Services
export { dcService } from './dcService';

// Multi-Agent Services
export { MultiAgentsService } from './multiAgentsService';

// Chatbot Services
export { ChatbotService } from './chatbotService';

// Reports Services
export { ReportsService } from './reportsService';

// Monitoring Services
export { monitoringService } from './monitoringService';

// Geolocation Services
export { geolocationService } from './geolocationService';

// MCP Services
export { McpService } from './mcpService';
export type { McpTestConnectionResult } from './mcpService';

// Re-export default exports for compatibility
export { default as AuthServiceDefault } from './authService';
export { default as AgentServiceDefault } from './agentService';
export { default as AgentExecutionServiceDefault } from './agentExecutionService';
export { default as KnowledgeBaseServiceDefault } from './knowledgeBaseService';
export { default as ToolsServiceDefault } from './toolsService';
export { default as DCServiceDefault } from './dcService';
export { default as ChatbotServiceDefault } from './chatbotService';
export { default as ReportsServiceDefault } from './reportsService';
export { default as MonitoringServiceDefault } from './monitoringService';
export { default as GeolocationServiceDefault } from './geolocationService';

// Type exports for convenience
export type {
  Agent,
  AgentCreate,
  AgentResponse,
  AgentFeatures,
  KnowledgeCard,
  KnowledgeCardSource,
  KnowledgeCardResponse,
  ToolResponse,
  ToolCreate,
  ToolUpdate,
  OpenAPISchema,
  InferenceRequest,
  MessageResponse,
  StreamingResponse,
  LoginResponse,
  ApiError,
  DataConnector,
  DataConnectorCreate,
  DataConnectorUpdate,
  MultiAgentResponse,
  MultiAgentCreate,
  MultiAgentUpdate,
  LogEntry,
  FilteredLogsResponse,
  AgentNamesResponse,
  ReportsStats,
  FilteredLogsParams,
  StatsParams,
} from '../types/api';

// Note: MonitoringLogEntry, LogsResponse, MonitoringParams are already exported from '../types/api'
// GeoLocationData is already exported from '../types/api'
