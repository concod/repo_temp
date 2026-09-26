import { useState, useEffect, useCallback, useRef } from 'react';
import { KnowledgeBaseService } from '../services';
import type { KnowledgeCardResponse } from '../types/api';

interface UseKnowledgeCardsReturn {
  knowledgeCards: KnowledgeCardResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for managing knowledge cards data
 * Provides knowledge cards list with loading states and error handling
 */
export const useKnowledgeCards = (): UseKnowledgeCardsReturn => {
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCardResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to prevent double API calls in StrictMode
  const hasFetchedRef = useRef(false);

  const fetchKnowledgeCards = useCallback(async () => {
    // Prevent duplicate calls in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    
    hasFetchedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('[useKnowledgeCards] Fetching knowledge cards...');
      const cards = await KnowledgeBaseService.getKnowledgeCards();
      console.log('[useKnowledgeCards] Knowledge cards fetched successfully:', cards);
      
      setKnowledgeCards(cards);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch knowledge cards';
      console.error('[useKnowledgeCards] Error fetching knowledge cards:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    hasFetchedRef.current = false;
    await fetchKnowledgeCards();
  }, [fetchKnowledgeCards]);

  useEffect(() => {
    fetchKnowledgeCards();
  }, [fetchKnowledgeCards]);

  return {
    knowledgeCards,
    loading,
    error,
    refetch,
  };
};

export default useKnowledgeCards;
