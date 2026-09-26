import { createSlice } from "@reduxjs/toolkit";
import {
  STORE_CAPACITY_TABLE_CONFIG,
  STORE_CAPACITY_DATA,
  UPDATE_STORE_CAPACITY_DATA,
  BULK_UPDATE_ALLOCATED_UNITS,
  STORE_CAPACITY_POPUP_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartFinalizeStoreCapacityService = createSlice({
  name: "inventorySmartFinalizeProductViewService",
  initialState: {
    storeCapacitySummaryLoader: false,
    storeCapactiyEditLoader: false,
    planType: null,
    storeCapacityTableConfig: [],
    storeCapacityTableData: [],
  },
  reducers: {
    setStoreCapactiySummaryLoader: (state, action) => {
      state.storeCapacitySummaryLoader = action.payload;
    },
    setStoreCapactiyEditLoader: (state, action) => {
      state.storeCapactiyEditLoader = action.payload;
    },
    setStoreCapacityTableConfiguration: (state, action) => {
      state.storeCapacityTableConfig = action.payload;
    },
    setStoreCapacityTableData: (state, action) => {
      state.storeCapacityTableData = action.payload;
    },
    setStoreCapacityPlanType: (state, action) => {
      state.planType = action.payload;
    },
    resetStoreCapacityState: (state, _action) => {
      state.storeCapacitySummaryLoader = false;
      state.storeCapactiyEditLoader = false;
      state.planType = null;
      state.storeCapacityTableConfig = [];
      state.storeCapacityTableData = [];
    },
  },
});

export const {
  setStoreCapactiySummaryLoader,
  setStoreCapactiyEditLoader,
  setStoreCapacityTableConfiguration,
  setStoreCapacityTableData,
  setStoreCapacityPlanType,
  resetStoreCapacityState,
} = inventorySmartFinalizeStoreCapacityService.actions;

export const getStoreCapacityTableConfig = (postBody) => () => {
  return axiosInstance({
    url: STORE_CAPACITY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getStoreCapacityTableData = (postBody, isV3) => () => {
  return axiosInstance({
    url: STORE_CAPACITY_DATA,
    method: "POST",
    data: postBody,
    isV3,
  });
};
export const getStoreCapacityTablePopupData = (postBody, isV3) => () => {
  return axiosInstance({
    url: STORE_CAPACITY_POPUP_DATA,
    method: "POST",
    data: postBody,
    isV3,
  });
};
export const updateStoreCapacityTableData = (postBody, isV3) => () => {
  return axiosInstance({
    url: BULK_UPDATE_ALLOCATED_UNITS,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export default inventorySmartFinalizeStoreCapacityService.reducer;
