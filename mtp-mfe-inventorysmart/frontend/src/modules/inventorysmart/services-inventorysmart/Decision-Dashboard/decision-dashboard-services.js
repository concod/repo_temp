import { createSlice } from "@reduxjs/toolkit";
import {
  DASHBOARD_FILTER_CONFIG,
  VIEWPLANS_TABLE_CONFIG,
  VIEWPLANS_TABLE_DATA,
  DELETE_PLANS,
  PRODUCT_RULE_DASHBOARD_FILTER_CONFIG,
  DATA_REFRESH_DATE_DETAILS,
  SAVE_APPLIED_FILTERS,
  GET_APPLIED_FILTERS_DASHBOARD,
  RENAME_PALNS_BY_LEVELS,
  DOWNLOAD_INVENTORY_DETAILS,
  MOVE_TO_ORDER_BATCHING,
  PLAN_SUMMARY,
  SET_REVIEWED_ALERTS,
  ALERT_REVIEW,
  CHECK_INGESTION_STATUS,
  GET_ALAN_SUMMARY,
  AGGREGATE_INSIGHTS_SUMMARY,
  AGGREGATE_DIAGNOSTIC_INSIGHTS,
  getAlanSummaryBaseUrl,
  CLOUD_FUNCTIONS_BASE_URL,
  CLOUD_FUNCTIONS_URL,
  ALAN_SUMMARY,
  ALAN_EXPLAINATORY,
  STORE_TRANSFER_VIEWPLANS_TABLE_CONFIG,
  STORE_TRANSFER_VIEWPLANS_TABLE_DATA,
  STORE_TRANSFER_VIEWPLANS_TABLE_DELETE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";
import axios from "axios";

export const inventorySmartDashboardService = createSlice({
  name: "inventorySmartDashboardService",
  initialState: {
    inventorysmartFilterLoader: false,
    inventorysmartDeletePlanLoader: false,
    inventorysmartDatesLoader: false,
    inventoryDashboardFilterConfig: [],
    selectedFilters: [],
    selectedDates: {
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    },
    isFiltersValid: false,
    viewPlanLoader: false,
    viewPlanTableConfigLoader: false,
    viewPlansTableConfig: [],
    viewPlansTableData: [],
    viewPlansTableDataS2S: [],
    dashboardFilterFullScreen: false,
    autoLoadDashboard: false,
    finalizeToDashboardReload: false,
    filterDependencyData: [],
    ddScreenConfigs: {},
    advanceFilter: false,
    setSummaryPlan: false,
    alanExplainability: false,
    enableSmartFilter: false,
    isProdCloudFunction: false,
  },
  reducers: {
    setInventorysmartFilterLoader: (state, action) => {
      state.inventorysmartFilterLoader = action.payload;
    },
    setInventorysmartDeletePlanLoader: (state, action) => {
      state.inventorysmartDeletePlanLoader = action.payload;
    },
    setInventorysmartDatesLoader: (state, action) => {
      state.inventorysmartDatesLoader = action.payload;
    },
    setInventoryDashboardFilterConfig: (state, action) => {
      state.inventoryDashboardFilterConfig = action.payload;
    },
    setDashboardLoaderFullScreen: (state, action) => {
      state.dashboardFilterFullScreen = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setViewPlanTableLoader: (state, action) => {
      state.viewPlanLoader = action.payload;
    },
    setViewPlanTableConfigLoader: (state, action) => {
      state.viewPlanTableConfigLoader = action.payload;
    },
    setViewPlanTableConfiguration: (state, action) => {
      state.viewPlansTableConfig = action.payload;
    },
    setViewPlanTableData: (state, action) => {
      state.viewPlansTableData = action.payload;
    },
    setViewPlanTableDataS2S: (state, action) => {
      state.viewPlansTableDataS2S = action.payload;
    },
    setSelectedDates: (state, action) => {
      state.selectedDates = action.payload;
    },
    resetDashboardStore: (state, _action) => {
      state.inventorysmartFilterLoader = false;
      state.inventorysmartDeletePlanLoader = false;
      state.inventorysmartDatesLoader = false;
      state.dashboardFilterFullScreen = false;
      state.inventoryDashboardFilterConfig = [];
      state.selectedFilters = [];
      state.selectedDates = {
        fiscalInfoStartDate: null,
        fiscalInfoEndDate: null,
      };
      state.isFiltersValid = false;
      state.viewPlanLoader = false;
      state.viewPlanTableConfigLoader = false;
      state.viewPlansTableConfig = [];
      state.viewPlansTableData = [];
      state.viewPlansTableDataS2S = [];
    },
    setAutoDashboardLoad: (state, action) => {
      state.autoLoadDashboard = action.payload;
    },
    setFinalizeToDashboardReload: (state, action) => {
      state.finalizeToDashboardReload = action.payload;
    },
    setFilterDependencyData: (state, action) => {
      state.filterDependencyData = action.payload;
    },
    setDDScreenConfigs: (state, action) => {
      state.ddScreenConfigs = action.payload;
    },
    setFilterPlan: (state, action) => {
      state.advanceFilter = action.payload;
    },
    setSummaryPlan: (state, action) => {
      state.setSummaryPlan = action.payload;
    },
    setAlanExplainability: (state, action) => {
      state.alanExplainability = action.payload;
    },
    setEnableSmartFilter: (state, action) => {
      state.enableSmartFilter = action.payload;
    },
    setIsProdCloudFunction: (state, action) => {
      state.isProdCloudFunction = action.payload;
    },
  },
});

export const {
  setInventorysmartFilterLoader,
  setInventorysmartDeletePlanLoader,
  setInventorysmartDatesLoader,
  setInventoryDashboardFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  setViewPlanTableLoader,
  setViewPlanTableConfigLoader,
  setViewPlanTableConfiguration,
  setViewPlanTableData,
  setViewPlanTableDataS2S,
  setSelectedDates,
  resetDashboardStore,
  setDashboardLoaderFullScreen,
  setAutoDashboardLoad,
  setFinalizeToDashboardReload,
  setFilterDependencyData,
  setDDScreenConfigs,
  setFilterPlan,
  setSummaryPlan,
  setAlanExplainability,
  setEnableSmartFilter,
  setIsProdCloudFunction,
} = inventorySmartDashboardService.actions;

export const getFilterConfiguration = (filterType) => () => {
  let dynamicURL = DASHBOARD_FILTER_CONFIG;
  if (filterType === "ProductRule") {
    dynamicURL = PRODUCT_RULE_DASHBOARD_FILTER_CONFIG;
  }
  return axiosInstance({
    url: dynamicURL,
    method: "GET",
  });
};

export const getViewPlanTableConfiguration = () => () => {
  return axiosInstance({
    url: VIEWPLANS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getViewPlanTableConfigurationS2S = () => () => {
  return axiosInstance({
    url: STORE_TRANSFER_VIEWPLANS_TABLE_CONFIG,
    method: "GET",
  });
};

export const deleteViewPlanS2S = (postBody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_VIEWPLANS_TABLE_DELETE,
    method: "POST",
    data: postBody,
  });
};

export const getViewPlanTableData = (postBody) => () => {
  return axiosInstance({
    url: VIEWPLANS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};
export const getViewPlanTableDataS2S = (postBody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_VIEWPLANS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const deletePlans = (postBody) => () => {
  return axiosInstance({
    url: DELETE_PLANS,
    method: "POST",
    data: postBody,
  });
};

export const getDataRefreshDateDetails = () => () => {
  return axiosInstance({
    url: DATA_REFRESH_DATE_DETAILS,
    method: "GET",
  });
};

export const saveAppliedFilters = (postBody) => () => {
  return axiosInstance({
    url: SAVE_APPLIED_FILTERS,
    method: "POST",
    data: postBody,
  });
};

export const getAppliedFilters = () => () => {
  return axiosInstance({
    url: GET_APPLIED_FILTERS_DASHBOARD,
    method: "GET",
  });
};

export const renamePLansByLevel = () => () => {
  return axiosInstance({
    url: RENAME_PALNS_BY_LEVELS,
    method: "POST",
    data: "",
  });
};

export const downloadInventoryDetails = (postBody) => async () => {
  return axiosInstance({
    url: DOWNLOAD_INVENTORY_DETAILS,
    method: "POST",
    data: postBody,
  });
};

export const moveToOrderBatching = (postBody) => async () => {
  return axiosInstance({
    url: MOVE_TO_ORDER_BATCHING,
    method: "POST",
    data: postBody,
  });
};

export const getPlanSummary = (postBody) => () => {
  return axiosInstance({
    url: PLAN_SUMMARY,
    method: "POST",
    data: postBody,
  });
};

export const setReviewedAlerts = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: SET_REVIEWED_ALERTS,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const checkIngestionStatus = (postBody, URL) => async () => {
  const { data } = await axiosInstance({
    url: URL ? CHECK_INGESTION_STATUS : ALERT_REVIEW,
    method: "POST",
    data: postBody,
  });
  return data;
};

export const getAlanSummary = (body) => () => {
  const ALAN_SUMMARY_API = `${CLOUD_FUNCTIONS_BASE_URL}${GET_ALAN_SUMMARY}`;
  return axios.post(ALAN_SUMMARY_API, body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const getAlanSummaryForAlerts = (body) => () => {
  const ALAN_SUMMARY_API = `${CLOUD_FUNCTIONS_URL}${ALAN_SUMMARY}`;
  return axios.post(ALAN_SUMMARY_API, body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const getAlanExplainatory = (body) => () => {
  const ALAN_SUMMARY_API = `${CLOUD_FUNCTIONS_URL}${ALAN_EXPLAINATORY}`;
  return axios.post(ALAN_SUMMARY_API, body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const formatFiltersForAiSummary = (filters) =>
  (filters || [])
    .filter(
      (f) =>
        f?.dimension !== "store" &&
        Array.isArray(f?.values) &&
        f.values.length > 0
    )
    .map(({ filter_id, values }) => ({ filter_id, values }));

export const getAggregateInsightsSummary = (filters) => (
  _dispatch,
  getState
) => {
  const isProdCloudFunction =
    getState()?.inventorysmartReducer?.inventorySmartDashboardService
      ?.isProdCloudFunction || false;
  const AGGREGATE_INSIGHTS_SUMMARY_API = `${getAlanSummaryBaseUrl(isProdCloudFunction)}${AGGREGATE_INSIGHTS_SUMMARY}`;
  return axios.post(AGGREGATE_INSIGHTS_SUMMARY_API, {
    filters: formatFiltersForAiSummary(filters),
  });
};

export const getDiagnosticInsights = (filters) => (_dispatch, getState) => {
  const isProdCloudFunction =
    getState()?.inventorysmartReducer?.inventorySmartDashboardService
      ?.isProdCloudFunction || false;
  const AGGREGATE_DIAGNOSTIC_INSIGHTS_API = `${getAlanSummaryBaseUrl(isProdCloudFunction)}${AGGREGATE_DIAGNOSTIC_INSIGHTS}`;
  return axios.post(AGGREGATE_DIAGNOSTIC_INSIGHTS_API, {
    filters: formatFiltersForAiSummary(filters),
  });
};

export const getInsightDetail = (type, params, filters) => (
  _dispatch,
  getState
) => {
  const isProdCloudFunction =
    getState()?.inventorysmartReducer?.inventorySmartDashboardService
      ?.isProdCloudFunction || false;
  const INSIGHT_DETAIL_API = `${getAlanSummaryBaseUrl(isProdCloudFunction)}${AGGREGATE_DIAGNOSTIC_INSIGHTS}/${type}/detail`;
  return axios.post(INSIGHT_DETAIL_API, {
    ...(params || {}),
    filters: formatFiltersForAiSummary(filters),
  });
};

export default inventorySmartDashboardService.reducer;
