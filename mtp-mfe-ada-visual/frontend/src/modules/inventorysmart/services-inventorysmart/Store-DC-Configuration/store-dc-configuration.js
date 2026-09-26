import { createSlice } from "@reduxjs/toolkit";
import {
  DOWNLOAD_REPORT_DC_LEAD_TIME,
  GET_STORE_DC_CONFIG_TABLE_CONFIG,
  GET_STORE_DC_CONFIG_TABLE_DATA,
  SAVE_STORE_DC_CONFIG,
  SAVE_STORE_DC_CONFIG_CHECKALL,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartStoreDcConfigService = createSlice({
  name: "inventorySmartStoreDcConfigService",
  initialState: {
    inventorysmartStoreDcConfigFilterLoader: false,
    inventorysmartStoreDcConfigTableConfigLoader: false,
    inventorysmartStoreDcConfigTableDataLoader: false,
    inventorysmartStoreDcConfigFilterElements: [],
    inventorysmartStoreDcConfigFilterDependency: [],
    selectedFilters: [],
    isFiltersValid: false,
  },
  reducers: {
    setInventorysmartStoreDcConfigFilterLoader: (state, action) => {
      state.inventorysmartStoreDcConfigFilterLoader = action.payload;
    },
    setInventorysmartStoreDcConfigTableDataLoader: (state, action) => {
      state.inventorysmartStoreDcConfigTableDataLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setInventorysmartStoreDcConfigFilterElements: (state, action) => {
      state.inventorysmartStoreDcConfigFilterElements = action.payload;
    },
    setInventorysmartStoreDcConfigFilterDependency: (state, action) => {
      state.inventorysmartStoreDcConfigFilterDependency = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setPastAllocationTableConfig: (state, action) => {
      state.PastAllocationTableConfig = action.payload;
    },
    setPastAllocationTableData: (state, action) => {
      state.PastAllocationTableData = action.payload;
    },
    resetStoreDcConfigState: (state) => {
      state.inventorysmartStoreDcConfigFilterLoader = false;
      state.inventorysmartStoreDcConfigTableConfigLoader = false;
      state.inventorysmartStoreDcConfigTableDataLoader = false;
      state.inventorysmartStoreDcConfigFilterElements = [];
      state.inventorysmartStoreDcConfigFilterDependency = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
    },
  },
});

export const {
  setInventorysmartStoreDcConfigFilterLoader,
  setInventorysmartStoreDcConfigTableDataLoader,
  setSelectedFilters,
  setInventorysmartStoreDcConfigFilterElements,
  setInventorysmartStoreDcConfigFilterDependency,
  setIsFiltersValid,
  setPastAllocationTableConfig,
  setPastAllocationTableData,
  resetStoreDcConfigState,
} = inventorySmartStoreDcConfigService.actions;

export const getStoreDcConfigurationTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_STORE_DC_CONFIG_TABLE_CONFIG,
    method: "GET",
  });
};

export const getStoreDcConfigTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_DC_CONFIG_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const saveGridEdits = (postBody) => () => {
  return axiosInstance({
    url: SAVE_STORE_DC_CONFIG,
    method: "POST",
    data: postBody,
  });
};

export const saveGridEditsForCheckAll = (postBody) => () => {
  return axiosInstance({
    url: SAVE_STORE_DC_CONFIG_CHECKALL,
    method: "POST",
    data: postBody,
  });
};

export const DownloadRequest = (postBody) => () => {
  return axiosInstance({
    url: DOWNLOAD_REPORT_DC_LEAD_TIME,
    method: "POST",
    data: postBody,
  });
};
export default inventorySmartStoreDcConfigService.reducer;
