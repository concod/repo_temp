import { httpClient } from './httpClient';
import { TOOL_ENDPOINTS } from './endpoints';
import type { ToolResponse, ToolCreate } from '../types/api';

/**
 * Tools Service
 * Handles all tools related API operations
 * 
 * Available endpoints:
 * - GET /api/tools - Get all tools
 * - POST /api/tools/custom - Create custom tool
 * - GET /api/tools/{tool_id} - Get tool by ID
 * - PUT /api/tools/{tool_id} - Update tool
 * - DELETE /api/tools/{tool_id} - Delete tool
 * - GET /api/tools/{tool_id}/schema - Get tool schema
 * - PUT /api/tools/{tool_id}/auth - Update tool auth
 */
export class ToolsService {

  /**
   * Get all tools
   * GET /api/tools
   * 
   * @returns Promise<ToolResponse[]> - Array of available tools with full schema
   * @throws Error if request fails
   */
  static async getTools(): Promise<ToolResponse[]> {
    try {
      const response = await httpClient.get<ToolResponse[]>(TOOL_ENDPOINTS.GET_ALL_TOOLS);
      return response.data;
    } catch (error) {
      console.error('[ToolsService] Failed to fetch tools:', error);
      throw error;
    }
  }

  /**
   * Create a custom tool
   * POST /api/tools/custom
   * 
   * @param toolData - Tool creation data
   * @returns Promise<ToolResponse> - Created tool with full details
   * @throws Error if request fails
   */
  static async createCustomTool(toolData: ToolCreate): Promise<ToolResponse> {
    try {
      const payload = {
        name: toolData.name,
        description: toolData.description,
        tags: toolData.tags,
        schema: toolData.schema,
        is_custom: toolData.is_custom ?? true,
        data_connector_id: toolData.data_connector_id || null
      };

      const response = await httpClient.post<ToolResponse>(
        TOOL_ENDPOINTS.CREATE_CUSTOM_TOOL, 
        payload
      );
      return response.data;
    } catch (error) {
      console.error('[ToolsService] Failed to create custom tool:', error);
      throw error;
    }
  }

  /**
   * Get a specific tool by ID
   * GET /api/tools/{tool_id}
   * 
   * @param toolId - Tool ID
   * @returns Promise<ToolResponse> - Tool details
   * @throws Error if request fails
   */
  static async getTool(toolId: string): Promise<ToolResponse> {
    try {
      const response = await httpClient.get<ToolResponse>(`${TOOL_ENDPOINTS.GET_ALL_TOOLS}/${toolId}`);
      return response.data;
    } catch (error) {
      console.error(`[ToolsService] Failed to fetch tool ${toolId}:`, error);
      throw error;
    }
  }

  /**
   * Update a tool
   * PUT /api/tools/{tool_id}
   * 
   * @param toolId - Tool ID
   * @param toolData - Updated tool data
   * @returns Promise<ToolResponse> - Updated tool
   * @throws Error if request fails
   */
  static async updateTool(toolId: string, toolData: Partial<ToolCreate>): Promise<ToolResponse> {
    try {
      const response = await httpClient.put<ToolResponse>(
        `${TOOL_ENDPOINTS.GET_ALL_TOOLS}/${toolId}`, 
        toolData
      );
      return response.data;
    } catch (error) {
      console.error(`[ToolsService] Failed to update tool ${toolId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a tool
   * DELETE /api/tools/{tool_id}
   * 
   * @param toolId - Tool ID
   * @returns Promise<void>
   * @throws Error if request fails
   */
  static async deleteTool(toolId: string): Promise<void> {
    try {
      await httpClient.delete(`${TOOL_ENDPOINTS.GET_ALL_TOOLS}/${toolId}`);
    } catch (error) {
      console.error(`[ToolsService] Failed to delete tool ${toolId}:`, error);
      throw error;
    }
  }

  /**
   * Get tool schema
   * GET /api/tools/{tool_id}/schema
   * 
   * @param toolId - Tool ID
   * @returns Promise<OpenAPISchema> - Tool schema
   * @throws Error if request fails
   */
  static async getToolSchema(toolId: string): Promise<any> {
    try {
      const response = await httpClient.get<any>(`${TOOL_ENDPOINTS.GET_ALL_TOOLS}/${toolId}/schema`);
      return response.data;
    } catch (error) {
      console.error(`[ToolsService] Failed to fetch tool schema ${toolId}:`, error);
      throw error;
    }
  }

}

export default ToolsService;
