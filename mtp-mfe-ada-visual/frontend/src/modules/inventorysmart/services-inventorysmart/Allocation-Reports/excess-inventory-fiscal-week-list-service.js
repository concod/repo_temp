import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_EXCESS_INV_REPORT_TABLE_DATA,
  PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const excessInventoryService = createSlice({
  name: "excessInventoryService",
  initialState: {
    excessInventoryFilterLoader: false,
    excessInventoryConfigLoader: false,
    excessInventoryPopupConfigLoader: false,
    excessInventoryDataLoader: false,
    excessInventoryStoreViewLoader: false,
    excessInventoryTableData: [],
    excessInventoryFilterElements: [],
    excessInventoryFilterDependency: [],
    isFiltersValid: false,
    selectedFilters: null,
  },
  reducers: {
    setExcessInventoryFilterLoader: (state, action) => {
      state.excessInventoryFilterLoader = action.payload;
    },
    setExcessInventoryConfigLoader: (state, action) => {
      state.excessInventoryConfigLoader = action.payload;
    },
    setExcessInventoryPopupConfigLoader: (state, action) => {
      state.excessInventoryPopupConfigLoader = action.payload;
    },
    setExcessInventoryDataLoader: (state, action) => {
      state.excessInventoryDataLoader = action.payload;
    },
    setExcessInventoryStoreViewLoader: (state, action) => {
      state.excessInventoryStoreViewLoader = action.payload;
    },
    setExcessInventoryTableData: (state, action) => {
      state.excessInventoryTableData = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setExcessInventoryFilterElements: (state, action) => {
      state.excessInventoryFilterElements = action.payload;
    },
    setExcessInventoryFilterDependency: (state, action) => {
      state.excessInventoryFilterDependency = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearExcessInventoryStates: (state) => {
      state.excessInventoryFilterLoader = false;
      state.excessInventoryConfigLoader = false;
      state.excessInventoryPopupConfigLoader = false;
      state.excessInventoryDataLoader = false;
      state.excessInventoryStoreViewLoader = false;
      state.excessInventoryTableData = [];
      state.excessInventoryFilterElements = [];
      state.excessInventoryFilterDependency = [];
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.fiscalDates = null;
    },
  },
});

export const {
  setExcessInventoryFilterLoader,
  setExcessInventoryConfigLoader,
  setExcessInventoryPopupConfigLoader,
  setExcessInventoryDataLoader,
  setExcessInventoryTableData,
  setSelectedFilters,
  setExcessInventoryFilterElements,
  setExcessInventoryFilterDependency,
  setIsFiltersValid,
  clearExcessInventoryStates,
  setExcessInventoryStoreViewLoader,
} = excessInventoryService.actions;

export const getExcessInventoryTableData = (postbody) => () => {
  return axiosInstance({
    url: `${GET_EXCESS_INV_REPORT_TABLE_DATA}`,
    method: "POST",
    data: postbody,
  });
};
export const getExcessInventoryTableConfig = (postBody) => () => {
  return axiosInstance({
    url: `${PRODUCT_RULE_DASHBOARD_TABLE_FILTER_CONFIG}?table_name=${postBody}`,

    method: "GET",
  });
};
export default excessInventoryService.reducer;
