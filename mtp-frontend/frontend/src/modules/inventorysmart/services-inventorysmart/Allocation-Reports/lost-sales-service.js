import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_LOST_SALES_GRAPHDATA,
  GET_LOST_SALES_TABLE_DETAILS,
  GET_REPORT_DOWNLOAD_REQUEST,
  GET_LOST_SALES_STORE_LEVEL_TABLE_DETAILS,
  GET_LOST_SALES_SIZE_LEVEL_TABLE_DETAILS,
  CHECK_DOWNLOAD_REQUEST,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const allocationLostSalesService = createSlice({
  name: "allocationLostSalesService",
  initialState: {
    lostSalesScreenLoader: false,
    lostSalesDataLoader: false,
    lostSalesFiscalWeekGraph: [],
    lostSalesFilterConfig: [],
    lostSalesTableDate: [],
    isFiltersValid: false,
    selectedFilters: null,
  },
  reducers: {
    setLostSalesScreenLoader: (state, action) => {
      state.lostSalesScreenLoader = action.payload;
    },
    setLostSalesDataLoader: (state, action) => {
      state.lostSalesDataLoader = action.payload;
    },
    setLostSalesFiscalGraphData: (state, action) => {
      state.lostSalesFiscalWeekGraph = action.payload;
    },
    setLostSalesTableData: (state, action) => {
      state.lostSalesTableDate = action.payload;
    },
    setLostSalesFilterConfig: (state, action) => {
      state.lostSalesFilterConfig = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearLostSalesStates: (state) => {
      state.lostSalesScreenLoader = false;
      state.lostSalesDataLoader = false;
      state.lostSalesFiscalWeekGraph = [];
      state.lostSalesFilterConfig = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
    },
  },
});

export const {
  setLostSalesScreenLoader,
  setLostSalesDataLoader,
  setLostSalesFiscalGraphData,
  setLostSalesTableData,
  setLostSalesFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  clearLostSalesStates,
} = allocationLostSalesService.actions;

export const getLostSalesFiscalWeekGraph = (postbody) => () => {
  return axiosInstance({
    url: GET_LOST_SALES_GRAPHDATA,
    method: "POST",
    data: postbody,
  });
};

export const getLostSalesTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_LOST_SALES_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getLostSalesStoreTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_LOST_SALES_STORE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getLostSalesSizeTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_LOST_SALES_SIZE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const reportDownloadRequest = (screenName, postbody) => () => {
  return axiosInstance({
    url: `${GET_REPORT_DOWNLOAD_REQUEST}?report_type=${screenName}`,
    method: "POST",
    data: postbody,
  });
};

export const checkDownload = (postbody) => () => {
  return axiosInstance({
    url: `${CHECK_DOWNLOAD_REQUEST}`,
    method: "POST",
    data: postbody,
  });
};

export default allocationLostSalesService.reducer;
