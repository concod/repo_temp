import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_EXCESS_INVENTORY_GRAPHDATA,
  GET_EXCESS_INVENTORY_TABLE_DETAILS,
  GET_EXCESS_INVENTORY_STORE_LEVEL_TABLE_DETAILS,
  GET_EXCESS_INVENTORY_SIZE_LEVEL_TABLE_DETAILS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const allocationExcessInventoryService = createSlice({
  name: "allocationExcessInventoryService",
  initialState: {
    excessInventoryScreenLoader: false,
    excessInventoryTableLoader: false,
    excessInventoryFiscalWeekGraph: [],
    excessInventoryTableData: [],
    excessInventoryFilterConfiguration: [],
  },
  reducers: {
    setExcessInventoryScreenLoader: (state, action) => {
      state.excessInventoryScreenLoader = action.payload;
    },
    setExcessInventoryTableLoader: (state, action) => {
      state.excessInventoryTableLoader = action.payload;
    },
    setExcessInventoryGraphData: (state, action) => {
      state.excessInventoryFiscalWeekGraph = action.payload;
    },
    setExcessInventoryTableData: (state, action) => {
      state.excessInventoryTableData = action.payload;
    },
    setExcessInventoryFilterConfiguration: (state, action) => {
      state.excessInventoryFilterConfiguration = action.payload;
    },
    clearExcessInventoryStates: (state) => {
      state.excessInventoryScreenLoader = false;
      state.excessInventoryFiscalWeekGraph = [];
      state.excessInventoryTableData = [];
      state.excessInventoryFilterConfiguration = [];
    },
  },
});

export const {
  setExcessInventoryScreenLoader,
  setExcessInventoryGraphData,
  setExcessInventoryTableData,
  setExcessInventoryFilterConfiguration,
  clearExcessInventoryStates,
  setExcessInventoryTableLoader,
} = allocationExcessInventoryService.actions;

export const getExcessInventoryFiscalWeekGraph = (postbody) => () => {
  return axiosInstance({
    url: GET_EXCESS_INVENTORY_GRAPHDATA,
    method: "POST",
    data: postbody,
  });
};

export const getExcessInventoryTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_EXCESS_INVENTORY_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getExcessInventoryStoreTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_EXCESS_INVENTORY_STORE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getExcessInventorySizeTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_EXCESS_INVENTORY_SIZE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export default allocationExcessInventoryService.reducer;
