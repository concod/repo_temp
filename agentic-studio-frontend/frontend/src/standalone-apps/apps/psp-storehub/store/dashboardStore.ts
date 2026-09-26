import { create } from 'zustand';
import type {
  DashboardData,
  DistrictFilter,
  DataTimeDetail,
  OverallSummary,
  KPICard,
  AllStores,
  ThemeSection,
  PerformanceChart,
  QueryDetails
} from '../types/dashboard.types';

interface DashboardStore {
  // Data state
  districtFilter: DistrictFilter | null;
  dataTimeDetail: DataTimeDetail | null;
  overallSummary: OverallSummary | null;
  kpiCards: KPICard[] | null;
  allStores: AllStores | null;
  topNegativeThemes: ThemeSection | null;
  topPositiveThemes: ThemeSection | null;
  topNeutralThemes: ThemeSection | null;
  queryDetails: QueryDetails | null;
  performanceChart: PerformanceChart | null;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  
  // Cache timestamp
  lastFetched: number | null;
  
  // Actions
  setDashboardData: (data: DashboardData) => void;
  clearDashboardData: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  hasCachedData: () => boolean;
  getCachedDashboardData: () => DashboardData | null;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // Initial state
  districtFilter: null,
  dataTimeDetail: null,
  overallSummary: null,
  kpiCards: null,
  allStores: null,
  topNegativeThemes: null,
  topPositiveThemes: null,
  topNeutralThemes: null,
  queryDetails: null,
  performanceChart: null,
  loading: false,
  error: null,
  lastFetched: null,
  
  // Actions
  setDashboardData: (data) => set({
    districtFilter: data.districtFilter,
    dataTimeDetail: data.dataTimeDetail,
    overallSummary: data.overallSummary,
    kpiCards: data.kpiCards,
    allStores: data.allStores,
    topNegativeThemes: data.topNegativeThemes,
    topPositiveThemes: data.topPositiveThemes,
    topNeutralThemes: data.topNeutralThemes,
    queryDetails: data.query_details,
    performanceChart: data.performanceChart,
    loading: false,
    error: null,
    lastFetched: Date.now(),
  }),
  
  clearDashboardData: () => set({
    districtFilter: null,
    dataTimeDetail: null,
    overallSummary: null,
    kpiCards: null,
    allStores: null,
    topNegativeThemes: null,
    topPositiveThemes: null,
    topNeutralThemes: null,
    queryDetails: null,
    performanceChart: null,
    loading: false,
    error: null,
    lastFetched: null,
  }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  // Check if we have cached data
  hasCachedData: () => {
    const state = get();
    return !!(
      state.kpiCards &&
      state.kpiCards.length > 0 &&
      state.allStores &&
      state.topNegativeThemes &&
      state.topPositiveThemes &&
      state.topNeutralThemes &&
      state.performanceChart
    );
  },
  
  // Reconstruct DashboardData from store state
  getCachedDashboardData: () => {
    const state = get();
    
    if (!state.hasCachedData()) {
      return null;
    }
    
    // Reconstruct DashboardData from store state
    const dashboardData: DashboardData = {
      districtFilter: state.districtFilter!,
      dataTimeDetail: state.dataTimeDetail!,
      overallSummary: state.overallSummary!,
      kpiCards: state.kpiCards!,
      allStores: state.allStores!,
      topNegativeThemes: state.topNegativeThemes!,
      topPositiveThemes: state.topPositiveThemes!,
      topNeutralThemes: state.topNeutralThemes!,
      query_details: state.queryDetails!,
      performanceChart: state.performanceChart!,
    };
    
    return dashboardData;
  },
}));

