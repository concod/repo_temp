import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import { GET_DC_AVAILABILITY_REPORT_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const dcAvailabilityReportService = createSlice({
  name: "dcAvailabilityReportService",
  initialState: {
    dcAvailabilityReportTableLoader: false,
    dcAvailabilityReportFilterConfiguration: [],
  },
  reducers: {
    setDcAvailabilityReportTableLoader: (state, action) => {
      state.dcAvailabilityReportTableLoader = action.payload;
    },
    setDcAvailabilityReportFilterConfiguration: (state, action) => {
      state.dcAvailabilityReportFilterConfiguration = action.payload;
    },
    clearDcAvailabilityReportStates: (state) => {
      state.dcAvailabilityReportTableLoader = false;
      state.dcAvailabilityReportFilterConfiguration = [];
    },
  },
});

export const {
  setDcAvailabilityReportFilterConfiguration,
  clearDcAvailabilityReportStates,
  setDcAvailabilityReportTableLoader,
} = dcAvailabilityReportService.actions;

export const getDCAvailabilityReportData = (postbody) => () => {
  return axiosInstance({
    url: GET_DC_AVAILABILITY_REPORT_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export default dcAvailabilityReportService.reducer;
