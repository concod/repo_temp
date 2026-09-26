import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../../core/Utils/axios";
import {
  GET_RECEIPT_DRAWER_DATA,
  GET_BOP_L3_LEVEL_DATA,
  GET_BOP_CHOICE_LEVEL_DATA,
  GET_PLAN_RECEIPT_DRAWER_VIEW,
  GET_CC_GUIDELINE,
  UPDATE_CC_GUIDELINE,
} from "../../../constants-assortsmart/apiConstants";

export const receiptDrawerBopService = createSlice({
  name: "receiptDrawerBopService",
  initialState: {
    loaderReceiptDrawer: false,
    loaderBOP: false,
  },
  reducers: {
    setReceiptDrawerLoader: (state, action) => {
      state.loaderReceiptDrawer = action.payload;
    },
    setBOPLoader: (state, action) => {
      state.loaderBOP = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setReceiptDrawerLoader,
  setBOPLoader,
} = receiptDrawerBopService.actions;

export const getReceiptDrawerData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_RECEIPT_DRAWER_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getBopL3LevelData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_BOP_L3_LEVEL_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getBopChoiceLevelData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_BOP_CHOICE_LEVEL_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getPlanReceiptDrawerView = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_PLAN_RECEIPT_DRAWER_VIEW,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getCCGuideLineData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_CC_GUIDELINE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const updateCCGuideLineData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_CC_GUIDELINE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

// Selectors

export const receiptDrawerBopServiceSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.bopReceiptDrawerReducer
);

export const loaderReceiptDrawerSelector = createSelector(
  receiptDrawerBopServiceSelector,
  (state) => state.loaderReceiptDrawer
);

export default receiptDrawerBopService.reducer;
