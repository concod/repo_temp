import { useState, useEffect, useCallback } from 'react';
import type { 
  LogEntry, 
  FilteredLogsResponse, 
  AgentNamesResponse, 
  ReportsStats,
  FilteredLogsParams,
  StatsParams
} from '../types/api';
import { ReportsService } from '../services';

interface UseReportsReturn {
  // Data
  logs: LogEntry[];
  stats: ReportsStats | null;
  agentNames: string[];
  
  // Pagination
  total: number;
  currentPage: number;
  limit: number;
  
  // Filters
  fromDate: string;
  toDate: string;
  selectedAgent: string;
  
  // Loading states
  isLoadingLogs: boolean;
  isLoadingStats: boolean;
  isLoadingAgents: boolean;
  
  // Error states
  logsError: string | null;
  statsError: string | null;
  agentsError: string | null;
  
  // Actions
  setDateRange: (fromDate: string, toDate: string) => void;
  setSelectedAgent: (agent: string) => void;
  applyFilters: () => Promise<void>;
  clearFilters: () => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  setLimit: (limit: number) => void;
  refetch: () => Promise<void>;
}

export const useReports = (): UseReportsReturn => {
  // Data states
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<ReportsStats | null>(null);
  const [agentNames, setAgentNames] = useState<string[]>([]);
  
  // Pagination states
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(20);
  
  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  
  // Loading states
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  
  // Error states
  const [logsError, setLogsError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  // Initialize default date range (last 30 days)
  useEffect(() => {
    const defaultRange = ReportsService.getDefaultDateRange();
    setFromDate(defaultRange.from_date);
    setToDate(defaultRange.to_date);
  }, []);

  // Fetch agent names on component mount
  const fetchAgentNames = useCallback(async () => {
    try {
      setIsLoadingAgents(true);
      setAgentsError(null);
      
      const response: AgentNamesResponse = await ReportsService.getAgentNames();
      setAgentNames(response.agent_names || []);
    } catch (err) {
      console.error('Failed to fetch agent names:', err);
      setAgentsError(err instanceof Error ? err.message : 'Failed to fetch agent names');
      setAgentNames([]);
    } finally {
      setIsLoadingAgents(false);
    }
  }, []);

  // Fetch logs with current filters and pagination
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoadingLogs(true);
      setLogsError(null);
      
      const params: FilteredLogsParams = {
        limit,
        offset: (currentPage - 1) * limit,
      };

      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (selectedAgent) params.agent_name = selectedAgent;
      
      const response: FilteredLogsResponse = await ReportsService.getFilteredLogs(params);
      
      setLogs(response.logs || []);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setLogsError(err instanceof Error ? err.message : 'Failed to fetch logs');
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [fromDate, toDate, selectedAgent, currentPage, limit]);

  // Fetch stats with current filters
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      
      const params: StatsParams = {};
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (selectedAgent) params.agent_name = selectedAgent;
      
      const response: ReportsStats = await ReportsService.getReportsStats(params);
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setStatsError(err instanceof Error ? err.message : 'Failed to fetch stats');
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  }, [fromDate, toDate, selectedAgent]);

  // Load initial data
  useEffect(() => {
    fetchAgentNames();
  }, [fetchAgentNames]);

  // Load logs and stats when filters change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchLogs();
      fetchStats();
    }
  }, [fetchLogs, fetchStats, fromDate, toDate]);

  // Action handlers
  const setDateRange = useCallback((newFromDate: string, newToDate: string) => {
    setFromDate(newFromDate);
    setToDate(newToDate);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const setSelectedAgentHandler = useCallback((agent: string) => {
    setSelectedAgent(agent);
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const applyFilters = useCallback(async () => {
    setCurrentPage(1); // Reset to first page
    await Promise.all([fetchLogs(), fetchStats()]);
  }, [fetchLogs, fetchStats]);

  const clearFilters = useCallback(() => {
    const defaultRange = ReportsService.getDefaultDateRange();
    setFromDate(defaultRange.from_date);
    setToDate(defaultRange.to_date);
    setSelectedAgent('');
    setCurrentPage(1);
  }, []);

  const goToNextPage = useCallback(() => {
    const maxPage = Math.ceil(total / limit);
    if (currentPage < maxPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, total, limit]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const setLimitHandler = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to first page when limit changes
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([
      fetchAgentNames(),
      fetchLogs(),
      fetchStats()
    ]);
  }, [fetchAgentNames, fetchLogs, fetchStats]);

  return {
    // Data
    logs,
    stats,
    agentNames,
    
    // Pagination
    total,
    currentPage,
    limit,
    
    // Filters
    fromDate,
    toDate,
    selectedAgent,
    
    // Loading states
    isLoadingLogs,
    isLoadingStats,
    isLoadingAgents,
    
    // Error states
    logsError,
    statsError,
    agentsError,
    
    // Actions
    setDateRange,
    setSelectedAgent: setSelectedAgentHandler,
    applyFilters,
    clearFilters,
    goToNextPage,
    goToPrevPage,
    setLimit: setLimitHandler,
    refetch,
  };
};
