import { createSlice } from "@reduxjs/toolkit";
import {
  GET_ORDER_BATCHING_SUMMARY_TABLE_CONFIG,
  GET_ORDER_BATCHING_SUMMARY_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartOrderBatchingSummaryService = createSlice({
  name: "inventorySmartOrderBatchingSummaryService",
  initialState: {
    inventorysmartOrderBatchingSummaryTableConfigLoader: false,
    inventorysmartOrderBatchingSummaryTableDataLoader: false,
    orderBatchingSummaryTableConfig: [],
    orderBatchingSummaryTableData: [],
  },
  reducers: {
    setInventorysmartOrderBatchingSummaryTableConfigLoader: (state, action) => {
      state.inventorysmartOrderBatchingSummaryTableConfigLoader =
        action.payload;
    },
    setInventorysmartOrderBatchingSummaryTableDataLoader: (state, action) => {
      state.inventorysmartOrderBatchingSummaryTableDataLoader = action.payload;
    },
    setOrderBatchingSummaryTableConfig: (state, action) => {
      state.orderBatchingSummaryTableConfig = action.payload;
    },
    setOrderBatchingSummaryTableData: (state, action) => {
      state.orderBatchingSummaryTableData = action.payload;
    },
    resetOrderBatchingSummaryStoreState: (state) => {
      state.inventorysmartOrderBatchingSummaryTableConfigLoader = false;
      state.inventorysmartOrderBatchingSummaryTableDataLoader = false;
      state.orderBatchingSummaryTableConfig = [];
      state.orderBatchingSummaryTableData = [];
    },
  },
});

export const {
  setInventorysmartOrderBatchingSummaryTableConfigLoader,
  setInventorysmartOrderBatchingSummaryTableDataLoader,
  setOrderBatchingSummaryTableConfig,
  setOrderBatchingSummaryTableData,
  resetOrderBatchingSummaryStoreState,
} = inventorySmartOrderBatchingSummaryService.actions;

export const getOrderBatchingSummaryTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_SUMMARY_TABLE_CONFIG,
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

export default inventorySmartOrderBatchingSummaryService.reducer;
