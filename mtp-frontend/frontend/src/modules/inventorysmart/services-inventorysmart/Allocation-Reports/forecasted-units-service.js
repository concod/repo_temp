import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import { GET_FORECASTED_UNITS_TABLE_LIST } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const forecastedUnitsService = createSlice({
  name: "forecastedUnitsService",
  initialState: {
    forecastedUnitsLoader: false,
    forecastedUnitsFilterConfiguration: [],
    forecastedTableData: [],
  },
  reducers: {
    setForecastedUnitsLoader: (state, action) => {
      state.forecastedUnitsLoader = action.payload;
    },
    setForecastedUnitsFilterConfiguration: (state, action) => {
      state.forecastedUnitsFilterConfiguration = action.payload;
    },
    clearForecastedUnitStates: (state) => {
      state.forecastedUnitsLoader = false;
      state.forecastedUnitsFilterConfiguration = [];
      state.forecastedTableData = [];
    },
    setForecastedUnitsTableData: (state, action) => {
      state.forecastedTableData = action.payload;
    },
  },
});

export const {
  setForecastedUnitsLoader,
  setForecastedUnitsFilterConfiguration,
  clearForecastedUnitStates,
  setForecastedUnitsTableData,
} = forecastedUnitsService.actions;

export const getForecastedUnitsTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_FORECASTED_UNITS_TABLE_LIST,
    method: "POST",
    data: postbody,
  });
};

export default forecastedUnitsService.reducer;
