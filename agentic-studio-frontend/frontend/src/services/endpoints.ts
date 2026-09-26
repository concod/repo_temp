/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for all API services
 * Based on api-specification.yaml
 */

// ==================== Authentication Endpoints ====================
export const AUTH_ENDPOINTS = {
  GOOGLE_LOGIN: '/glogin',
  GENERATE_CAPTCHA_TOKEN: '/api/generate_captcha_token',
} as const;

// ==================== Agent Endpoints ====================
export const AGENT_ENDPOINTS = {
  // CRUD Operations
  GET_ALL_AGENTS: '/api/agents',
  CREATE_AGENT: '/api/agents',
  GET_AGENT: (agentId: string) => `/api/agents/${agentId}`,
  UPDATE_AGENT: (agentId: string) => `/api/agents/${agentId}`,
  DELETE_AGENT: (agentId: string) => `/api/agents/${agentId}`,
  
  // Memory Operations
  FETCH_SHORT_TERM_MEMORY: '/api/fetch_short_term_memory',
  
  // Inference Operations
  AGENT_INFER: '/api/agent/infer',
  
  // Static versions for templates
  AGENT_BY_ID: '/api/agents/:agentId',
} as const;

// ==================== Agent Execution Endpoints ====================
export const AGENT_EXECUTION_ENDPOINTS = {
  // Inference with JWT auth
  INFER: '/api/agent/infer',
  INFER_STREAM: '/api/agent/infer/stream',
  
  // Execution with API Key auth
  EXECUTE: '/api/agent/execute',
  EXECUTE_STREAM: '/api/agent/execute/stream',
  
  // Chatbot
  IA_CHATBOT: '/api/ia_chatbot',
} as const;

// ==================== Multi-Agent Endpoints ====================
export const MULTI_AGENT_ENDPOINTS = {
  // CRUD Operations
  GET_ALL_MULTI_AGENTS: '/api/multi-agents',
  CREATE_MULTI_AGENT: '/api/multi-agents',
  GET_MULTI_AGENT: (multiAgentId: string) => `/api/multi-agents/${multiAgentId}`,
  UPDATE_MULTI_AGENT: (multiAgentId: string) => `/api/multi-agents/${multiAgentId}`,
  DELETE_MULTI_AGENT: (multiAgentId: string) => `/api/multi-agents/${multiAgentId}`,
  
  // Execution
  INFER: '/api/multi_agent/infer',
  EXECUTE: '/api/multi-agent/execute',
  
  // Static versions
  MULTI_AGENT_BY_ID: '/api/multi-agents/:multiAgentId',
} as const;

// ==================== Tools Endpoints ====================
export const TOOL_ENDPOINTS = {
  // CRUD Operations
  GET_ALL_TOOLS: '/api/tools',
  CREATE_CUSTOM_TOOL: '/api/tools/custom',
  GET_TOOL: (toolId: string) => `/api/tools/${toolId}`,
  UPDATE_TOOL: (toolId: string) => `/api/tools/${toolId}`,
  DELETE_TOOL: (toolId: string) => `/api/tools/${toolId}`,
  
  // Tool Schema & Auth
  GET_TOOL_SCHEMA: (toolId: string) => `/api/tools/${toolId}/schema`,
  UPDATE_TOOL_AUTH: (toolId: string) => `/api/tools/${toolId}/auth`,
  
  // Static versions
  TOOL_BY_ID: '/api/tools/:toolId',
  TOOL_SCHEMA_BY_ID: '/api/tools/:toolId/schema',
  TOOL_AUTH_BY_ID: '/api/tools/:toolId/auth',
} as const;

// ==================== Data Connectors Endpoints ====================
export const DATA_CONNECTOR_ENDPOINTS = {
  // CRUD Operations
  GET_ALL_CONNECTORS: '/api/data-connectors',
  CREATE_CONNECTOR: '/api/data-connectors',
  UPDATE_CONNECTOR: (connectorId: string) => `/api/data-connectors/${connectorId}`,
  DELETE_CONNECTOR: (connectorId: string) => `/api/data-connectors/${connectorId}`,
  
  // Testing
  TEST_CONNECTION: '/api/data-connectors/test',
  
  // Static versions
  CONNECTOR_BY_ID: '/api/data-connectors/:connectorId',
} as const;

