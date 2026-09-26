import { httpClient } from './httpClient';
import { AGENT_ENDPOINTS } from './endpoints';
import type { 
  Agent, 
  AgentCreate, 
  AgentResponse,
  AgentApiResponse,
  DeleteResponse,
  ShortTermMemoryResponse,
  FetchShortTermMemoryParams,
  AgentInferRequest,
  AgentInferResponse
} from '../types/api';

/**
 * Agent Service
 * Handles all agent-related API operations
 * 
 * Endpoints:
 * - GET /api/agents - Get all agents
 * - POST /api/agents - Create new agent
 * - GET /api/agents/{agent_id} - Get specific agent
 * - PUT /api/agents/{agent_id} - Update agent
 * - DELETE /api/agents/{agent_id} - Delete agent
 */
export class AgentService {

  /**
   * Get all agents
   * GET /api/agents
   * 
   * @returns Promise<AgentResponse[]> - Array of agents with complete response structure
   * @throws Error if request fails
   */
  static async getAgents(): Promise<AgentResponse[]> {
    try {
      const response = await httpClient.get<AgentResponse[]>(AGENT_ENDPOINTS.GET_ALL_AGENTS);
      return response.data;
    } catch (error) {
      console.error('[AgentService] Failed to fetch agents:', error);
      throw error;
    }
  }

  /**
   * Create a new agent
   * POST /api/agents
   * 
   * @param agentData - Agent configuration data
   * @returns Promise<Agent> - Created agent with ID
   * @throws Error if creation fails or validation errors
   */
  static async createAgent(agentData: AgentCreate): Promise<Agent> {
    try {
      // Validate required fields
      this.validateAgentData(agentData);

      const response = await httpClient.post<Agent>(AGENT_ENDPOINTS.CREATE_AGENT, agentData);
      return response.data;
    } catch (error) {
      console.error('[AgentService] Failed to create agent:', error);
      throw error;
    }
  }

