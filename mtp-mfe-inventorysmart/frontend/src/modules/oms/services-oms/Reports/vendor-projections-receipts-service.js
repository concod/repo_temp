import axiosInstance from "core/Utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import {
  RECEIPTS_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
  RECEIPTS_PROJECTIONS_GRAPH,
  RECEIPTS_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  RECEIPTS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  RECEIPTS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
  RECEIPTS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_CONFIG,
  RECEIPTS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_DATA,
} from "modules/oms/constants-oms/apiConstants";
import {
  VENDOR_STORE_RECEIPTS_VENDOR_LEVEL_TABLE_DATA,
  VENDOR_STORE_RECEIPTS_PROJECTIONS_GRAPH,
  VENDOR_STORE_RECEIPTS_VENDOR_LEVEL_TABLE_CONFIG,
  VENDOR_STORE_RECEIPTS_SKU_VENDOR_LEVEL_TABLE_CONFIG,
  VENDOR_STORE_RECEIPTS_SKU_VENDOR_LEVEL_TABLE_DATA,
  VENDOR_STORE_RECEIPTS_DC_SIZE_LEVEL_TABLE_CONFIG,
  VENDOR_STORE_RECEIPTS_DC_SIZE_LEVEL_TABLE_DATA,
} from "modules/oms/constants-oms/apiConstants";

const getIsCalledFromVendorStoreAndCleanup = (postbody) => {
  const isCalledFromVendorStore = postbody?.isCalledFromVendorStore ?? false;
  if (postbody && typeof postbody === "object") {
    delete postbody.isCalledFromVendorStore;
  }
  return isCalledFromVendorStore;
};

export const reportsVendorProjectionsReceiptsService = createSlice({
  name: "reportsVendorProjectionsReceiptsService",
  initialState: {
    receiptsScreenLoader: false,
    receiptsDataLoader: false,
    receiptsFiscalWeekGraph: [],
    receiptsFilterConfig: [],
    receiptsVendorTableConfigLoader: false,
    receiptsVendorTableDataLoader: false,
    receiptsVendorTableData: [],
    receiptsVendorSkuTableConfigLoader: false,
    receiptsVendorSkuTableDataLoader: false,
    receiptsVendorSkuTableData: [],
    isFiltersValid: false,
    selectedFilters: null,
    receiptsFilterElements: [],
    receiptsFilterDependency: [],
    receiptsFilterLoader: false,
  },
  reducers: {
    setReceiptsFilterElements: (state, action) => {
      state.receiptsFilterElements = action.payload;
    },
    setReceiptsFilterDependency: (state, action) => {
      state.receiptsFilterDependency = action.payload;
    },
    setReceiptsFilterLoader: (state, action) => {
      state.receiptsFilterLoader = action.payload;
    },

    setReceiptsScreenLoader: (state, action) => {
      state.receiptsScreenLoader = action.payload;
    },
    setReceiptsDataLoader: (state, action) => {
      state.receiptsDataLoader = action.payload;
    },
    setReceiptsFiscalGraphData: (state, action) => {
      state.receiptsFiscalWeekGraph = action.payload;
    },

    setReceiptsVendorTableConfigLoader: (state, action) => {
      state.receiptsVendorTableConfigLoader = action.payload;
    },
    setReceiptsVendorTableDataLoader: (state, action) => {
      state.receiptsVendorTableDataLoader = action.payload;
    },
    setReceiptsVendorTableData: (state, action) => {
      state.receiptsVendorTableData = action.payload;
    },

    setReceiptsVendorSkuTableConfigLoader: (state, action) => {
      state.receiptsVendorSkuTableConfigLoader = action.payload;
    },
    setReceiptsVendorSkuTableDataLoader: (state, action) => {
      state.receiptsVendorSkuTableDataLoader = action.payload;
    },
    setReceiptsVendorSkuTableData: (state, action) => {
      state.receiptsVendorSkuTableData = action.payload;
    },

    setReceiptsFilterConfig: (state, action) => {
      state.receiptsFilterConfig = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearReceiptsStates: (state) => {
      state.receiptsFilterElements = [];
      state.receiptsFilterDependency = [];
      state.receiptsFilterLoader = false;
      state.receiptsScreenLoader = false;
      state.receiptsDataLoader = false;
      state.receiptsFiscalWeekGraph = [];
      state.receiptsFilterConfig = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.receiptsVendorTableData = [];
      state.receiptsVendorTableDataLoader = false;
      state.receiptsVendorTableConfigLoader = false;
      state.receiptsVendorSkuTableData = [];
      state.receiptsVendorSkuTableDataLoader = false;
      state.receiptsVendorSkuTableConfigLoader = false;
    },
  },
});

export const {
  setReceiptsScreenLoader,
  setReceiptsDataLoader,
  setReceiptsFiscalGraphData,
  setReceiptsVendorTableConfigLoader,
  setReceiptsVendorTableDataLoader,
  setReceiptsVendorTableData,
  setReceiptsVendorSkuTableConfigLoader,
  setReceiptsVendorSkuTableDataLoader,
  setReceiptsVendorSkuTableData,
  setReceiptsFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  setReceiptsFilterElements,
  setReceiptsFilterDependency,
  setReceiptsFilterLoader,
  clearReceiptsStates,
} = reportsVendorProjectionsReceiptsService.actions;

export const getReceiptsFiscalWeekGraph = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_RECEIPTS_PROJECTIONS_GRAPH
      : RECEIPTS_PROJECTIONS_GRAPH,
    method: "POST",
    data: postbody,
  });
};

export const getReceiptsVendorLevelTableConfig = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_RECEIPTS_VENDOR_LEVEL_TABLE_CONFIG
      : RECEIPTS_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getReceiptsVendorLevelTableData = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_RECEIPTS_VENDOR_LEVEL_TABLE_DATA
      : RECEIPTS_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getReceiptsVendorSkuLevelTableConfig = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_RECEIPTS_SKU_VENDOR_LEVEL_TABLE_CONFIG
      : RECEIPTS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getReceiptsVendorSkuLevelTableData = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_RECEIPTS_SKU_VENDOR_LEVEL_TABLE_DATA
      : RECEIPTS_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getReceiptsDCSizeLevelProjectionsTableConfig = (
  postbody
) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_RECEIPTS_DC_SIZE_LEVEL_TABLE_CONFIG
      : RECEIPTS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getReceiptsDCSizeLevelProjectionsTableData = (postbody) => () => {
  const isCalledFromVendorStore = getIsCalledFromVendorStoreAndCleanup(
    postbody
  );
  return axiosInstance({
    url: isCalledFromVendorStore
      ? VENDOR_STORE_RECEIPTS_DC_SIZE_LEVEL_TABLE_DATA
      : RECEIPTS_DC_SIZE_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export default reportsVendorProjectionsReceiptsService.reducer;
