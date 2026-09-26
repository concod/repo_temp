import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  GET_PRODUCT_VIEWS,
  GET_PRODUCT_VIEW_SUMMARY,
  FINALIZE_EDIT_APPLY,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

const initialState = {
  productStoreViewSummaryLoader: false,
  productViewLoader: false,
};

export const inventorySmartNewFlowProductViewService = createSlice({
  name: "inventorySmartNewFlowProductViewService",
  initialState,
  reducers: {
    setProductStoreViewSummaryLoader: (state, action) => {
      state.productStoreViewSummaryLoader = action.payload;
    },
    setProductViewLoader: (state, action) => {
      state.productViewLoader = action.payload;
    },
  },
});

export const {
  setProductStoreViewSummaryLoader,
  setProductViewLoader,
} = inventorySmartNewFlowProductViewService.actions;

export const getProductViewSummary = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_VIEW_SUMMARY,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getProductView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_VIEWS,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const applyEditChanges = (postBody) => () => {
  return axiosInstance({
    url: FINALIZE_EDIT_APPLY,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartNewFlowProductViewService.reducer;
