import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import { GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const allocationDeepDiveService = createSlice({
  name: "allocationDeepDiveService",
  initialState: {
    allocationDeepDiveTableLoader: false,
    allocationDeepDiveTableData: [],
    allocationDeepDiveFilterConfiguration: [],
  },
  reducers: {
    setAllocationDeepDiveTableLoader: (state, action) => {
      state.allocationDeepDiveTableLoader = action.payload;
    },
    setAllocationDeepDiveTableData: (state, action) => {
      state.allocationDeepDiveTableData = action.payload;
    },
    setAllocationDeepDiveFilterConfiguration: (state, action) => {
      state.allocationDeepDiveFilterConfiguration = action.payload;
    },
    clearAllocationDeepDiveStates: (state) => {
      state.allocationDeepDiveTableData = [];
      state.allocationDeepDiveFilterConfiguration = [];
    },
  },
});

export const {
  setAllocationDeepDiveTableData,
  setAllocationDeepDiveFilterConfiguration,
  clearAllocationDeepDiveStates,
  setAllocationDeepDiveTableLoader,
} = allocationDeepDiveService.actions;

export const getAllocationDeepDiveTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export default allocationDeepDiveService.reducer;
