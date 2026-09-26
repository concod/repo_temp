import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_SISTER_STORE_DC_DETAILS,
  GET_STORE_GROUP_LIST,
  SISTER_STORE_TABLE_VALIDATION_CHECK,
  NEW_STORE_STEP_TWO_FINALIZE
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const sisterStoreMappingService = createSlice({
  name: "sisterStoreMappingService",
  initialState: {
    sisterStoreDetailsScreenLoader: false,
  },
  reducers: {
    setSisterStoreDetailsScreenLoader: (state, action) => {
      state.sisterStoreDetailsScreenLoader = action.payload;
    },
    clearSisterStoreDetailsScreenLoader: (state) => {
      state.sisterStoreDetailsScreenLoader = false;
    },
  },
});

export const {
  setSisterStoreDetailsScreenLoader,
  clearSisterStoreDetailsScreenLoader,
} = sisterStoreMappingService.actions;

export const getSisterStoreAndDCDetails = (postbody) => () => {
  return axiosInstance({
    url: GET_SISTER_STORE_DC_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getStoreGroup = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_GROUP_LIST,
    method: "POST",
    data: postbody,
  });
};

export const sisterStoreTableValidation = (postbody) => () => {
  return axiosInstance({
    url: SISTER_STORE_TABLE_VALIDATION_CHECK,
    method: "POST",
    data: postbody,
  });
};

export const newStoreStepTwoFinalize = (postbody) => () => {
  return axiosInstance({
    url: NEW_STORE_STEP_TWO_FINALIZE,
    method: "POST",
    data: postbody,
  });
};

export default sisterStoreMappingService.reducer;
