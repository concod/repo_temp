import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  STORE_CAPACITY_TABLE_DATA,
  UPDATE_STORE_CAPACITY_BULK_DATA,
  DOWNLOAD_STORECAPACITY_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const storeCapacityService = createSlice({
  name: "storeCapacityService",
  initialState: {
    storeCapacityLoader: false,
    storeCapacityFilterElements: [],
    storeCapacityFilterDependency: [],
    isFiltersValid: false,
    selectedFilters: null,
  },
  reducers: {
    setStoreCapacityLoader: (state, action) => {
      state.storeCapacityLoader = action.payload;
    },
    setStoreCapacityTableData: (state, action) => {
      state.storeCapacityTableData = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setStoreCapacityFilterElements: (state, action) => {
      state.storeCapacityFilterElements = action.payload;
    },
    setStoreCapacityFilterDependency: (state, action) => {
      state.storeCapacityFilterDependency = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
  },
});

export const {
  setStoreCapacityLoader,
  setStoreCapacityTableData,
  setSelectedFilters,
  setStoreCapacityFilterElements,
  setStoreCapacityFilterDependency,
  setIsFiltersValid,
} = storeCapacityService.actions;

export const getStoreCapacityTableData = (postbody) => () => {
  return axiosInstance({
    url: `${STORE_CAPACITY_TABLE_DATA}`,
    method: "POST",
    data: postbody,
  });
};
export const updateStoreCapacityData = (postbody) => () => {
  return axiosInstance({
    url: `${UPDATE_STORE_CAPACITY_BULK_DATA}`,
    method: "POST",
    data: postbody,
  });
};
export const downloadStoreCapacityData = (postbody) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_STORECAPACITY_DATA}`,
    method: "POST",
    data: postbody,
  });
};

export default storeCapacityService.reducer;
