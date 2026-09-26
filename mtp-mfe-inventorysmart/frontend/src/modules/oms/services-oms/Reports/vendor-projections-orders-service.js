import axiosInstance from "core/Utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import {
  ORDERS_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  ORDERS_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
  ORDERS_TOTAL_PROJECTIONS_GRAPH,
  ORDERS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  ORDERS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
  ORDERS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_CONFIG,
  ORDERS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_DATA,
} from "modules/oms/constants-oms/apiConstants";
import {
  VENDOR_STORE_ORDERS_VENDOR_LEVEL_TABLE_CONFIG,
  VENDOR_STORE_ORDERS_VENDOR_LEVEL_TABLE_DATA,
  VENDOR_STORE_ORDERS_TOTAL_PROJECTIONS_GRAPH,
  VENDOR_STORE_ORDERS_SKU_VENDOR_LEVEL_TABLE_CONFIG,
  VENDOR_STORE_ORDERS_SKU_VENDOR_LEVEL_TABLE_DATA,
  VENDOR_STORE_ORDERS_DC_SIZE_LEVEL_TABLE_CONFIG,
  VENDOR_STORE_ORDERS_DC_SIZE_LEVEL_TABLE_DATA,
} from "modules/oms/constants-oms/apiConstants";

const getIsCalledFromVendorStoreAndCleanup = (postbody) => {
  const isCalledFromVendorStore = postbody?.isCalledFromVendorStore ?? false;
  if (postbody && typeof postbody === "object") {
    delete postbody.isCalledFromVendorStore;
  }
  return isCalledFromVendorStore;
};
export const reportsVendorProjectionsOrdersService = createSlice({
  name: "reportsVendorProjectionsOrdersService",
  initialState: {
    ordersScreenLoader: false,
    ordersDataLoader: false,
    ordersFiscalWeekGraph: [],
    ordersFilterConfig: [],
    ordersVendorTableConfigLoader: false,
    ordersVendorTableDataLoader: false,
    ordersVendorTableData: [],
    ordersVendorSkuTableConfigLoader: false,
    ordersVendorSkuTableDataLoader: false,
    ordersVendorSkuTableData: [],
    isFiltersValid: false,
    selectedFilters: null,
    ordersFilterElements: [],
    ordersFilterDependency: [],
    ordersFilterLoader: false,
  },
  reducers: {
    setOrdersFilterElements: (state, action) => {
      state.ordersFilterElements = action.payload;
    },
    setOrdersFilterDependency: (state, action) => {
      state.ordersFilterDependency = action.payload;
    },
    setOrdersFilterLoader: (state, action) => {
      state.ordersFilterLoader = action.payload;
    },

    setOrdersScreenLoader: (state, action) => {
      state.ordersScreenLoader = action.payload;
    },
    setOrdersDataLoader: (state, action) => {
      state.ordersDataLoader = action.payload;
    },
    setOrdersFiscalGraphData: (state, action) => {
      state.ordersFiscalWeekGraph = action.payload;
    },

    setOrdersVendorTableConfigLoader: (state, action) => {
      state.ordersVendorTableConfigLoader = action.payload;
    },
    setOrdersVendorTableDataLoader: (state, action) => {
      state.ordersVendorTableDataLoader = action.payload;
    },
    setOrdersVendorTableData: (state, action) => {
      state.ordersVendorTableData = action.payload;
    },

    setOrdersVendorSkuTableConfigLoader: (state, action) => {
      state.ordersVendorSkuTableConfigLoader = action.payload;
    },
    setOrdersVendorSkuTableDataLoader: (state, action) => {
      state.ordersVendorSkuTableDataLoader = action.payload;
    },
    setOrdersVendorSkuTableData: (state, action) => {
      state.ordersVendorSkuTableData = action.payload;
    },

    setOrdersFilterConfig: (state, action) => {
      state.ordersFilterConfig = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearOrdersStates: (state) => {
      state.ordersFilterElements = [];
      state.ordersFilterDependency = [];
      state.ordersFilterLoader = false;
      state.ordersScreenLoader = false;
      state.ordersDataLoader = false;
      state.ordersFiscalWeekGraph = [];
      state.ordersFilterConfig = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.ordersVendorTableData = [];
      state.ordersVendorTableDataLoader = false;
      state.ordersVendorTableConfigLoader = false;
      state.ordersVendorSkuTableData = [];
      state.ordersVendorSkuTableDataLoader = false;
      state.ordersVendorSkuTableConfigLoader = false;
    },
  },
});

export const {
  setOrdersScreenLoader,
  setOrdersDataLoader,
  setOrdersFiscalGraphData,
  setOrdersVendorTableConfigLoader,
  setOrdersVendorTableDataLoader,
  setOrdersVendorTableData,
  setOrdersVendorSkuTableConfigLoader,
  setOrdersVendorSkuTableDataLoader,
  setOrdersVendorSkuTableData,
  setOrdersFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  setOrdersFilterElements,
  setOrdersFilterDependency,
  setOrdersFilterLoader,
  clearOrdersStates,
} = reportsVendorProjectionsOrdersService.actions;

export const getOrdersFiscalWeekGraph = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_ORDERS_TOTAL_PROJECTIONS_GRAPH
      : ORDERS_TOTAL_PROJECTIONS_GRAPH,
    method: "POST",
    data: postbody,
  });
};

export const getOrdersVendorLevelTableConfig = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_ORDERS_VENDOR_LEVEL_TABLE_CONFIG
      : ORDERS_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getOrdersVendorLevelTableData = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_ORDERS_VENDOR_LEVEL_TABLE_DATA
      : ORDERS_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getOrdersVendorSkuLevelTableConfig = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_ORDERS_SKU_VENDOR_LEVEL_TABLE_CONFIG
      : ORDERS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getOrdersVendorSkuLevelTableData = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_ORDERS_SKU_VENDOR_LEVEL_TABLE_DATA
      : ORDERS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getOrdersDCSizeLevelProjectionsTableConfig = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_ORDERS_DC_SIZE_LEVEL_TABLE_CONFIG
      : ORDERS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getOrdersDCSizeLevelProjectionsTableData = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_ORDERS_DC_SIZE_LEVEL_TABLE_DATA
      : ORDERS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export default reportsVendorProjectionsOrdersService.reducer;
