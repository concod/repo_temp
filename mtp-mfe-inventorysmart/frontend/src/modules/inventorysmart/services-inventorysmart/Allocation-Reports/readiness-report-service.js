import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { GET_READINESS_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const readinessReportService = createSlice({
  name: "readinessReportService",
  initialState: {
    readinessTableLoader: false,
    readinessTableData: [],
    readinessFilterConfiguration: [],
  },
  reducers: {
    setReadinessTableLoader: (state, action) => {
      state.readinessTableLoader = action.payload;
    },
    setReadinessReportTableData: (state, action) => {
      state.readinessTableData = action.payload;
    },
    setReadinessFilterConfiguration: (state, action) => {
      state.readinessFilterConfiguration = action.payload;
    },
    clearReadinessStates: (state) => {
      state.readinessTableData = [];
      state.readinessFilterConfiguration = [];
    },
  },
});

export const {
  setReadinessReportTableData,
  setReadinessFilterConfiguration,
  clearReadinessStates,
  setReadinessTableLoader,
} = readinessReportService.actions;

export const getReadinessReportTableData = (postbody, channel) => () => {
  return axiosInstance({
    url: `${GET_READINESS_TABLE_DETAILS}/${channel}`,
    method: "POST",
    data: postbody,
  });
};

export default readinessReportService.reducer;