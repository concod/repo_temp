import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import { GET_FORECAST_VARIANCE_TABLE_DATA, GET_FORECAST_VARIANCE_TOTAL_LINE } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const forecastVarianceReportService = createSlice({
  name: "forecastVarianceReportService",
  initialState: {
    forecastVarianceTableLoader: false,
    forecastVarianceFilterConfiguration: [],
    forecastVarianceTableData: [],
    forecastVarianceColDef: [],
    forecastVarianceAggregateColDef: [],
    forecastVarianceTotalLine: [],
  },
  reducers: {
    setForecastVarianceTableLoader: (state, action) => {
      state.forecastVarianceTableLoader = action.payload;
    },
    setForecastVarianceFilterConfiguration: (state, action) => {
      state.forecastVarianceFilterConfiguration = action.payload;
    },
    setForecastVarianceTableData: (state, action) => {
      state.forecastVarianceTableData = action.payload;
    },
    setForecastVarianceTotalLine: (state, action) => {
      state.forecastVarianceTotalLine = action.payload;
    },
    setForecastVarianceColDef: (state, action) => {
      state.forecastVarianceColDef = action.payload;
    },
    setForecastVarianceAggregateColDef: (state, action) => {
      state.forecastVarianceAggregateColDef = action.payload;
    },
    clearForecastVarianceStates: (state) => {
      state.forecastVarianceTableLoader = false;
      state.forecastVarianceFilterConfiguration = [];
      state.forecastVarianceColDef = [];
      state.forecastVarianceTableData = [];
      state.forecastVarianceTotalLine = [];
    },
  },
});

export const {
  setForecastVarianceFilterConfiguration,
  clearForecastVarianceStates,
  setForecastVarianceTableLoader,
  setForecastVarianceTableData,
  setForecastVarianceTotalLine,
  setForecastVarianceColDef,
  setForecastVarianceAggregateColDef,
} = forecastVarianceReportService.actions;

export const getForecastVarianceTableData = (endPoint,postbody) => () => {
  return axiosInstance({
    url: endPoint,
    method: "POST",
    data: postbody,
  });
};

export const getForecastVarianceTotalLine = (endPoint,postBody) => () => { 
  return axiosInstance({
    url: endPoint,
    method: "POST",
    data: postBody,
  });
};

export default forecastVarianceReportService.reducer;
