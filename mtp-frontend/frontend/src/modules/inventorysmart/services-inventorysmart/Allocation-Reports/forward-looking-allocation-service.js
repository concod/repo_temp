import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_FUTURE_LOOKING_ALLOCATION_SUMMARY,
  GET_FUTURE_LOOKING_ALLOCATION_DETAILS,
  GET_FUTURE_LOOKING_ALLOCATION_PRODUCT_VIEW,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const forwardLookingAllocationService = createSlice({
  name: "forwardLookingAllocationService",
  initialState: {
    forwardLookingAllocationSummaryLoader: false,
    forwardLookingAllocationDetailsLoader: false,
    forwardLookingAllocationProductViewLoader: false,
    forwardLookingAllocationSummaryData: [],
    forwardLookingAllocationFilterConfiguration: [],
    forwardLookingAllocationDetailsData: [],
    forwardLookingAllocationProductViewData: [],
  },
  reducers: {
    setForwardLookingAllocationSummaryLoader: (state, action) => {
      state.forwardLookingAllocationSummaryLoader = action.payload;
    },
    setForwardLookingAllocationDetailsLoader: (state, action) => {
      state.forwardLookingAllocationDetailsLoader = action.payload;
    },
    setForwardLookingAllocationProductViewLoader: (state, action) => {
      state.forwardLookingAllocationProductViewLoader = action.payload;
    },
    setForwardLookingAllocationSummaryData: (state, action) => {
      state.forwardLookingAllocationSummaryData = action.payload;
    },
    setForwardLookingAllocationDetailsData: (state, action) => {
      state.forwardLookingAllocationDetailsData = action.payload;
    },
    setForwardLookingAllocationProductViewData: (state, action) => {
      state.forwardLookingAllocationProductViewData = action.payload;
    },
    setForwardLookingAllocationFilterConfiguration: (state, action) => {
      state.forwardLookingAllocationFilterConfiguration = action.payload;
    },
    clearForwardLookingAllocationStates: (state) => {
      state.forwardLookingAllocationSummaryLoader = false;
      state.forwardLookingAllocationDetailsLoader = false;
      state.forwardLookingAllocationDetailsData = [];
      state.forwardLookingAllocationSummaryData = [];
      state.forwardLookingAllocationFilterConfiguration = [];
      state.forwardLookingAllocationProductViewLoader = false;
      state.forwardLookingAllocationProductViewData = [];
    },
  },
});

export const {
  setForwardLookingAllocationSummaryData,
  setForwardLookingAllocationFilterConfiguration,
  clearForwardLookingAllocationStates,
  setForwardLookingAllocationSummaryLoader,
  setForwardLookingAllocationDetailsLoader,
  setForwardLookingAllocationDetailsData,
  setForwardLookingAllocationProductViewData,
  setForwardLookingAllocationProductViewLoader,
} = forwardLookingAllocationService.actions;

export const getForwardLookingAllocationSummaryData = (postbody) => () => {
  return axiosInstance({
    url: GET_FUTURE_LOOKING_ALLOCATION_SUMMARY,
    method: "POST",
    data: postbody,
  });
};

export const getForwardLookingAllocationDetailsData = (postbody) => () => {
  return axiosInstance({
    url: GET_FUTURE_LOOKING_ALLOCATION_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getForwardLookingAllocationProductViewData = (postbody) => () => {
  return axiosInstance({
    url: GET_FUTURE_LOOKING_ALLOCATION_PRODUCT_VIEW,
    method: "POST",
    data: postbody,
  });
};

export default forwardLookingAllocationService.reducer;
