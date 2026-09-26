import { createSlice } from "@reduxjs/toolkit";
import {
  FINALIZE_BATCHING_DATA,
  GET_ORDER_BATCHING_METRICS,
  GET_ORDER_BATCHING_TABLE_CONFIG,
  GET_ORDER_BATCHING_TABLE_DATA,
  UPDATE_ORDER_BATCHING_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartOrderBatchingService = createSlice({
  name: "inventorySmartOrderBatchingService",
  initialState: {
    inventorysmartOrderBatchingFilterLoader: false,
    inventorysmartOrderBatchingTableConfigLoader: false,
    inventorysmartOrderBatchingTableDataLoader: false,
    inventorysmartOrderBatchingMetricsLoader: false,
    inventorysmartUpdateOrderBatchingLoader: false,
    inventorysmartReloadOrderBatchingData: false,
    inventorysmartOrderBatchingFilterElements: [],
    inventorysmartOrderBatchingFilterDependency: [],
    inventorysmartOrderBatchingFilterConfig: [],
    inventorysmartOrderBatchingMetrics: [],
    allocationName: null,
    selectedFilters: [],
    isFiltersValid: false,
    orderBatchingTableConfig: [],
    orderBatchingTableData: [],
  },
  reducers: {
    setInventorysmartOrderBatchingFilterLoader: (state, action) => {
      state.inventorysmartOrderBatchingFilterLoader = action.payload;
    },
    setInventorysmartOrderBatchingTableConfigLoader: (state, action) => {
      state.inventorysmartOrderBatchingTableConfigLoader = action.payload;
    },
    setInventorysmartOrderBatchingTableDataLoader: (state, action) => {
      state.inventorysmartOrderBatchingTableDataLoader = action.payload;
    },
    setInventorysmartOrderBatchingMetricsLoader: (state, action) => {
      state.inventorysmartOrderBatchingMetricsLoader = action.payload;
    },
    setInventorysmartUpdateOrderBatchingLoader: (state, action) => {
      state.inventorysmartUpdateOrderBatchingLoader = action.payload;
    },
    setInventorysmartReloadOrderBatchingData: (state, action) => {
      state.inventorysmartReloadOrderBatchingData = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setInventorysmartOrderBatchingFilterElements: (state, action) => {
      state.inventorysmartOrderBatchingFilterElements = action.payload;
    },
    setInventorysmartOrderBatchingFilterDependency: (state, action) => {
      state.inventorysmartOrderBatchingFilterDependency = action.payload;
    },
    setInventorysmartOrderBatchingFilterConfig: (state, action) => {
      state.inventorysmartOrderBatchingFilterConfig = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setOrderBatchingTableConfig: (state, action) => {
      state.orderBatchingTableConfig = action.payload;
    },
    setOrderBatchingTableData: (state, action) => {
      state.orderBatchingTableData = action.payload;
    },
    setInventorysmartOrderBatchingMetrics: (state, action) => {
      state.inventorysmartOrderBatchingMetrics = action.payload;
    },
    setAllocationName: (state, action) => {
      state.allocationName = action.payload;
    },
    resetOrderBatchingStoreState: (state) => {
      state.inventorysmartOrderBatchingFilterLoader = false;
      state.inventorysmartOrderBatchingTableConfigLoader = false;
      state.inventorysmartOrderBatchingTableDataLoader = false;
      state.inventorysmartOrderBatchingMetricsLoader = false;
      state.inventorysmartUpdateOrderBatchingLoader = false;
      state.inventorysmartReloadOrderBatchingData = false;
      state.inventorysmartOrderBatchingFilterElements = [];
      state.inventorysmartOrderBatchingFilterDependency = [];
      state.inventorysmartOrderBatchingMetrics = [];
      state.inventorysmartOrderBatchingFilterConfig = [];
      state.allocationName = null;
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.orderBatchingTableConfig = [];
      state.orderBatchingTableData = [];
    },
  },
});

export const {
  setInventorysmartOrderBatchingFilterLoader,
  setInventorysmartOrderBatchingTableConfigLoader,
  setInventorysmartOrderBatchingTableDataLoader,
  setInventorysmartOrderBatchingMetricsLoader,
  setInventorysmartUpdateOrderBatchingLoader,
  setInventorysmartReloadOrderBatchingData,
  setSelectedFilters,
  setInventorysmartOrderBatchingFilterElements,
  setInventorysmartOrderBatchingFilterDependency,
  setInventorysmartOrderBatchingFilterConfig,
  setIsFiltersValid,
  setOrderBatchingTableConfig,
  setOrderBatchingTableData,
  setInventorysmartOrderBatchingMetrics,
  setAllocationName,
  resetOrderBatchingStoreState,
} = inventorySmartOrderBatchingService.actions;

export const getOrderBatchingTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOrderBatchingTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrderBatchingMetrics = (postBody) => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_METRICS,
    method: "POST",
    data: postBody,
  });
};

export const updateOrderBatchingData = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_ORDER_BATCHING_DATA,
    method: "POST",
    data: postBody,
  });
};

export const finalizeOrderBatchingData = (postBody) => () => {
  return axiosInstance({
    url: FINALIZE_BATCHING_DATA,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartOrderBatchingService.reducer;
