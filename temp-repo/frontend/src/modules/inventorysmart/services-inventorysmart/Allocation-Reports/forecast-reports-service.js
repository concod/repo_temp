import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_FORECAST_REPORTS_TABLE_CONFIG,
  GET_FORECAST_REPORTS_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const forecastReportsService = createSlice({
  name: "forecastReportsService",
  initialState: {
    forecastReportsFilterLoader: false,
    forecastReportsConfigLoader: false,
    modelStockDeepDivePopupConfigLoader: false,
    forecastReportsDataLoader: false,
    modelStockDeepDiveTableData: [],
    forecastReportsFilterDependency: [],
    forecastReportsFilterConfig: [],
    isFiltersValid: false,
    selectedFilters: null,
  },
  reducers: {
    setForecastReportsFilterLoader: (state, action) => {
      state.forecastReportsFilterLoader = action.payload;
    },
    setForecastReportsConfigLoader: (state, action) => {
      state.forecastReportsConfigLoader = action.payload;
    },
    setModelStockDeepDivePopupConfigLoader: (state, action) => {
      state.modelStockDeepDivePopupConfigLoader = action.payload;
    },
    setForecastReportsDataLoader: (state, action) => {
      state.forecastReportsDataLoader = action.payload;
    },
    setModelStockDeepDiveTableData: (state, action) => {
      state.modelStockDeepDiveTableData = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setForecastReportsFilterConfig: (state, action) => {
      state.forecastReportsFilterConfig = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearForecastReportsStates: (state) => {
      state.forecastReportsFilterLoader = false;
      state.forecastReportsConfigLoader = false;
      state.modelStockDeepDivePopupConfigLoader = false;
      state.forecastReportsDataLoader = false;
      state.modelStockDeepDiveTableData = [];
      state.forecastReportsFilterDependency = [];
      state.forecastReportsFilterConfig = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.fiscalDates = null;
    },
  },
});

export const {
  setForecastReportsFilterLoader,
  setForecastReportsConfigLoader,
  setModelStockDeepDivePopupConfigLoader,
  setForecastReportsDataLoader,
  setModelStockDeepDiveTableData,
  setSelectedFilters,
  setForecastReportsFilterConfig,
  setIsFiltersValid,
  clearForecastReportsStates,
} = forecastReportsService.actions;

export const getForecastReportsTableConfig = () => () => {
  return axiosInstance({
    url: GET_FORECAST_REPORTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getForecastReportsTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_FORECAST_REPORTS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export default forecastReportsService.reducer;
