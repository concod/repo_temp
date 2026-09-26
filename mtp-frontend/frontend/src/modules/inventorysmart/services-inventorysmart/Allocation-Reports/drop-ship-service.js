import { createSlice } from "@reduxjs/toolkit";
import {
  DROPSHIP_SKU_VENDOR_COST_PROJECTIONS_TABLE_DATA,
  DROPSHIP_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  DROPSHIP_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
  DROPSHIP_SKU_VENDOR_PROJECTIONS_RESET,
  DROPSHIP_SKU_VENDOR_PROJECTIONS_UPDATE,
  DROPSHIP_SKU_VENDOR_UNIT_PROJECTIONS_TABLE_DATA,
  DROPSHIP_TOTAL_PROJECTIONS_GRAPH,
  DROPSHIP_VENDOR_COST_PROJECTIONS_TABLE_DATA,
  DROPSHIP_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
  DROPSHIP_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
  DROPSHIP_VENDOR_UNIT_PROJECTIONS_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "core/Utils/axios";

export const reportsDropShipService = createSlice({
  name: "reportsDropShipService",
  initialState: {
    dropShipScreenLoader: false,
    dropShipDataLoader: false,
    dropShipFiscalWeekGraph: [],
    dropShipFilterConfig: [],
    dropShipVendorTableConfigLoader: false,
    dropShipVendorTableDataLoader: false,
    dropShipVendorTableData: [],
    dropShipVendorSkuTableConfigLoader: false,
    dropShipVendorSkuTableDataLoader: false,
    dropShipVendorSkuTableData: [],
    isFiltersValid: false,
    selectedFilters: null,
    dropShipFilterElements: [],
    dropShipFilterDependency: [],
    dropShipFilterLoader: false,
    updateDropShipPredictionsSuccess: false,
  },
  reducers: {
    setDropShipFilterElements: (state, action) => {
      state.dropShipFilterElements = action.payload;
    },
    setDropShipFilterDependency: (state, action) => {
      state.dropShipFilterDependency = action.payload;
    },
    setDropShipFilterLoader: (state, action) => {
      state.dropShipFilterLoader = action.payload;
    },

    setDropShipScreenLoader: (state, action) => {
      state.dropShipScreenLoader = action.payload;
    },
    setDropShipDataLoader: (state, action) => {
      state.dropShipDataLoader = action.payload;
    },
    setDropShipFiscalGraphData: (state, action) => {
      state.dropShipFiscalWeekGraph = action.payload;
    },

    setDropShipVendorTableConfigLoader: (state, action) => {
      state.dropShipVendorTableConfigLoader = action.payload;
    },
    setDropShipVendorTableDataLoader: (state, action) => {
      state.dropShipVendorTableDataLoader = action.payload;
    },
    setDropShipVendorTableData: (state, action) => {
      state.dropShipVendorTableData = action.payload;
    },

    setDropShipVendorSkuTableConfigLoader: (state, action) => {
      state.dropShipVendorSkuTableConfigLoader = action.payload;
    },
    setDropShipVendorSkuTableDataLoader: (state, action) => {
      state.dropShipVendorSkuTableDataLoader = action.payload;
    },
    setDropShipVendorSkuTableData: (state, action) => {
      state.dropShipVendorSkuTableData = action.payload;
    },
    setUpdateDropShipPredictionsSuccess: (state, action) => {
      state.updateDropShipPredictionsSuccess = action.payload;
    },

    setDropShipFilterConfig: (state, action) => {
      state.dropShipFilterConfig = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearDropShipStates: (state) => {
      state.dropShipFilterElements = [];
      state.dropShipFilterDependency = [];
      state.dropShipFilterLoader = false;
      state.dropShipScreenLoader = false;
      state.dropShipDataLoader = false;
      state.dropShipFiscalWeekGraph = [];
      state.dropShipFilterConfig = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.dropShipVendorTableData = [];
      state.dropShipVendorTableDataLoader = false;
      state.dropShipVendorTableConfigLoader = false;
      state.dropShipVendorSkuTableData = [];
      state.dropShipVendorSkuTableDataLoader = false;
      state.dropShipVendorSkuTableConfigLoader = false;
      state.updateDropShipPredictionsSuccess = false;
    },
  },
});

export const {
  setDropShipFilterElements,
  setDropShipFilterDependency,
  setDropShipFilterLoader,
  setDropShipScreenLoader,
  setDropShipDataLoader,
  setDropShipFiscalGraphData,
  setDropShipVendorTableConfigLoader,
  setDropShipVendorTableDataLoader,
  setDropShipVendorTableData,
  setDropShipVendorSkuTableConfigLoader,
  setDropShipVendorSkuTableDataLoader,
  setDropShipVendorSkuTableData,
  setUpdateDropShipPredictionsSuccess,
  setDropShipFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  clearDropShipStates,
} = reportsDropShipService.actions;

export const getDropShipFiscalWeekGraph = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_TOTAL_PROJECTIONS_GRAPH,
    method: "POST",
    data: postbody,
  });
};

export const getDropShipVendorLevelTableConfig = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getDropShipVendorLevelTableData = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getDropShipVendorSkuLevelTableConfig = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_CONFIG,
    method: "POST",
    data: postbody,
  });
};

export const getDropShipVendorSkuLevelTableData = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_SKU_VENDOR_LEVEL_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

//New Updated APIs

export const getDropShipVendorLevelCostTableData = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_VENDOR_COST_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getDropShipVendorLevelUnitTableData = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_VENDOR_UNIT_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getDropShipVendorSkuCostTableData = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_SKU_VENDOR_COST_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getDropShipVendorSkuUnitTableData = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_SKU_VENDOR_UNIT_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const updateDropShipVendorSkuPredictions = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_SKU_VENDOR_PROJECTIONS_UPDATE,
    method: "POST",
    data: postbody,
  });
};

export const resetDropShipVendorSkuForecasts = (postbody) => () => {
  return axiosInstance({
    url: DROPSHIP_SKU_VENDOR_PROJECTIONS_RESET,
    method: "POST",
    data: postbody,
  });
};

export default reportsDropShipService.reducer;
