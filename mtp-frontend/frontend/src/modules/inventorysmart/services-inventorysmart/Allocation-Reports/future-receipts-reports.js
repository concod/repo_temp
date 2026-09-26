import { createSlice } from "@reduxjs/toolkit";
import {
  FUTURE_RECEIPTS_PROJECTIONS_CHART_DATA,
  FUTURE_RECEIPTS_PROJECTIONS_TABLE_DATA,
  FUTURE_RECEIPTS_SKU_VENDOR_PROJECTIONS_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "core/Utils/axios";

export const reportsFutureReceiptsReportsService = createSlice({
  name: "reportsFutureReceiptsReportsService",
  initialState: {
    isFiltersValid: false,
    selectedFilters: null,
    futureReceiptsReportsFilterElements: [],
    futureReceiptsReportsFilterDependency: [],
    futureReceiptsReportsFilterLoader: false,
    futureReceiptsReportsFilterConfig: [],
    futureReceiptsReportsScreenLoader: false,
    futureReceiptsReportsDataLoader: false,
    futureReceiptsReportsFiscalWeekGraph: [],
    futureReceiptsReportsTableDataLoader: false,
    futureReceiptsReportsTableData: [],
    futureReceiptsReportsSkuTableConfigLoader: false,
    futureReceiptsReportsSkuTableDataLoader: false,
    futureReceiptsReportsSkuTableData: [],
  },
  reducers: {
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setFutureReceiptsReportsFilterElements: (state, action) => {
      state.futureReceiptsReportsFilterElements = action.payload;
    },
    setFutureReceiptsReportsFilterDependency: (state, action) => {
      state.futureReceiptsReportsFilterDependency = action.payload;
    },
    setFutureReceiptsReportsFilterLoader: (state, action) => {
      state.futureReceiptsReportsFilterLoader = action.payload;
    },
    setFutureReceiptsReportsFilterConfig: (state, action) => {
      state.futureReceiptsReportsFilterConfig = action.payload;
    },
    setFutureReceiptsReportsScreenLoader: (state, action) => {
      state.futureReceiptsReportsScreenLoader = action.payload;
    },
    setFutureReceiptsReportsDataLoader: (state, action) => {
      state.futureReceiptsReportsDataLoader = action.payload;
    },
    setFutureReceiptsReportsFiscalGraphData: (state, action) => {
      state.futureReceiptsReportsFiscalWeekGraph = action.payload;
    },

    setFutureReceiptsReportsTableDataLoader: (state, action) => {
      state.futureReceiptsReportsTableDataLoader = action.payload;
    },
    setFutureReceiptsReportsTableData: (state, action) => {
      state.futureReceiptsReportsTableData = action.payload;
    },

    setFutureReceiptsReportsSkuTableDataLoader: (state, action) => {
      state.futureReceiptsReportsSkuTableDataLoader = action.payload;
    },
    setFutureReceiptsReportsSkuTableData: (state, action) => {
      state.futureReceiptsReportsSkuTableData = action.payload;
    },

    clearFutureReceiptsReportsStates: (state) => {
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.futureReceiptsReportsFilterElements = [];
      state.futureReceiptsReportsFilterDependency = [];
      state.futureReceiptsReportsFilterLoader = false;
      state.futureReceiptsReportsFilterConfig = [];
      state.futureReceiptsReportsScreenLoader = false;
      state.futureReceiptsReportsDataLoader = false;
      state.futureReceiptsReportsFiscalWeekGraph = [];
      state.futureReceiptsReportsTableDataLoader = false;
      state.futureReceiptsReportsTableData = [];
      state.futureReceiptsReportsSkuTableData = [];
      state.futureReceiptsReportsSkuTableDataLoader = false;
    },
  },
});

export const {
  setSelectedFilters,
  setIsFiltersValid,
  setFutureReceiptsReportsFilterElements,
  setFutureReceiptsReportsFilterDependency,
  setFutureReceiptsReportsFilterLoader,
  setFutureReceiptsReportsFilterConfig,
  setFutureReceiptsReportsScreenLoader,
  setFutureReceiptsReportsDataLoader,
  setFutureReceiptsReportsFiscalGraphData,
  setFutureReceiptsReportsTableDataLoader,
  setFutureReceiptsReportsTableData,
  setFutureReceiptsReportsSkuTableDataLoader,
  setFutureReceiptsReportsSkuTableData,
  clearFutureReceiptsReportsStates,
} = reportsFutureReceiptsReportsService.actions;

export const getFutureReceiptsChartData = (postbody) => () => {
  return axiosInstance({
    url: FUTURE_RECEIPTS_PROJECTIONS_CHART_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getFutureReceiptsReportsTableData = (postbody) => () => {
  return axiosInstance({
    url: FUTURE_RECEIPTS_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getFutureReceiptsReportsSkuLevelTableData = (postbody) => () => {
  return axiosInstance({
    url: FUTURE_RECEIPTS_SKU_VENDOR_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export default reportsFutureReceiptsReportsService.reducer;
