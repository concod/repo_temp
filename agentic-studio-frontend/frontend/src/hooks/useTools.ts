import { useState, useEffect, useCallback, useRef } from 'react';
import { ToolsService } from '../services';
import type { ToolResponse } from '../types/api';

interface UseToolsReturn {
  tools: ToolResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing tools data
 * Provides tools list with loading states and error handling
 */
export const useTools = (): UseToolsReturn => {
  const [tools, setTools] = useState<ToolResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to prevent double API calls in StrictMode
  const hasFetchedRef = useRef(false);

  const fetchTools = useCallback(async () => {
    // Prevent duplicate calls in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    
    hasFetchedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('[useTools] Fetching tools...');
      const toolsData = await ToolsService.getTools();
      console.log('[useTools] Tools fetched successfully:', toolsData);
      
      setTools(toolsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tools';
      console.error('[useTools] Error fetching tools:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    hasFetchedRef.current = false;
    await fetchTools();
  }, [fetchTools]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  return {
    tools,
    loading,
    error,
    refetch,
  };
};

export default useTools;
