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
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

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
    dashboardFilterFullScreen: false,
    autoLoadDashboard: false,
    finalizeToDashboardReload: false,
    filterDependencyData: [],
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
  setSelectedDates,
  resetDashboardStore,
  setDashboardLoaderFullScreen,
  setAutoDashboardLoad,
  setFinalizeToDashboardReload,
  setFilterDependencyData,
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

export const getViewPlanTableData = (postBody) => () => {
  return axiosInstance({
    url: VIEWPLANS_TABLE_DATA,
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

export default inventorySmartDashboardService.reducer;
