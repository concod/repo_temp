import { createSlice } from "@reduxjs/toolkit";
import {
  AUTO_FINALIZE_BATCHING_DATA,
  FINALIZE_BATCHING_DATA,
  GET_ALLOCATION_PLANS,
  GET_ORDER_BATCHING_METRICS,
  GET_ORDER_BATCHING_METRICS_UPDATE_MODE,
  GET_ORDER_BATCHING_TABLE_CONFIG,
  PREPARE_ORDER_BATCHING_BASE_DATA,
  GET_ORDER_BATCHING_TABLE_DATA,
  GET_ORDER_BATCHING_TABLE_DATA_UPDATE_MODE,
  UPDATE_ORDER_BATCHING_DATA,
  GET_ORDER_BATCHING_TABLE_STYLE_STORE_DATA,
  FETCH_LOCK_STATUS,
  RELEASE_LOCK,
  GET_ORDER_BATCHING_SUMMARY,
  UPDATE_TOGGLE_API,
  RESET_ALL_TABLES_TO_DEFAULT,
  SAVE_ORDER_BATCHING_SESSION,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";
import { GET_OUTBOUND_EXPORT } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const inventorySmartOrderBatchingService = createSlice({
  name: "inventorySmartOrderBatchingService",
  initialState: {
    inventorysmartOrderBatchingFilterLoader: false,
    inventorysmartOrderBatchingTableConfigLoader: false,
    inventorysmartOrderBatchingTableDataLoader: false,
    inventorysmartOrderBatchingMetricsLoader: false,
    inventorysmartOrderBatchingToggleLoader: false,
    inventorysmartUpdateOrderBatchingLoader: false,
    inventorysmartReloadOrderBatchingData: false,
    inventorysmartOrderBatchingFilterElements: [],
    inventorysmartOrderBatchingFilterDependency: [],
    inventorysmartOrderBatchingFilterConfig: [],
    inventorysmartOrderBatchingMetrics: [],
    inventorysmartOrderBatchingIconConfig: null,
    orderBatchingFilterDetails: {},
    selectedFiltersInOrderBatching: {},
    allocationName: null,
    selectedFilters: [],
    isFiltersValid: false,
    orderBatchingTableConfig: [],
    orderBatchingTableData: [],
    cache_key: null,
    cacheKeyPrepared: false,
    cacheKeyPreparedAt: null,
    editModeEnabledOnDetails: false,
    displaySummaryOnUpdate: {},
    backButtonClicked: false,
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
    setInventorysmartOrderBatchingToggleLoader: (state, action) => {
      state.inventorysmartOrderBatchingToggleLoader = action.payload;
    },
    setInventorysmartUpdateOrderBatchingLoader: (state, action) => {
      state.inventorysmartUpdateOrderBatchingLoader = action.payload;
    },
    setInventorysmartReloadOrderBatchingData: (state, action) => {
      state.inventorysmartReloadOrderBatchingData = action.payload;
    },
    setInventorysmartOrderBatchingIconConfig: (state, action) =>{
      state.inventorysmartOrderBatchingIconConfig = action.payload;
    },
    setOrderBatchingFilterDetails:(state, action)=>{
      state.orderBatchingFilterDetails = action.payload
    },
    setSelectedFiltersInOrderBatching: (state, action) => {
      state.selectedFiltersInOrderBatching = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setCacheKey: (state, action) => {
      state.cache_key = action.payload;
    },
    setCacheKeyPrepared: (state, action) => {
      state.cacheKeyPrepared = action.payload;
    },
    setCacheKeyPreparedAt: (state, action) => {
      state.cacheKeyPreparedAt = action.payload;
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
    setEditModeEnabledOnDetails: (state, action) => {
      state.editModeEnabledOnDetails = action.payload;
    },
    setDisplaySummaryOnUpdate: (state, action) => {
      state.displaySummaryOnUpdate = action.payload;
    },
    setBackButtonClicked: (state, action) => {
      state.backButtonClicked = action.payload;
    },
    resetOrderBatchingStoreState: (state) => {
      state.inventorysmartOrderBatchingFilterLoader = false;
      state.inventorysmartOrderBatchingTableConfigLoader = false;
      state.inventorysmartOrderBatchingTableDataLoader = false;
      state.inventorysmartOrderBatchingMetricsLoader = false;
      state.inventorysmartOrderBatchingToggleLoader = false;
      state.inventorysmartUpdateOrderBatchingLoader = false;
      state.inventorysmartReloadOrderBatchingData = false;
      state.inventorysmartOrderBatchingFilterElements = [];
      // state.inventorysmartOrderBatchingFilterDependency = [];
      state.inventorysmartOrderBatchingMetrics = [];
      state.inventorysmartOrderBatchingFilterConfig = [];
      state.inventorysmartOrderBatchingIconConfig=null;
      state.allocationName = null;
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.orderBatchingTableConfig = [];
      state.orderBatchingTableData = [];
      state.editModeEnabledOnDetails = false;
      state.displaySummaryOnUpdate = {};
      state.backButtonClicked = false;
      state.cacheKeyPrepared = false;
      state.cacheKeyPreparedAt = null;
    },
  },
});

export const {
  setInventorysmartOrderBatchingFilterLoader,
  setInventorysmartOrderBatchingTableConfigLoader,
  setInventorysmartOrderBatchingTableDataLoader,
  setInventorysmartOrderBatchingMetricsLoader,
  setInventorysmartOrderBatchingToggleLoader,
  setInventorysmartUpdateOrderBatchingLoader,
  setInventorysmartReloadOrderBatchingData,
  setSelectedFilters,
  setCacheKey,
  setCacheKeyPrepared,
  setCacheKeyPreparedAt,
  setInventorysmartOrderBatchingFilterElements,
  setInventorysmartOrderBatchingFilterDependency,
  setInventorysmartOrderBatchingFilterConfig,
  setInventorysmartOrderBatchingIconConfig,
  setOrderBatchingFilterDetails,
  setSelectedFiltersInOrderBatching,
  setIsFiltersValid,
  setOrderBatchingTableConfig,
  setOrderBatchingTableData,
  setInventorysmartOrderBatchingMetrics,
  setAllocationName,
  resetOrderBatchingStoreState,
  setEditModeEnabledOnDetails,
  setDisplaySummaryOnUpdate,
  setBackButtonClicked,
} = inventorySmartOrderBatchingService.actions;

export const getOrderBatchingTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_TABLE_CONFIG,
    method: "GET",
  });
};

