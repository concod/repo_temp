import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_IN_STOCK_TABLE_DATA,
  PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG,
  GET_IN_STOCK_KPI,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const inStockService = createSlice({
  name: "inStockService",
  initialState: {
    inStockFilterLoader: false,
    inStockConfigLoader: false,
    inStockPopupConfigLoader: false,
    inStockDataLoader: false,
    inStockStoreViewDataLoader: false,
    inStockTableData: [],
    inStockFilterElements: [],
    inStockFilterDependency: [],
    isFiltersValid: false,
    selectedFilters: null,
  },
  reducers: {
    setInStockFilterLoader: (state, action) => {
      state.inStockFilterLoader = action.payload;
    },
    setInStockConfigLoader: (state, action) => {
      state.inStockConfigLoader = action.payload;
    },
    setInStockPopupConfigLoader: (state, action) => {
      state.inStockPopupConfigLoader = action.payload;
    },
    setInStockDataLoader: (state, action) => {
      state.inStockDataLoader = action.payload;
    },
    setInStockStoreViewDataLoader: (state, action) => {
      state.inStockStoreViewDataLoader = action.payload;
    },
    setInStockTableData: (state, action) => {
      state.inStockTableData = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setInStockFilterElements: (state, action) => {
      state.inStockFilterElements = action.payload;
    },
    setInStockFilterDependency: (state, action) => {
      state.inStockFilterDependency = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearInStockStates: (state) => {
      state.inStockFilterLoader = false;
      state.inStockConfigLoader = false;
      state.inStockPopupConfigLoader = false;
      state.inStockDataLoader = false;
      state.inStockStoreViewDataLoader = false;
      state.inStockTableData = [];
      state.inStockFilterElements = [];
      state.inStockFilterDependency = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.fiscalDates = null;
    },
  },
});

export const {
  setInStockFilterLoader,
  setInStockConfigLoader,
  setInStockPopupConfigLoader,
  setInStockDataLoader,
  setInStockTableData,
  setSelectedFilters,
  setInStockFilterElements,
  setInStockFilterDependency,
  setIsFiltersValid,
  clearInStockStates,
  setInStockStoreViewDataLoader,
} = inStockService.actions;

export const getInStockTableData = (postbody) => () => {
  return axiosInstance({
    url: `${GET_IN_STOCK_TABLE_DATA}/${postbody.type}`,
    method: "POST",
    data: postbody.main,
  });
};

export const getInStockTableConfig = (postBody) => () => {
  return axiosInstance({
    url: `${PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG}?table_name=${postBody}`,
    method: "GET",
  });
};

export const getInStockKPI = (postbody) => () => {
  return axiosInstance({
    url: GET_IN_STOCK_KPI,
    method: "POST",
    data: postbody,
  });
};

export default inStockService.reducer;
