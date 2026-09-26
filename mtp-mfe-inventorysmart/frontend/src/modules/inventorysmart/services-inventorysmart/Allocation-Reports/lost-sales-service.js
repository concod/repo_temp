import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_LOST_SALES_LIST_OF_WEEKS,
  GET_LOST_SALES_TABLE_DATA,
  GET_REPORT_DOWNLOAD_REQUEST,
  CHECK_DOWNLOAD_REQUEST,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const allocationLostSalesService = createSlice({
  name: "allocationLostSalesService",
  initialState: {
    lostSalesScreenLoader: false,
    lostSalesFiscalWeeks: [],
    lostSalesFilterConfig: [],
    lostSalesTableData: [],
    isFiltersValid: false,
    selectedFilters: null,
  },
  reducers: {
    setLostSalesScreenLoader: (state, action) => {
      state.lostSalesScreenLoader = action.payload;
    },
    setLostSalesFiscalWeeksList: (state, action) => {
      state.lostSalesFiscalWeeks = action.payload;
    },
    setLostSalesTableData: (state, action) => {
      state.lostSalesTableData = action.payload;
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
      state.lostSalesFiscalWeeks = [];
      state.lostSalesFilterConfig = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
    },
  },
});

export const {
  setLostSalesScreenLoader,
  setLostSalesFiscalWeeksList,
  setLostSalesTableData,
  setLostSalesFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  clearLostSalesStates,
} = allocationLostSalesService.actions;

export const getLostSalesFiscalWeek = (postbody) => () => {
  return axiosInstance({
    url: GET_LOST_SALES_LIST_OF_WEEKS,
    method: "POST",
    data: postbody,
  });
};

export const getLostSalesTableData = (payload) => () => {
  return axiosInstance({
    url: GET_LOST_SALES_TABLE_DATA,
    method: "POST",
    data: payload,
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