// ==================== Session Management Endpoints ====================
export const SESSION_ENDPOINTS = {
  SUBMIT_FEEDBACK: '/api/session/execution-feedback',
  RESET_SESSION: '/reset-session',
} as const;

// ==================== Session Logs Endpoints ====================
export const SESSION_LOG_ENDPOINTS = {
  GET_AVAILABLE_DATES: '/api/sessions-logs/dates',
  GET_SESSIONS: '/api/sessions-logs',
  GET_SESSION_CONVERSATION: (sessionId: string) => `/api/sessions-logs/${sessionId}/conversation`,
  
  // Static versions
  SESSION_CONVERSATION_BY_ID: '/api/sessions-logs/:sessionId/conversation',
} as const;

// ==================== Knowledge Base Endpoints ====================
export const KNOWLEDGE_BASE_ENDPOINTS = {
  GET_ALL_CARDS: '/api/knowledge_cards',
  CREATE_CARD: '/api/knowledge_cards',
  UPDATE_CARD: (cardId: string) => `/api/knowledge_cards/${cardId}`,
  DELETE_CARD: (cardId: string) => `/api/knowledge_cards/${cardId}`,
  
  // Static versions
  CARD_BY_ID: '/api/knowledge_cards/:cardId',
} as const;

// ==================== System Endpoints ====================
export const SYSTEM_ENDPOINTS = {
  GET_MEMORY_STATS: '/api/system/memory',
  FORCE_GARBAGE_COLLECTION: '/api/system/gc',
  DATABASE_HEALTH: '/api/db/health',
} as const;

// ==================== Users Endpoints ====================
export const USERS_ENDPOINTS = {
  GET_ALL_USERS: '/api/users',
  ADD_USER: '/api/users',
} as const;

// ==================== AI Generation Endpoints ====================
export const AI_GENERATION_ENDPOINTS = {
  GENERATE_AGENT: '/api/generate-agent',
} as const;

// ==================== Log Endpoints ====================
export const LOG_ENDPOINTS = {
  GET_EXECUTION_LOG: (executionId: string) => `/api/logs/${executionId}`,
  GET_MULTI_AGENT_LOG: (executionId: string) => `/api/multi_agent/logs/${executionId}`,
  
  // Static versions
  EXECUTION_LOG_BY_ID: '/api/logs/:executionId',
  MULTI_AGENT_LOG_BY_ID: '/api/multi_agent/logs/:executionId',
} as const;

// ==================== Reports Endpoints ====================
export const REPORTS_ENDPOINTS = {
  GET_FILTERED_LOGS: '/api/reports/agent-logs',
  GET_AGENT_NAMES: '/api/reports/agent-names',
  GET_STATS: '/api/reports/stats',
} as const;

// ==================== Monitoring Endpoints ====================
export const MONITORING_ENDPOINTS = {
  GET_SERVER_LOGS: '/api/server-logs',
  GET_LOGS: '/api/logs',
} as const;

// ==================== MCP Endpoints ====================
export const MCP_ENDPOINTS = {
  TEST_CONNECTION: '/api/mcp/test-connection',
} as const;

// ==================== Combined Endpoints Export ====================
/**
 * All API endpoints grouped by domain
 */
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  AGENTS: AGENT_ENDPOINTS,
  AGENT_EXECUTION: AGENT_EXECUTION_ENDPOINTS,
  MULTI_AGENTS: MULTI_AGENT_ENDPOINTS,
  TOOLS: TOOL_ENDPOINTS,
  DATA_CONNECTORS: DATA_CONNECTOR_ENDPOINTS,
  SESSIONS: SESSION_ENDPOINTS,
  SESSION_LOGS: SESSION_LOG_ENDPOINTS,
  KNOWLEDGE_BASE: KNOWLEDGE_BASE_ENDPOINTS,
  SYSTEM: SYSTEM_ENDPOINTS,
  USERS: USERS_ENDPOINTS,
  AI_GENERATION: AI_GENERATION_ENDPOINTS,
  LOGS: LOG_ENDPOINTS,
  REPORTS: REPORTS_ENDPOINTS,
  MONITORING: MONITORING_ENDPOINTS,
  MCP: MCP_ENDPOINTS,
} as const;

