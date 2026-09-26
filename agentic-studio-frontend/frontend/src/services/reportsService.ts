import { httpClient } from './httpClient';
import { REPORTS_ENDPOINTS } from './endpoints';
import type { 
  FilteredLogsResponse, 
  AgentNamesResponse, 
  ReportsStats, 
  FilteredLogsParams, 
  StatsParams 
} from '../types/api';

/**
 * Reports Service
 * Handles all reports-related API calls
 */
export class ReportsService {
  /**
   * GET /api/reports/agent-logs - Fetches filtered logs with pagination
   */
  static async getFilteredLogs(params: FilteredLogsParams = {}): Promise<FilteredLogsResponse> {
    try {
      console.log('[ReportsService] Fetching filtered logs with params:', params);
      
      const queryParams = new URLSearchParams();
      
      // Add parameters if they exist
      if (params.from_date) queryParams.append('from_date', params.from_date);
      if (params.to_date) queryParams.append('to_date', params.to_date);
      if (params.agent_name) queryParams.append('agent_name', params.agent_name);
      if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

      const url = queryParams.toString() 
        ? `${REPORTS_ENDPOINTS.GET_FILTERED_LOGS}?${queryParams.toString()}`
        : REPORTS_ENDPOINTS.GET_FILTERED_LOGS;

      const response = await httpClient.get<FilteredLogsResponse>(url);
      
      console.log('[ReportsService] Filtered logs fetched successfully:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[ReportsService] Error fetching filtered logs:', error);
      throw error;
    }
  }

  /**
   * GET /api/reports/agent-names - Gets unique agent names for dropdown
   */
  static async getAgentNames(): Promise<AgentNamesResponse> {
    try {
      console.log('[ReportsService] Fetching agent names');
      
      const response = await httpClient.get<AgentNamesResponse>(REPORTS_ENDPOINTS.GET_AGENT_NAMES);
      
      console.log('[ReportsService] Agent names fetched successfully:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[ReportsService] Error fetching agent names:', error);
      throw error;
    }
  }

  /**
   * GET /api/reports/stats - Gets aggregated statistics
   */
  static async getReportsStats(params: StatsParams = {}): Promise<ReportsStats> {
    try {
      console.log('[ReportsService] Fetching reports stats with params:', params);
      
      const queryParams = new URLSearchParams();
      
      // Add parameters if they exist
      if (params.from_date) queryParams.append('from_date', params.from_date);
      if (params.to_date) queryParams.append('to_date', params.to_date);
      if (params.agent_name) queryParams.append('agent_name', params.agent_name);

      const url = queryParams.toString() 
        ? `${REPORTS_ENDPOINTS.GET_STATS}?${queryParams.toString()}`
        : REPORTS_ENDPOINTS.GET_STATS;

      const response = await httpClient.get<ReportsStats>(url);
      
      console.log('[ReportsService] Reports stats fetched successfully:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('[ReportsService] Error fetching reports stats:', error);
      throw error;
    }
  }

  /**
   * Utility method to format date for API (YYYY-MM-DD)
   */
  static formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Utility method to get default date range (last 30 days)
   */
  static getDefaultDateRange(): { from_date: string; to_date: string } {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      from_date: this.formatDateForAPI(thirtyDaysAgo),
      to_date: this.formatDateForAPI(today),
    };
  }

  /**
   * Utility method to parse JSON response safely
   */
  static parseLogResponse(responseString: string): any {
    try {
      return JSON.parse(responseString);
    } catch (error) {
      console.warn('[ReportsService] Failed to parse log response as JSON:', responseString);
      return { type: 'text', content: responseString };
    }
  }
}

export default ReportsService;
