import { createSlice } from "@reduxjs/toolkit";
import {
  OMS_REPORT_FORECAST_ACCURACY,
  OMS_REPORT_FORECAST_ACCURACY_TABLE_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "core/Utils/axios";

export const reportsForecastAccuracyReportsService = createSlice({
  name: "reportsForecastAccuracyReportsService",
  initialState: {
    isFiltersValid: false,
    selectedFilters: null,
    forecastAccuracyReportsFilterElements: [],
    forecastAccuracyReportsFilterDependency: [],
    forecastAccuracyReportsFilterLoader: false,
    forecastAccuracyReportsFilterConfig: [],
    forecastAccuracyReportsScreenLoader: false,
    forecastAccuracyReportsDataLoader: false,
    forecastAccuracyReportsFiscalWeekGraph: [],
    forecastAccuracyReportsTableDataLoader: false,
    forecastAccuracyReportsTableData: [],
    forecastAccuracyReportsSkuTableConfigLoader: false,
    forecastAccuracyReportsSkuTableDataLoader: false,
    forecastAccuracyReportsSkuTableData: [],
    forecastAccuracyReportsTableConfigLoader: false,
  },
  reducers: {
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setForecastAccuracyReportsFilterElements: (state, action) => {
      state.forecastAccuracyReportsFilterElements = action.payload;
    },
    setForecastAccuracyReportsFilterDependency: (state, action) => {
      state.forecastAccuracyReportsFilterDependency = action.payload;
    },
    setForecastAccuracyReportsFilterLoader: (state, action) => {
      state.forecastAccuracyReportsFilterLoader = action.payload;
    },
    setForecastAccuracyReportsFilterConfig: (state, action) => {
      state.forecastAccuracyReportsFilterConfig = action.payload;
    },
    setForecastAccuracyReportsScreenLoader: (state, action) => {
      state.forecastAccuracyReportsScreenLoader = action.payload;
    },
    setForecastAccuracyReportsDataLoader: (state, action) => {
      state.forecastAccuracyReportsDataLoader = action.payload;
    },
    setForecastAccuracyReportsTableDataLoader: (state, action) => {
      state.forecastAccuracyReportsTableDataLoader = action.payload;
    },
    setForecastAccuracyTableConfigLoader: (state, action) => {
      state.forecastAccuracyReportsTableConfigLoader = action.payload;
    },
    setForecastAccuracyReportsTableData: (state, action) => {
      state.forecastAccuracyReportsTableData = action.payload;
    },

    setForecastAccuracyReportsSkuTableDataLoader: (state, action) => {
      state.forecastAccuracyReportsSkuTableDataLoader = action.payload;
    },
    setForecastAccuracyReportsSkuTableData: (state, action) => {
      state.forecastAccuracyReportsSkuTableData = action.payload;
    },

    clearForecastAccuracyReportsStates: (state) => {
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.forecastAccuracyReportsFilterElements = [];
      state.forecastAccuracyReportsFilterDependency = [];
      state.forecastAccuracyReportsFilterLoader = false;
      state.forecastAccuracyReportsFilterConfig = [];
      state.forecastAccuracyReportsScreenLoader = false;
      state.forecastAccuracyReportsDataLoader = false;
      state.forecastAccuracyReportsFiscalWeekGraph = [];
      state.forecastAccuracyReportsTableDataLoader = false;
      state.forecastAccuracyReportsTableData = [];
      state.forecastAccuracyReportsSkuTableData = [];
      state.forecastAccuracyReportsSkuTableDataLoader = false;
      state.forecastAccuracyReportsTableConfigLoader = false;
    },
  },
});

export const {
  setSelectedFilters,
  setIsFiltersValid,
  setForecastAccuracyReportsFilterElements,
  setForecastAccuracyReportsFilterDependency,
  setForecastAccuracyReportsFilterLoader,
  setForecastAccuracyReportsFilterConfig,
  setForecastAccuracyReportsScreenLoader,
  setForecastAccuracyReportsDataLoader,
  setForecastAccuracyReportsFiscalGraphData,
  setForecastAccuracyReportsTableDataLoader,
  setForecastAccuracyReportsTableData,
  setForecastAccuracyReportsSkuTableDataLoader,
  setForecastAccuracyReportsSkuTableData,
  clearForecastAccuracyReportsStates,
  setForecastAccuracyTableConfigLoader,
} = reportsForecastAccuracyReportsService.actions;

export const getForecastAccuracyTableConfig = () => () => {
  return axiosInstance({
    url: OMS_REPORT_FORECAST_ACCURACY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getForecastAccuracyTableData = (postbody) => () => {
  return axiosInstance({
    url: OMS_REPORT_FORECAST_ACCURACY,
    method: "POST",
    data: postbody,
  });
};

export default reportsForecastAccuracyReportsService.reducer;
