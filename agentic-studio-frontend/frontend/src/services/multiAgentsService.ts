import { httpClient } from './httpClient';
import { MULTI_AGENT_ENDPOINTS } from './endpoints';
import type { MultiAgentResponse, MultiAgentCreate, AgentInferRequest, AgentInferResponse } from '../types/api';

export class MultiAgentsService {
  private static readonly BASE_PATH = '/api/multi-agents';

  /**
   * Get all multi-agents
   */
  static async getMultiAgents(): Promise<MultiAgentResponse[]> {
    try {
      const response = await httpClient.get<MultiAgentResponse[]>(this.BASE_PATH);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch multi-agents:', error);
      throw error;
    }
  }

  /**
   * Get a specific multi-agent by ID
   */
  static async getMultiAgent(id: string): Promise<MultiAgentResponse> {
    try {
      const response = await httpClient.get<MultiAgentResponse>(`${this.BASE_PATH}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch multi-agent ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new multi-agent
   */
  static async createMultiAgent(data: MultiAgentCreate): Promise<MultiAgentResponse> {
    try {
      const response = await httpClient.post<MultiAgentResponse>(this.BASE_PATH, data);
      return response.data;
    } catch (error) {
      console.error('Failed to create multi-agent:', error);
      throw error;
    }
  }

  /**
   * Update an existing multi-agent
   */
  static async updateMultiAgent(id: string, data: Partial<MultiAgentCreate>): Promise<MultiAgentResponse> {
    try {
      const response = await httpClient.put<MultiAgentResponse>(`${this.BASE_PATH}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update multi-agent ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a multi-agent
   */
  static async deleteMultiAgent(id: string): Promise<void> {
    try {
      await httpClient.delete(`${this.BASE_PATH}/${id}`);
    } catch (error) {
      console.error(`Failed to delete multi-agent ${id}:`, error);
      throw error;
    }
  }

  /**
   * Send message to multi-agent and get inference response
   */
  static async sendMessage(request: AgentInferRequest): Promise<AgentInferResponse> {
    try {
      if (!request.agentId?.trim()) {
        throw new Error('Multi-Agent ID is required');
      }
      
      if (!request.userInput?.trim()) {
        throw new Error('User input is required');
      }

      const response = await httpClient.post<AgentInferResponse>(
        MULTI_AGENT_ENDPOINTS.INFER,
        request
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to send message to multi-agent ${request.agentId}:`, error);
      throw error;
    }
  }

  /**
   * Execute multi-agent with API key authentication
   */
  static async execute(request: AgentInferRequest): Promise<AgentInferResponse> {
    try {
      if (!request.agentId?.trim()) {
        throw new Error('Multi-Agent ID is required');
      }
      
      if (!request.userInput?.trim()) {
        throw new Error('User input is required');
      }

      const response = await httpClient.post<AgentInferResponse>(
        MULTI_AGENT_ENDPOINTS.EXECUTE,
        request
      );
      
      return response.data;
    } catch (error) {
      console.error(`Failed to execute multi-agent ${request.agentId}:`, error);
      throw error;
    }
  }
}
