import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  APPROVAL_FLOW_RESERVE_LIST,
  APPROVAL_FLOW_STORE_LIST,
  DOWNLOAD_NEW_STORE_MAPPED_PRODUCTS,
  FETCH_NEW_STORE_MAPPED_PRODUCTS,
  RESERVE_DEMAND_EDIT,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const newStoreApprovalFlowService = createSlice({
  name: "newStoreApprovalFlowService",
  initialState: {
    newStoreApprovalFlowLoader: false,
    newStoreApprovalFlowDetails: [],
    newStoreApprovalFlowReservedProducts: [],
  },
  reducers: {
    setNewStoreApprovalFlowLoader: (state, action) => {
      state.newStoreApprovalFlowLoader = action.payload;
    },
    setNewStoreApprovalFlowDetails: (state, action) => {
      state.newStoreApprovalFlowDetails = action.payload;
    },
    setNewStoreApprovalFlowReservedProducts: (state, action) => {
      state.newStoreApprovalFlowReservedProducts = action.payload;
    },
    clearNewStoreApprovalFlowStates: (state) => {
      state.newStoreApprovalFlowLoader = false;
      state.newStoreDetails = [];
      state.newStoreReservedProducts = [];
    },
  },
});

export const {
  setNewStoreApprovalFlowLoader,
  clearNewStoreApprovalFlowStates,
  setNewStoreApprovalFlowDetails,
  setNewStoreApprovalFlowReservedProducts,
} = newStoreApprovalFlowService.actions;

export const fetchApprovalFlowReserveList = (id) => () => {
  return axiosInstance({
    url: APPROVAL_FLOW_RESERVE_LIST + "/" + id,
    method: "GET",
  });
};

export const fetchApprovalFlowStoreList = (id) => () => {
  return axiosInstance({
    url: APPROVAL_FLOW_STORE_LIST + "/" + id,
    method: "GET",
  });
};

export const reserveListOfArticles = (body) => () => {
  return axiosInstance({
    url: APPROVAL_FLOW_RESERVE_LIST,
    method: "PATCH",
    data: body,
  });
};

export const reserveDemandEdited = (body) => () => {
  return axiosInstance({
    url: RESERVE_DEMAND_EDIT,
    method: "PATCH",
    data: body,
  });
};

export const fetchNewStoreMappedProducts = (storeCode, body) => () => {
  return axiosInstance({
    url: FETCH_NEW_STORE_MAPPED_PRODUCTS + "/" + storeCode,
    method: "POST",
    data: body,
  });
};

export const downloadNewStoreMappedProducts = (body) => () => {
  return axiosInstance({
    url: DOWNLOAD_NEW_STORE_MAPPED_PRODUCTS,
    method: "POST",
    data: body,
  });
};

export default newStoreApprovalFlowService.reducer;