export const prepareOrderBatchingBaseData = (postBody) => () => {
  return axiosInstance({
    url: PREPARE_ORDER_BATCHING_BASE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrderBatchingTableData = (
  postBody,
  fetchStyleStore = false
) => () => {
  let url = fetchStyleStore
    ? GET_ORDER_BATCHING_TABLE_STYLE_STORE_DATA
    : postBody?.is_update_mode
    ? GET_ORDER_BATCHING_TABLE_DATA_UPDATE_MODE
    : GET_ORDER_BATCHING_TABLE_DATA;
  return axiosInstance({
    url: url,
    method: "POST",
    data: postBody,
  });
};

export const getOrderBatchingMetrics = (postBody) => () => {
  return axiosInstance({
    url: postBody?.is_update_mode
      ? GET_ORDER_BATCHING_METRICS_UPDATE_MODE
      : GET_ORDER_BATCHING_METRICS,
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

export const autoFinalizeOrderBatchingData = (postBody) => () => {
  return axiosInstance({
    url: AUTO_FINALIZE_BATCHING_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getAllAllocationPlans = (postBody) => () => {
  return axiosInstance({
    url: GET_ALLOCATION_PLANS,
    method: "POST",
    data: postBody,
  });
};

export const getOutboundExport = (postBody) => () => {
  return axiosInstance({
    url: GET_OUTBOUND_EXPORT,
    method: "POST",
    data: postBody,
  });
};
export const fetchLockStatus = (postBody) => () => {
  return axiosInstance({
    url: FETCH_LOCK_STATUS,
    method: "POST",
    data: postBody,
  });
};

export const releaseLock = (postBody) => () => {
  return axiosInstance({
    url: RELEASE_LOCK,
    method: "POST",
    data: postBody,
  });
};

export const getOrderBatchingSummary = (postBody) => () => {
  return axiosInstance({
    url: GET_ORDER_BATCHING_SUMMARY,
    method: "PUT",
    data: postBody,
  });
};

export const callUpdateToggleAPI = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_TOGGLE_API,
    method: "POST",
    data: postBody,
  });
};

export const resetAllTablesToDefault = (postBody) => () => {
  return axiosInstance({
    url: RESET_ALL_TABLES_TO_DEFAULT,
    method: "POST",
    data: postBody,
  });
};

export const saveOrderBatchingSession = (postBody) => () => {
  return axiosInstance({
    url: SAVE_ORDER_BATCHING_SESSION,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartOrderBatchingService.reducer;
