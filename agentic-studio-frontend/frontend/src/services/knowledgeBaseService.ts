import { httpClient } from './httpClient';
import { KNOWLEDGE_BASE_ENDPOINTS } from './endpoints';
import type { KnowledgeCard, KnowledgeCardResponse, DeleteResponse } from '../types/api';

/**
 * Knowledge Base Service
 * Handles all knowledge base related API operations
 * 
 * Endpoints:
 * - GET /api/knowledge_cards - Get all knowledge cards
 * - POST /api/knowledge_cards - Create new knowledge card
 * - GET /api/knowledge_cards/{card_id} - Get specific knowledge card
 * - PUT /api/knowledge_cards/{card_id} - Update knowledge card
 * - DELETE /api/knowledge_cards/{card_id} - Delete knowledge card
 */
export class KnowledgeBaseService {

  /**
   * Get all knowledge cards
   * GET /api/knowledge_cards
   * 
   * @returns Promise<KnowledgeCardResponse[]> - Array of knowledge cards with sources
   * @throws Error if request fails
   */
  static async getKnowledgeCards(): Promise<KnowledgeCardResponse[]> {
    try {
      const response = await httpClient.get<KnowledgeCardResponse[]>(KNOWLEDGE_BASE_ENDPOINTS.GET_ALL_CARDS);
      return response.data;
    } catch (error) {
      console.error('[KnowledgeBaseService] Failed to fetch knowledge cards:', error);
      throw error;
    }
  }


  /**
   * Create a new knowledge card
   * POST /api/knowledge_cards
   * 
   * @param title - Knowledge card title
   * @param sources - Array of knowledge sources
   * @param files - Array of files to upload (for file type sources)
   * @returns Promise<KnowledgeCard> - Created knowledge card with ID
   * @throws Error if creation fails or validation errors
   */
  static async createKnowledgeCard(
    title: string, 
    sources: Array<{
      id: string;
      type: 'url' | 'text' | 'file';
      content: string;
      filename?: string | null;
      file?: File;
    }>,
    files: File[] = []
  ): Promise<KnowledgeCard> {
    try {
      if (!title?.trim()) {
        throw new Error('Knowledge card title is required');
      }

      if (!sources || sources.length === 0) {
        throw new Error('At least one source is required');
      }

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('title', title.trim());

      // Add files to form data
      files.forEach(file => {
        formData.append('files', file, file.name);
      });

      // Prepare sources data (excluding file objects)
      const sourcesData = sources.map(source => ({
        id: source.id,
        type: source.type,
        content: source.content,
        filename: source.filename || null,
        path: null
      }));

      formData.append('sources', JSON.stringify(sourcesData));

      const response = await httpClient.post<KnowledgeCard>(
        KNOWLEDGE_BASE_ENDPOINTS.CREATE_CARD, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('[KnowledgeBaseService] Failed to create knowledge card:', error);
      throw error;
    }
  }

  /**
   * Update an existing knowledge card
   * PUT /api/knowledge_cards/{card_id}
   * 
   * @param cardId - Unique identifier of the knowledge card
   * @param title - Updated knowledge card title
   * @param sources - Updated array of knowledge sources
   * @param files - Array of new files to upload (for file type sources)
   * @returns Promise<KnowledgeCard> - Updated knowledge card
   * @throws Error if knowledge card not found or validation fails
   */
  static async updateKnowledgeCard(
    cardId: string,
    title: string,
    sources: Array<{
      id: string;
      type: 'url' | 'text' | 'file';
      content: string;
      filename?: string | null;
      file?: File;
    }>,
    files: File[] = []
  ): Promise<KnowledgeCard> {
    try {
      if (!cardId?.trim()) {
        throw new Error('Knowledge card ID is required');
      }

      if (!title?.trim()) {
        throw new Error('Knowledge card title is required');
      }

      if (!sources || sources.length === 0) {
        throw new Error('At least one source is required');
      }

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('title', title.trim());

      // Add files to form data (only new files)
      files.forEach(file => {
        formData.append('files', file, file.name);
      });

      // Prepare sources data (excluding file objects)
      const sourcesData = sources.map(source => ({
        id: source.id,
        type: source.type,
        content: source.content,
        filename: source.filename || null,
        path: null
      }));

      formData.append('sources', JSON.stringify(sourcesData));

      const response = await httpClient.put<KnowledgeCard>(
        KNOWLEDGE_BASE_ENDPOINTS.UPDATE_CARD(cardId), 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`[KnowledgeBaseService] Failed to update knowledge card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a knowledge card permanently
   * DELETE /api/knowledge_cards/{card_id}
   * 
   * @param cardId - Unique identifier of the knowledge card
   * @returns Promise<DeleteResponse> - Deletion confirmation
   * @throws Error if knowledge card not found or deletion fails
   */
  static async deleteKnowledgeCard(cardId: string): Promise<DeleteResponse> {
    try {
      if (!cardId?.trim()) {
        throw new Error('Knowledge card ID is required');
      }

      const response = await httpClient.delete<DeleteResponse>(
        KNOWLEDGE_BASE_ENDPOINTS.DELETE_CARD(cardId)
      );
      
      return response.data;
    } catch (error) {
      console.error(`[KnowledgeBaseService] Failed to delete knowledge card ${cardId}:`, error);
      throw error;
    }
  }


}

export default KnowledgeBaseService;
