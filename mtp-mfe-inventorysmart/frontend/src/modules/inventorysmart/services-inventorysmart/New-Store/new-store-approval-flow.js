import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  APPROVAL_FLOW_RESERVE_LIST,
  APPROVAL_FLOW_STORE_LIST,
  RESERVE_DEMAND_EDIT,
  APPROVE_NEW_STORE_PRODUCTS
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
      state.newStoreApprovalFlowDetails = [];
      state.newStoreApprovalFlowReservedProducts = [];
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
    url: APPROVE_NEW_STORE_PRODUCTS,
    method: "POST",
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

export default newStoreApprovalFlowService.reducer;
