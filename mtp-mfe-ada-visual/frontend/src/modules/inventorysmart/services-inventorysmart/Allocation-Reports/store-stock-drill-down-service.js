import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_STORE_STOCK_DRILL_DOWN_LIST,
  GET_STORE_STOCK_DRILL_DOWN_SIZE_DETAILS,
  GET_STORE_STOCK_DRILL_DOWN_SIZE_LEVEL_TABLE_DETAILS,
  GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const storeStockDrillDownService = createSlice({
  name: "storeStockDrillDownService",
  initialState: {
    stockDrillDownTableLoader: false,
    stockDrillDownTableData: [],
    stockDrillDownFilterConfiguration: [],
  },
  reducers: {
    setStockDrillDownTableLoader: (state, action) => {
      state.stockDrillDownTableLoader = action.payload;
    },
    setStockDrillDownTableData: (state, action) => {
      state.stockDrillDownTableData = action.payload;
    },
    setStockDrillDownFilterConfiguration: (state, action) => {
      state.stockDrillDownFilterConfiguration = action.payload;
    },
    clearStoreStockDrillDownStates: (state) => {
      state.stockDrillDownTableData = [];
      state.stockDrillDownFilterConfiguration = [];
    },
  },
});

export const {
  setStockDrillDownTableData,
  setStockDrillDownFilterConfiguration,
  clearStoreStockDrillDownStates,
  setStockDrillDownTableLoader,
} = storeStockDrillDownService.actions;

export const getStockDrillDownTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_LIST,
    method: "POST",
    data: postbody,
  });
};

export const getStockDrillDownSizeDetails = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_SIZE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getStoreStockStoreTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getStoreStockSizeTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_SIZE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export default storeStockDrillDownService.reducer;
