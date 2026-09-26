import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_INTENTIONAL_MIN_REPORTS,
  GET_UNINTENTIONAL_MIN_REPORTS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const intentionalMinReportsService = createSlice({
  name: "intentionalMinReportsService",
  initialState: {
    intentionalMinScreenLoader: false,
    intentionalMinReportFilterConfiguration: [],
  },
  reducers: {
    setIntentionalMinScreenLoader: (state, action) => {
      state.intentionalMinScreenLoader = action.payload;
    },
    setIntentionalMinReportFilterConfiguration: (state, action) => {
      state.intentionalMinReportFilterConfiguration = action.payload;
    },
    clearIntentionalMinReportStates: (state) => {
      state.intentionalMinScreenLoader = false;
      state.intentionalMinReportFilterConfiguration = [];
    },
  },
});

export const {
  setIntentionalMinScreenLoader,
  setIntentionalMinReportFilterConfiguration,
  clearIntentionalMinReportStates,
} = intentionalMinReportsService.actions;

export const getIntentionalMinReportsTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_INTENTIONAL_MIN_REPORTS,
    method: "POST",
    data: postbody,
  });
};

export const getUnintentionalMinReportsTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_UNINTENTIONAL_MIN_REPORTS,
    method: "POST",
    data: postbody,
  });
};

export default intentionalMinReportsService.reducer;