  /**
   * Get a specific agent by ID
   * GET /api/agents/{agent_id}
   * 
   * @param agentId - Unique identifier of the agent
   * @param reset - Optional flag to reset session history
   * @returns Promise<AgentApiResponse> - Agent details with snake_case properties
   * @throws Error if agent not found or request fails
   */
  static async getAgent(agentId: string, reset?: boolean): Promise<AgentApiResponse> {
    try {
      if (!agentId?.trim()) {
        throw new Error('Agent ID is required');
      }

      const params = reset ? { reset } : {};
      const response = await httpClient.get<AgentApiResponse>(AGENT_ENDPOINTS.GET_AGENT(agentId), { params });
      return response.data;
    } catch (error) {
      console.error(`[AgentService] Failed to fetch agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing agent
   * PUT /api/agents/{agent_id}
   * 
   * @param agentId - Unique identifier of the agent
   * @param agentData - Updated agent configuration
   * @returns Promise<Agent> - Updated agent
   * @throws Error if agent not found or validation fails
   */
  static async updateAgent(agentId: string, agentData: AgentCreate): Promise<Agent> {
    try {
      if (!agentId?.trim()) {
        throw new Error('Agent ID is required');
      }

      // Validate required fields
      this.validateAgentData(agentData);

      const response = await httpClient.put<Agent>(AGENT_ENDPOINTS.UPDATE_AGENT(agentId), agentData);
      
      return response.data;
    } catch (error) {
      console.error(`[AgentService] Failed to update agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an agent permanently
   * DELETE /api/agents/{agent_id}
   * 
   * @param agentId - Unique identifier of the agent
   * @returns Promise<DeleteResponse> - Deletion confirmation
   * @throws Error if agent not found or deletion fails
   */
  static async deleteAgent(agentId: string): Promise<DeleteResponse> {
    try {
      if (!agentId?.trim()) {
        throw new Error('Agent ID is required');
      }

      const response = await httpClient.delete<DeleteResponse>(AGENT_ENDPOINTS.DELETE_AGENT(agentId));
      
      return response.data;
    } catch (error) {
      console.error(`[AgentService] Failed to delete agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Check if agent exists by ID
   * Helper method to check if an agent exists without throwing errors
   * 
   * @param agentId - Unique identifier of the agent
   * @returns Promise<boolean> - True if agent exists, false otherwise
   */
  static async agentExists(agentId: string): Promise<boolean> {
    try {
      await this.getAgent(agentId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get agents by feature filter
   * Helper method to filter agents by specific features
   * 
   * @param feature - Feature to filter by ('knowledgeBase' or 'dataQuery')
   * @returns Promise<Agent[]> - Filtered agents
   */
  static async getAgentsByFeature(feature: 'knowledgeBase' | 'dataQuery'): Promise<AgentResponse[]> {
    try {
      const agents = await this.getAgents();
      return agents.filter(agent => agent.features?.[feature] === true);
    } catch (error) {
      console.error(`[AgentService] Failed to fetch agents by feature ${feature}:`, error);
      throw error;
    }
  }

  /**
   * Fetch short-term memory for an agent
   * GET /api/fetch_short_term_memory
   * 
   * @param params - Parameters for fetching short-term memory
   * @returns Promise<ShortTermMemoryResponse> - Short-term memory data
   * @throws Error if request fails
   */
  static async fetchShortTermMemory(params: FetchShortTermMemoryParams): Promise<ShortTermMemoryResponse> {
    try {
      if (!params.agent_id?.trim()) {
        throw new Error('Agent ID is required');
      }
      
      if (!params.user_email?.trim()) {
        throw new Error('User email is required');
      }

      const queryParams = {
        agent_id: params.agent_id,
        user_email: params.user_email,
        ...(params.limit && { limit: params.limit })
      };

      const response = await httpClient.get<ShortTermMemoryResponse>(
        AGENT_ENDPOINTS.FETCH_SHORT_TERM_MEMORY,
        { params: queryParams }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AgentService] Failed to fetch short-term memory for agent ${params.agent_id}:`, error);
      throw error;
    }
  }

  /**
   * Send message to agent and get inference response
   * POST /api/agent/infer
   * 
   * @param request - Agent inference request with agentId and userInput
   * @returns Promise<AgentInferResponse> - Agent's response
   * @throws Error if request fails
   */
  static async sendMessage(request: AgentInferRequest): Promise<AgentInferResponse> {
    try {
      if (!request.agentId?.trim()) {
        throw new Error('Agent ID is required');
      }
      
      if (!request.userInput?.trim()) {
        throw new Error('User input is required');
      }

      const response = await httpClient.post<AgentInferResponse>(
        AGENT_ENDPOINTS.AGENT_INFER,
        request
      );
      
      return response.data;
    } catch (error) {
      console.error(`[AgentService] Failed to send message to agent ${request.agentId}:`, error);
      throw error;
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Validate agent data before sending to API
   * @private
   */
  private static validateAgentData(agentData: AgentCreate): void {
    const requiredFields: (keyof AgentCreate)[] = [
      'name',
      'description', 
      'llmProvider',
      'llmModel',
      'apiKey',
      'role',
      'instructions',
      'features'
    ];

    for (const field of requiredFields) {
      if (!agentData[field]) {
        throw new Error(`${field} is required`);
      }
    }

    // Validate name length
    if (agentData.name.length < 2) {
      throw new Error('Agent name must be at least 2 characters long');
    }

    // Validate description
    if (agentData.description.length < 10) {
      throw new Error('Agent description must be at least 10 characters long');
    }

    // Validate instructions
    if (agentData.instructions.length < 10) {
      throw new Error('Agent instructions must be at least 10 characters long');
    }

    // Validate LLM provider
    const validProviders = ['openai', 'anthropic', 'google', 'azure'];
    if (!validProviders.includes(agentData.llmProvider.toLowerCase())) {
      console.warn(`[AgentService] Unusual LLM provider: ${agentData.llmProvider}`);
    }

    // Validate features object
    if (typeof agentData.features !== 'object' || agentData.features === null) {
      throw new Error('Features must be a valid object');
    }
  }

  /**
   * Format agent data for display
   * Helper method to format agent data for UI display
   * 
   * @param agent - Agent to format
   * @returns Formatted agent display data
   */
  static formatAgentForDisplay(agent: Agent): {
    id: string;
    name: string;
    description: string;
    role: string;
    provider: string;
    model: string;
    toolsCount: number;
    features: string[];
    lastUpdated?: string;
  } {
    const features: string[] = [];
    if (agent.features?.knowledgeBase) features.push('Knowledge Base');
    if (agent.features?.dataQuery) features.push('Data Query');

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      role: agent.role,
      provider: agent.llmProvider,
      model: agent.llmModel,
      toolsCount: agent.tools?.length || 0,
      features,
      lastUpdated: agent.updated_at,
    };
  }
}

export default AgentService;
