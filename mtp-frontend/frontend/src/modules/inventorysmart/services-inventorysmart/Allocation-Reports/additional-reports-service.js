import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_ADDITIONAL_REPORTS_DATA,
  FETCH_FISCAL_WEEK_DROPDOWN_VALUE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const additionalReportsService = createSlice({
  name: "additionalReportsService",
  initialState: {
    additionalReportsLoader: false,
    additionalReportsTableLoader: false,
    additionalReportsTableData: [],
    additionalReportsFilterConfiguration: [],
  },
  reducers: {
    setAdditionalReportsLoader: (state, action) => {
      state.additionalReportsLoader = action.payload;
    },
    setAdditionalReportsTableLoader: (state, action) => {
      state.additionalReportsTableLoader = action.payload;
    },
    setAdditionalReportsTableData: (state, action) => {
      state.additionalReportsTableData = action.payload;
    },
    setAdditionalReportsFilterConfiguration: (state, action) => {
      state.additionalReportsFilterConfiguration = action.payload;
    },
    clearAdditionalReportStates: (state) => {
      state.additionalReportsLoader = false;
      state.additionalReportsTableData = [];
      state.additionalReportsFilterConfiguration = [];
    },
  },
});

export const {
  setAdditionalReportsLoader,
  setAdditionalReportsTableLoader,
  setAdditionalReportsTableData,
  setAdditionalReportsFilterConfiguration,
  clearAdditionalReportStates,
} = additionalReportsService.actions;

export const getAdditionalReportsTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_ADDITIONAL_REPORTS_DATA,
    method: "POST",
    data: postbody,
  });
};

export const fetchFiscalWeekDropDownValues = (postbody) => () => {
  return axiosInstance({
    url: FETCH_FISCAL_WEEK_DROPDOWN_VALUE,
    method: "POST",
    data: postbody,
  });
};

export default additionalReportsService.reducer;
