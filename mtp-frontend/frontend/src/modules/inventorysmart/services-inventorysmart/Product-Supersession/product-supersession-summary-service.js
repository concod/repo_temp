import { createSlice } from "@reduxjs/toolkit";
import {
  FETCH_TABLE_CONFIG,
  GET_SUPERSESSION_MAPPED_PRODUCTS,
  GET_SUPERSESSION_PRODUCTS_PRIORITY_REVIEW_DATA,
  REMOVE_SUPERSESSION_MAPPED_PRODUCTS,
  SUPERSESSION_CHECK_DOWNLOAD_REQUEST,
  UPLOAD_FILE,
  UPLOAD_FILE_SUPER_SESSION,
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

export const supersessionCheckDownload = (postbody) => () => {
  return axiosInstance({
    url: `${SUPERSESSION_CHECK_DOWNLOAD_REQUEST}`,
    method: "POST",
    data: postbody,
  });
};

export const getProductSupersessionPriorityReviewData = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPERSESSION_PRODUCTS_PRIORITY_REVIEW_DATA,
    method: "POST",
    data: postBody,
  });
};

export const removeProductSupersessionMappings = (body) => () => {
  return axiosInstance({
    url: REMOVE_SUPERSESSION_MAPPED_PRODUCTS,
    method: "DELETE",
    data: body,
  });
};

export const uploadSupeSessionFile = (postbody) => () => {
  return axiosInstance({
    url: `${UPLOAD_FILE_SUPER_SESSION}/supersession`,
    method: "POST",
    data: postbody,
  });
};

export default inventorySmartProductSupersessionSummaryService.reducer;
