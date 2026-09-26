import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { GET_FORECAST_ACCURACY_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const forecastAccuracyService = createSlice({
  name: "forecastAccuracyService",
  initialState: {
    forecastAccuracyTableLoader: false,
    forecastAccuracyTableData: [],
    forecastAccuracyFilterConfiguration: [],
  },
  reducers: {
    setForecastAccuracyTableLoader: (state, action) => {
      state.forecastAccuracyTableLoader = action.payload;
    },
    setForecastAccuracyTableData: (state, action) => {
      state.forecastAccuracyTableData = action.payload;
    },
    setForecastAccuracyFilterConfiguration: (state, action) => {
      state.forecastAccuracyFilterConfiguration = action.payload;
    },
    clearForecastAccuracyStates: (state) => {
      state.forecastAccuracyTableData = [];
      state.forecastAccuracyFilterConfiguration = [];
    },
  },
});

export const {
  setForecastAccuracyTableData,
  setForecastAccuracyFilterConfiguration,
  clearForecastAccuracyStates,
  setForecastAccuracyTableLoader,
} = forecastAccuracyService.actions;

export const getAccuracyReportTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_FORECAST_ACCURACY_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export default forecastAccuracyService.reducer;