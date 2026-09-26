import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_SISTER_STORE_DC_DETAILS,
  GET_STORE_GROUP_LIST,
  SISTER_STORE_TABLE_VALIDATION_CHECK,
  CONFIGURATION_UPDATE_NEW_STORE,
  CONFIGURATION_ADD_NEW_STORE,
  GET_UPDATED_NEW_STORE_SUMMARY_FOR_SUPER_USER,
  CONFIRM_APPROVAL_OF_STORE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const sisterStoreMappingService = createSlice({
  name: "sisterStoreMappingService",
  initialState: {
    sisterStoreDetailsScreenLoader: false,
    reviewSummaryData: {},
  },
  reducers: {
    setSisterStoreDetailsScreenLoader: (state, action) => {
      state.sisterStoreDetailsScreenLoader = action.payload;
    },
    setReviewSummaryData: (state, action) => {
      state.reviewSummaryData = action.payload;
    },
    clearSisterStoreDetailsScreenLoader: (state) => {
      state.sisterStoreDetailsScreenLoader = false;
      state.reviewSummaryData = {};
    },
  },
});

export const {
  setSisterStoreDetailsScreenLoader,
  clearSisterStoreDetailsScreenLoader,
  setReviewSummaryData,
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

export const saveNewStoreDetails = (postbody) => () => {
  return axiosInstance({
    url: CONFIGURATION_ADD_NEW_STORE,
    method: "POST",
    data: postbody,
  });
};

export const updateNewStoreDetails = (postbody) => () => {
  return axiosInstance({
    url: CONFIGURATION_UPDATE_NEW_STORE,
    method: "POST",
    data: postbody,
  });
};

export const fetchGroupStores = (
  grpId,
  body,
  pageIndex = 0,
  pageSize = 10
) => () => {
  return axiosInstance({
    url: `/core/group/store/${grpId}/stores?page=${
      pageIndex + 1
    }&page_size=${pageSize}`,
    method: "POST",
    data: body,
  });
};

export const fetchUpdatedChangeSummaryForSuperUser = (store_code) => () => {
  return axiosInstance({
    url: `${GET_UPDATED_NEW_STORE_SUMMARY_FOR_SUPER_USER}/${store_code}`,
    method: "GET",
  });
};

export const confirmApprovalOfStore = (postbody) => () => {
  return axiosInstance({
    url: `${CONFIRM_APPROVAL_OF_STORE}`,
    method: "POST",
    data: postbody,
  });
};

export default sisterStoreMappingService.reducer;
