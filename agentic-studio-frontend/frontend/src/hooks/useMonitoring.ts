import { useState, useCallback } from 'react';
import { monitoringService } from '../services/monitoringService';
import type { DashboardResponse } from '../types/api';

interface UseMonitoringReturn {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  fetchMonitoringData: (fromDate: string, toDate: string) => Promise<void>;
}

export const useMonitoring = (): UseMonitoringReturn => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonitoringData = useCallback(async (fromDate: string, toDate: string) => {
    setLoading(true);
    setError(null);

    try {
      const fromISO = new Date(fromDate).toISOString();
      const toISO = new Date(toDate).toISOString();

      const response = await monitoringService.fetchDashboardData({
        from_time: fromISO,
        to_time: toISO,
      });

      setData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch monitoring data';
      setError(errorMessage);
      console.error('[useMonitoring] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchMonitoringData,
  };
};