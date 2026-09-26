import { useState, useEffect } from 'react';

import { AgentService } from '../services';
import { useTools } from './useTools';
import { useKnowledgeCards } from './useKnowledgeCards';
import type { AgentResponse } from '../types/api';

interface UseManageAgentReturn {
  agentData: AgentResponse | null;
  toolsData: ReturnType<typeof useTools>['tools'];
  knowledgeCards: ReturnType<typeof useKnowledgeCards>['knowledgeCards'];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing agent data on the ManageAgent page
 * Fetches agent details, tools, and knowledge cards in parallel
 * 
 * @param agentId - The ID of the agent to manage
 * @returns Object containing agent data, tools, knowledge cards, loading state, and error
 */
export const useManageAgent = (agentId: string | undefined): UseManageAgentReturn => {
  const [agentData, setAgentData] = useState<AgentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use existing hooks for tools and knowledge cards
  const { tools, loading: toolsLoading, error: toolsError } = useTools();
  const { knowledgeCards, loading: knowledgeCardsLoading, error: knowledgeCardsError } = useKnowledgeCards();

  /**
   * Fetch agent data with reset flag
   */
  const fetchAgentData = async (id: string) => {
    try {
      setError(null);
      const agent = await AgentService.getAgent(id, true); // reset = true
      setAgentData(agent as unknown as AgentResponse); // Cast since API returns snake_case
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agent data';
      setError(errorMessage);
      console.error('[useManageAgent] Failed to fetch agent:', err);
      throw err; // Re-throw to handle in the main effect
    }
  };


  /**
   * Manual refetch function
   */
  const refetch = async () => {
    if (!agentId) return;
    
    setIsLoading(true);
    try {
      await fetchAgentData(agentId);
    } catch (err) {
      // Error already handled in fetchAgentData
    } finally {
      setIsLoading(false);
    }
  };

  // Main effect to fetch data when agentId changes
  useEffect(() => {
    const fetchData = async () => {
      if (!agentId) {
        setError('Agent ID is required');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch agent data
        // (tools and knowledge cards are fetched by their respective hooks)
        await fetchAgentData(agentId);
      } catch (err) {
        // Error already handled in fetchAgentData
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agentId]);

  // Combine loading states - we're loading if any of the hooks are loading
  const combinedLoading = isLoading || toolsLoading || knowledgeCardsLoading;

  // Combine error states - prioritize agent error, then others
  const combinedError = error || toolsError || knowledgeCardsError;

  return {
    agentData,
    toolsData: tools,
    knowledgeCards,
    isLoading: combinedLoading,
    error: combinedError,
    refetch
  };
};

export default useManageAgent;
