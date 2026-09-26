import { createSlice } from "@reduxjs/toolkit";
import {
  GET_ORDER_BATCHING_SUMMARY_TABLE_CONFIG,
  GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_CONFIG,
  GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_CONFIG,
  GET_ORDER_BATCHING_SUMMARY_TABLE_DATA,
  GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_DATA,
  GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_DATA,
  GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_DATA_UPDATE_MODE,
  GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_DATA_UPDATE_MODE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartOrderBatchingSummaryService = createSlice({
  name: "inventorySmartOrderBatchingSummaryService",
  initialState: {
    inventorysmartOrderBatchingSummaryTableConfigLoader: false,
    inventorysmartOrderBatchingSummaryTableDataLoader: false,
    orderBatchingSummaryStoreDataLoader: false,
    orderBatchingSummaryStyleDataLoader: false,
    orderBatchingSummaryTableConfig: [],
    orderBatchingSummaryTableData: [],
    orderBatchingSummaryStoreTableData: [],
    orderBatchingSummaryStyleTableData: [],
    editModeEnabledOnSummary: false,
    orderBatchingConfig: {},
  },
  reducers: {
    setInventorysmartOrderBatchingSummaryTableConfigLoader: (state, action) => {
      state.inventorysmartOrderBatchingSummaryTableConfigLoader =
        action.payload;
    },
    setInventorysmartOrderBatchingSummaryTableDataLoader: (state, action) => {
      state.inventorysmartOrderBatchingSummaryTableDataLoader = action.payload;
    },
    setOrderBatchingSummaryStoreDataLoader: (state, action) => {
      state.orderBatchingSummaryStoreDataLoader = action.payload;
    },
    setOrderBatchingSummaryStyleDataLoader: (state, action) => {
      state.orderBatchingSummaryStyleDataLoader = action.payload;
    },
    setOrderBatchingSummaryTableConfig: (state, action) => {
      state.orderBatchingSummaryTableConfig = action.payload;
    },
    setOrderBatchingSummaryTableData: (state, action) => {
      state.orderBatchingSummaryTableData = action.payload;
    },
    setOrderBatchingSummaryStoreTableData: (state, action) => {
      state.orderBatchingSummaryStoreTableData = action.payload;
    },
    setOrderBatchingSummaryStyleTableData: (state, action) => {
      state.orderBatchingSummaryStyleTableData = action.payload;
    },
    setEditModeEnabledOnSummary: (state, action) => {
      state.editModeEnabledOnSummary = action.payload;
    },
    setOrderBatchingConfig: (state, action) => {
      state.orderBatchingConfig = action.payload;
    },
    resetOrderBatchingSummaryStoreState: (state) => {
      state.inventorysmartOrderBatchingSummaryTableConfigLoader = false;
      state.inventorysmartOrderBatchingSummaryTableDataLoader = false;
      state.orderBatchingSummaryStoreDataLoader = false;
      state.orderBatchingSummaryStyleDataLoader = false;
      state.orderBatchingSummaryTableConfig = [];
      state.orderBatchingSummaryTableData = [];
      state.orderBatchingSummaryStoreTableData = [];
      state.orderBatchingSummaryStyleTableData = [];
      state.editModeEnabledOnSummary = false;
      state.orderBatchingConfig = {};
    },
  },
});

export const {
  setInventorysmartOrderBatchingSummaryTableConfigLoader,
  setInventorysmartOrderBatchingSummaryTableDataLoader,
  setOrderBatchingSummaryTableConfig,
  setOrderBatchingSummaryTableData,
  resetOrderBatchingSummaryStoreState,
  setOrderBatchingSummaryStoreTableData,
  setOrderBatchingSummaryStyleTableData,
  setOrderBatchingSummaryStoreDataLoader,
  setOrderBatchingSummaryStyleDataLoader,
  setEditModeEnabledOnSummary,
  setOrderBatchingConfig,
} = inventorySmartOrderBatchingSummaryService.actions;

export const getOrderBatchingSummaryTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_SUMMARY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOrderBatchingSummaryStyleTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOrderBatchingSummaryStoreTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOrderBatchingSummaryTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_SUMMARY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrderBatchingSummaryStoreTableData = (postBody) => () => {
  return axiosInstance({
    url: postBody?.is_update_mode
      ? GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_DATA_UPDATE_MODE
      : GET_ORDER_BATCHING_SUMMARY_STORE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrderBatchingSummaryStyleTableData = (postBody) => () => {
  return axiosInstance({
    url: postBody?.is_update_mode
      ? GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_DATA_UPDATE_MODE
      : GET_ORDER_BATCHING_SUMMARY_STYLE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartOrderBatchingSummaryService.reducer;
