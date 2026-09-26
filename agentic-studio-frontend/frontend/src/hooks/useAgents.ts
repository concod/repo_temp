import { useState, useEffect, useCallback, useMemo } from 'react';
import { AgentService } from '../services/agentService';
import type { AgentResponse } from '../types/api';

export interface UseAgentsReturn {
  agents: AgentResponse[];
  filteredAgents: AgentResponse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  searchAgents: (query: string) => void;
  filterByCategory: (categoryId: string | null) => void;
  searchQuery: string;
  selectedCategory: string | null;
  agentCount: number;
  clearError: () => void;
}

/**
 * Custom hook for managing agents data and operations
 * Provides loading states, error handling, search, and filtering capabilities
 */
export const useAgents = (): UseAgentsReturn => {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  /**
   * Fetch agents from the API
   */
  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const agentsData = await AgentService.getAgents();
      setAgents(agentsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(errorMessage);
      console.error('[useAgents] Error fetching agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchAgents();
  }, [fetchAgents]);

  /**
   * Search agents by name, description, or role
   */
  const searchAgents = useCallback((query: string) => {
    setSearchQuery(query.trim());
  }, []);

  /**
   * Filter agents by category
   * Note: This is a placeholder - you'll need to add category mapping logic
   * based on your agent data structure
   */
  const filterByCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Compute filtered agents based on search query and category
   */
  const filteredAgents = useMemo(() => {
    let filtered = agents;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.role.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      // TODO: Implement category mapping logic based on your agent categorization
      // This is a placeholder - you might want to add a category field to Agent type
      // or create a mapping function based on agent properties
      console.log('Category filtering not yet implemented for:', selectedCategory);
    }

    return filtered;
  }, [agents, searchQuery, selectedCategory]);

  /**
   * Get current filtered agent count
   */
  const agentCount = useMemo(() => {
    return filteredAgents.length;
  }, [filteredAgents]);

  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    filteredAgents,
    isLoading,
    error,
    refetch,
    searchAgents,
    filterByCategory,
    searchQuery,
    selectedCategory,
    agentCount,
    clearError,
  };
};

export default useAgents;
