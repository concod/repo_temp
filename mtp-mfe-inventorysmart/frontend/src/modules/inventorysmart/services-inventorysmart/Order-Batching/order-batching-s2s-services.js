import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  GET_S2S_ORDER_BATCHING_SUMMARY_STORE_TABLE_CONFIG,
  GET_S2S_ORDER_BATCHING_SUMMARY_STYLE_TABLE_CONFIG,
  GET_S2S_ORDER_BATCHING_TABLE_CONFIG,
  GET_S2S_ORDER_BATCHING_SUMMARY_STORE_DATA,
  GET_S2S_ORDER_BATCHING_SUMMARY_STYLE_DATA,
  GET_S2S_ORDER_BATCHING_TABLE_DATA,
  GET_S2S_ORDER_BATCHING_METRICS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const inventorySmartOrderBatchingS2SService = createSlice({
  name: "inventorySmartOrderBatchingS2SService",
  initialState: {
    s2sTableConfigLoader: false,
    s2sTableDataLoader: false,
    s2sToggleLoader: false,
    s2sReloadData: false,
    s2sFilterDependency: [],
    s2sMetrics: [],
    s2sSelectedFilters: [],
    s2sIsFiltersValid: false,
    s2sTableData: [],
    s2sCacheKey: null,
    s2sSummaryStoreConfigLoader: false,
    s2sSummaryStoreDataLoader: false,
    s2sSummaryStoreTableData: [],
    s2sSummaryStyleConfigLoader: false,
    s2sSummaryStyleDataLoader: false,
    s2sSummaryStyleTableData: [],
    s2sFiltersFromS2S: [],
  },
  reducers: {
    setS2STableConfigLoader: (state, action) => {
      state.s2sTableConfigLoader = action.payload;
    },
    setS2STableDataLoader: (state, action) => {
      state.s2sTableDataLoader = action.payload;
    },
    setS2SToggleLoader: (state, action) => {
      state.s2sToggleLoader = action.payload;
    },
    setS2SReloadData: (state, action) => {
      state.s2sReloadData = action.payload;
    },
    setS2SFilterDependency: (state, action) => {
      state.s2sFilterDependency = action.payload;
    },
    setS2SFiltersFromS2S: (state, action) => {
      state.s2sFiltersFromS2S = action.payload;
    },
    setS2SMetrics: (state, action) => {
      state.s2sMetrics = action.payload;
    },
    setS2SSelectedFilters: (state, action) => {
      state.s2sSelectedFilters = action.payload;
    },
    setS2SIsFiltersValid: (state, action) => {
      state.s2sIsFiltersValid = action.payload;
    },
    setS2STableData: (state, action) => {
      state.s2sTableData = action.payload;
    },
    setS2SCacheKey: (state, action) => {
      state.s2sCacheKey = action.payload;
    },
    setS2SSummaryStoreConfigLoader: (state, action) => {
      state.s2sSummaryStoreConfigLoader = action.payload;
    },
    setS2SSummaryStoreDataLoader: (state, action) => {
      state.s2sSummaryStoreDataLoader = action.payload;
    },
    setS2SSummaryStoreTableData: (state, action) => {
      state.s2sSummaryStoreTableData = action.payload;
    },
    setS2SSummaryStyleConfigLoader: (state, action) => {
      state.s2sSummaryStyleConfigLoader = action.payload;
    },
    setS2SSummaryStyleDataLoader: (state, action) => {
      state.s2sSummaryStyleDataLoader = action.payload;
    },
    setS2SSummaryStyleTableData: (state, action) => {
      state.s2sSummaryStyleTableData = action.payload;
    },
    resetS2SOrderBatchingState: (state) => {
      state.s2sTableConfigLoader = false;
      state.s2sTableDataLoader = false;
      state.s2sToggleLoader = false;
      state.s2sReloadData = false;
      state.s2sMetrics = [];
      state.s2sSelectedFilters = [];
      state.s2sIsFiltersValid = false;
      state.s2sTableData = [];
      state.s2sSummaryStoreConfigLoader = false;
      state.s2sSummaryStoreDataLoader = false;
      state.s2sSummaryStoreTableData = [];
      state.s2sSummaryStyleConfigLoader = false;
      state.s2sSummaryStyleDataLoader = false;
      state.s2sSummaryStyleTableData = [];
    },
  },
});

export const {
  setS2STableConfigLoader,
  setS2STableDataLoader,
  setS2SToggleLoader,
  setS2SReloadData,
  setS2SFilterDependency,
  setS2SMetrics,
  setS2SSelectedFilters,
  setS2SIsFiltersValid,
  setS2STableData,
  setS2SCacheKey,
  setS2SFiltersFromS2S,
  resetS2SOrderBatchingState,
  setS2SSummaryStoreConfigLoader,
  setS2SSummaryStoreDataLoader,
  setS2SSummaryStoreTableData,
  setS2SSummaryStyleConfigLoader,
  setS2SSummaryStyleDataLoader,
  setS2SSummaryStyleTableData,
} = inventorySmartOrderBatchingS2SService.actions;

// API calls for S2S Order Batching
export const getS2SOrderBatchingMetrics = (postBody) => () => {
  return axiosInstance({
    url: GET_S2S_ORDER_BATCHING_METRICS,
    method: "POST",
    data: postBody,
  });
};

export const getS2SSummaryStoreTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_S2S_ORDER_BATCHING_SUMMARY_STORE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getS2SSummaryStyleTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_S2S_ORDER_BATCHING_SUMMARY_STYLE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getS2SSummaryStoreTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_S2S_ORDER_BATCHING_SUMMARY_STORE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getS2SSummaryStyleTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_S2S_ORDER_BATCHING_SUMMARY_STYLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getS2SOrderBatchingTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_S2S_ORDER_BATCHING_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartOrderBatchingS2SService.reducer;
