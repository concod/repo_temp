import { httpClient } from './httpClient';
import type { DashboardResponse, MonitoringParams } from '../types/api';

const MONITORING_ENDPOINTS = {
  DASHBOARD: 'api/dashboard',
} as const;

export const fetchDashboardData = async (params: MonitoringParams): Promise<DashboardResponse> => {
  const response = await httpClient.get<DashboardResponse>(MONITORING_ENDPOINTS.DASHBOARD, {
    params: {
      from_time: params.from_time,
      to_time: params.to_time,
    }
  });
  
  return response.data;
};

export const monitoringService = {
  fetchDashboardData,
};

export default monitoringService;