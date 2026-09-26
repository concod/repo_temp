import { createSlice } from "@reduxjs/toolkit";
import {
  FETCH_TABLE_CONFIG,
  GET_SUPERSESSION_MAPPED_PRODUCTS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartProductSupersessionSummaryService = createSlice({
  name: "inventorySmartProductSupersessionSummaryService",
  initialState: {
    inventorysmartProductSupersessionTableLoader: false,
    inventorysmartProductSupersessionSummaryLoader: false,
  },
  reducers: {
    setInventorysmartProductSupersessionTableLoader: (state, action) => {
      state.inventorysmartProductSupersessionTableLoader = action.payload;
    },
    setInventorysmartProductSupersessionSummaryLoader: (state, action) => {
      state.inventorysmartProductSupersessionSummaryLoader = action.payload;
    },
    resetProductSupersessionSummaryStore: (state, _action) => {
      state.inventorysmartProductSupersessionTableLoader = false;
      state.inventorysmartProductSupersessionSummaryLoader = false;
    },
  },
});

export const {
  setInventorysmartProductSupersessionTableLoader,
  setInventorysmartProductSupersessionSummaryLoader,
  resetProductSupersessionSummaryStore,
} = inventorySmartProductSupersessionSummaryService.actions;

export const getProductSupersessionSummaryTableConfig = (postBody) => () => {
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export const getProductSupersessionSummaryData = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPERSESSION_MAPPED_PRODUCTS,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartProductSupersessionSummaryService.reducer;
