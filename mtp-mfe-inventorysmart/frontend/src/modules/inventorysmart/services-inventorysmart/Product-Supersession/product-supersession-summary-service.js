import { createSlice } from "@reduxjs/toolkit";
import {
  FETCH_TABLE_CONFIG,
  GET_SUPERSESSION_MAPPED_PRODUCTS,
  GET_SUPERSESSION_PRODUCTS_PRIORITY_REVIEW_DATA,
  EDIT_PRIORITY_AND_EXCEPTIONS,
  GET_SUPERSESSION_PRODUCTS_MAPPING_REVIEW_DATA
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

export const getProductSupersessionPriorityReviewData = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPERSESSION_PRODUCTS_PRIORITY_REVIEW_DATA,
    method: "POST",
    data: postBody,
  });
};

export const editPriorityAndExceptions = (postBody) => () => {
  return axiosInstance({
    url: EDIT_PRIORITY_AND_EXCEPTIONS,
    method: "POST",
    data: postBody,
  });
};

export const deleteProductSupersessionMappings = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPERSESSION_PRODUCTS_MAPPING_REVIEW_DATA,
    method: "DELETE",
    data: postBody,
  });
};

export default inventorySmartProductSupersessionSummaryService.reducer;
