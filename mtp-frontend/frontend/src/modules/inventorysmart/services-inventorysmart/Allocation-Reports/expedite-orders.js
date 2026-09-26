import { createSlice } from "@reduxjs/toolkit";
import {
  EXPEDITE_ORDERS_PROJECTIONS_TABLE_CONFIG,
  EXPEDITE_ORDERS_PROJECTIONS_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "core/Utils/axios";

export const reportsExpediteOrdersService = createSlice({
  name: "reportsExpediteOrdersService",
  initialState: {
    isFiltersValid: false,
    selectedFilters: null,
    expediteOrdersFilterElements: [],
    expediteOrdersFilterDependency: [],
    expediteOrdersFilterLoader: false,
    expediteOrdersFilterConfig: [],
    expediteOrdersScreenLoader: false,
    expediteOrdersDataLoader: false,
    expediteOrdersFiscalWeekGraph: [],
    expediteOrdersTableConfigLoader: false,
    expediteOrdersTableDataLoader: false,
    expediteOrdersTableData: [],
  },
  reducers: {
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setExpediteOrdersFilterElements: (state, action) => {
      state.expediteOrdersFilterElements = action.payload;
    },
    setExpediteOrdersFilterDependency: (state, action) => {
      state.expediteOrdersFilterDependency = action.payload;
    },
    setExpediteOrdersFilterLoader: (state, action) => {
      state.expediteOrdersFilterLoader = action.payload;
    },
    setExpediteOrdersFilterConfig: (state, action) => {
      state.expediteOrdersFilterConfig = action.payload;
    },
    setExpediteOrdersScreenLoader: (state, action) => {
      state.expediteOrdersScreenLoader = action.payload;
    },
    setExpediteOrdersDataLoader: (state, action) => {
      state.expediteOrdersDataLoader = action.payload;
    },
    setExpediteOrdersFiscalGraphData: (state, action) => {
      state.expediteOrdersFiscalWeekGraph = action.payload;
    },

    setExpediteOrdersTableConfigLoader: (state, action) => {
      state.expediteOrdersTableConfigLoader = action.payload;
    },
    setExpediteOrdersTableDataLoader: (state, action) => {
      state.expediteOrdersTableDataLoader = action.payload;
    },
    setExpediteOrdersTableData: (state, action) => {
      state.expediteOrdersTableData = action.payload;
    },
    clearExpediteOrdersStates: (state) => {
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.expediteOrdersFilterElements = [];
      state.expediteOrdersFilterDependency = [];
      state.expediteOrdersFilterLoader = false;
      state.expediteOrdersFilterConfig = [];
      state.expediteOrdersScreenLoader = false;
      state.expediteOrdersDataLoader = false;
      state.expediteOrdersFiscalWeekGraph = [];
      state.expediteOrdersTableConfigLoader = false;
      state.expediteOrdersTableDataLoader = false;
      state.expediteOrdersTableData = [];
    },
  },
});

export const {
  setSelectedFilters,
  setIsFiltersValid,
  setExpediteOrdersFilterElements,
  setExpediteOrdersFilterDependency,
  setExpediteOrdersFilterLoader,
  setExpediteOrdersFilterConfig,
  setExpediteOrdersScreenLoader,
  setExpediteOrdersDataLoader,
  setExpediteOrdersFiscalGraphData,
  setExpediteOrdersTableConfigLoader,
  setExpediteOrdersTableDataLoader,
  setExpediteOrdersTableData,
  clearExpediteOrdersStates,
} = reportsExpediteOrdersService.actions;

export const getExpediteOrdersTableConfig = (postbody) => () => {
  return axiosInstance({
    url: EXPEDITE_ORDERS_PROJECTIONS_TABLE_CONFIG,
    method: "GET",
    data: postbody,
  });
};

export const getExpediteOrdersTableData = (postbody) => () => {
  return axiosInstance({
    url: EXPEDITE_ORDERS_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export default reportsExpediteOrdersService.reducer;
