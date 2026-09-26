import { useState, useEffect, useCallback } from 'react';
import { dcService } from '../services/dcService';
import type { DataConnector } from '../types/api';

interface UseDataConnectorsReturn {
  dataConnectors: DataConnector[];
  loading: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export const useDataConnectors = (): UseDataConnectorsReturn => {
  const [dataConnectors, setDataConnectors] = useState<DataConnector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDataConnectors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connectors = await dcService.getDataConnectors();
      setDataConnectors(connectors);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data connectors';
      setError(errorMessage);
      console.error('Error fetching data connectors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch data connectors on component mount
  useEffect(() => {
    fetchDataConnectors();
  }, [fetchDataConnectors]);

  return {
    dataConnectors,
    loading: isLoading,
    isLoading,
    error,
    refetch: fetchDataConnectors,
    clearError
  };
};