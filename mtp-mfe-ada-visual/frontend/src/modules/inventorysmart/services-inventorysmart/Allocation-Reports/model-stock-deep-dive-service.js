import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_MODEL_STOCK_DEEP_DIVE_POP_UP_TABLE_CONFIG,
  GET_MODEL_STOCK_DEEP_DIVE_TABLE_DATA,
  PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const modelStockDeepDiveService = createSlice({
  name: "modelStockDeepDiveService",
  initialState: {
    modelStockDeepDiveFilterLoader: false,
    modelStockDeepDiveConfigLoader: false,
    modelStockDeepDivePopupConfigLoader: false,
    modelStockDeepDiveDataLoader: false,
    modelStockDeepDiveStoreDataLoader: false,
    modelStockDeepDiveTableData: [],
    modelStockDeepDiveFilterConfig: [],
    isFiltersValid: false,
    selectedFilters: null,
  },
  reducers: {
    setModelStockDeepDiveFilterLoader: (state, action) => {
      state.modelStockDeepDiveFilterLoader = action.payload;
    },
    setModelStockDeepDiveConfigLoader: (state, action) => {
      state.modelStockDeepDiveConfigLoader = action.payload;
    },
    setModelStockDeepDivePopupConfigLoader: (state, action) => {
      state.modelStockDeepDivePopupConfigLoader = action.payload;
    },
    setModelStockDeepDiveDataLoader: (state, action) => {
      state.modelStockDeepDiveDataLoader = action.payload;
    },
    setModelStockDeepDiveStoreDataLoader: (state, action) => {
      state.modelStockDeepDiveStoreDataLoader = action.payload;
    },
    setModelStockDeepDiveTableData: (state, action) => {
      state.modelStockDeepDiveTableData = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setModelStockDeepDiveFilterConfig: (state, action) => {
      state.modelStockDeepDiveFilterConfig = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearModelStockDeepDiveStates: (state) => {
      state.modelStockDeepDiveFilterLoader = false;
      state.modelStockDeepDiveConfigLoader = false;
      state.modelStockDeepDivePopupConfigLoader = false;
      state.modelStockDeepDiveDataLoader = false;
      state.modelStockDeepDiveStoreDataLoader = false;
      state.modelStockDeepDiveFilterConfig = [];
      state.modelStockDeepDiveTableData = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.fiscalDates = null;
    },
  },
});

export const {
  setModelStockDeepDiveFilterLoader,
  setModelStockDeepDiveConfigLoader,
  setModelStockDeepDivePopupConfigLoader,
  setModelStockDeepDiveDataLoader,
  setModelStockDeepDiveTableData,
  setSelectedFilters,
  setModelStockDeepDiveFilterConfig,
  setIsFiltersValid,
  clearModelStockDeepDiveStates,
  setModelStockDeepDiveStoreDataLoader,
} = modelStockDeepDiveService.actions;

export const getModelStockDeepDiveTableConfig = (postBody) => () => {
  return axiosInstance({
    url: `${PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG}?table_name=${postBody}`,

    method: "GET",
  });
};

export const getModelStockDeepDivePopupTableConfig = () => () => {
  return axiosInstance({
    url: GET_MODEL_STOCK_DEEP_DIVE_POP_UP_TABLE_CONFIG,
    method: "GET",
  });
};

export const getModelStockDeepDiveTableData = (postbody) => () => {
  return axiosInstance({
    url: `${GET_MODEL_STOCK_DEEP_DIVE_TABLE_DATA}/${postbody.tabValue}`,
    method: "POST",
    data: postbody.body,
  });
};

export default modelStockDeepDiveService.reducer;
