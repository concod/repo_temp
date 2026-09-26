import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_EXCESS_INVENTORY_GRAPHDATA,
  GET_EXCESS_INVENTORY_TABLE_DETAILS,
  GET_EXCESS_INVENTORY_STORE_LEVEL_TABLE_DETAILS,
  GET_EXCESS_INVENTORY_SIZE_LEVEL_TABLE_DETAILS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const excessInventoryReportService = createSlice({
  name: "excessInventoryReport",
  initialState: {
    excessInventoryScreenLoader: false,
    excessInventoryTableLoader: false,
    excessInventoryFiscalWeekGraph: [],
    excessInventoryTableData: [],
    excessInventoryFilterConfiguration: [],
    excessReportRenderTable: [],
    showExcessInventoryDetails: false,
    excessReportsFiltersState: [],
    aggregates:null,
    selectedExcessViewType: "product-store-view", // Default view is product-store-view
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
    setShowExcessInventoryDetails: (state, action) => {
      state.showExcessInventoryDetails = action.payload;
    },
    setExcessReportRenderTable: (state, action) => {
      state.excessReportRenderTable = action.payload;
    },
    saveExcessReportsFiltersState: (state, action) => {
      state.excessReportsFiltersState = action.payload;
    },
    setAggregates:(state, action) => {
      state.aggregates = action.payload;
    },
    setSelectedExcessViewType: (state, action) => {
      state.selectedExcessViewType = action.payload;
    },
    clearExcessInventoryStates: (state) => {
      state.excessInventoryFiscalWeekGraph = [];
      state.excessInventoryTableData = [];
      state.excessInventoryFilterConfiguration = [];
      state.excessReportRenderTable = [];
      state.showExcessInventoryDetails = false;
      state.excessReportsFiltersState = [];
      state.selectedExcessViewType = "product-store-view";
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
  setShowExcessInventoryDetails,
  setExcessReportRenderTable,
  saveExcessReportsFiltersState,
  setAggregates,
  setSelectedExcessViewType
} = excessInventoryReportService.actions;

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


export default excessInventoryReportService.reducer;
