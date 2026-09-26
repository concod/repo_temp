import { createSlice } from "@reduxjs/toolkit";
import {
  LATE_ORDERS_PROJECTIONS_TABLE_CONFIG,
  LATE_ORDERS_PROJECTIONS_TABLE_DATA,
} from "modules/oms/constants-oms/apiConstants";
import axiosInstance from "core/Utils/axios";

export const reportsLateOrdersService = createSlice({
  name: "reportsLateOrdersService",
  initialState: {
    isFiltersValid: false,
    selectedFilters: null,
    lateOrdersFilterElements: [],
    lateOrdersFilterDependency: [],
    lateOrdersFilterLoader: false,
    lateOrdersFilterConfig: [],
    lateOrdersScreenLoader: false,
    lateOrdersDataLoader: false,
    lateOrdersFiscalWeekGraph: [],
    lateOrdersTableConfigLoader: false,
    lateOrdersTableDataLoader: false,
    lateOrdersTableData: [],
  },
  reducers: {
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setLateOrdersFilterElements: (state, action) => {
      state.lateOrdersFilterElements = action.payload;
    },
    setLateOrdersFilterDependency: (state, action) => {
      state.lateOrdersFilterDependency = action.payload;
    },
    setLateOrdersFilterLoader: (state, action) => {
      state.lateOrdersFilterLoader = action.payload;
    },
    setLateOrdersFilterConfig: (state, action) => {
      state.lateOrdersFilterConfig = action.payload;
    },
    setLateOrdersScreenLoader: (state, action) => {
      state.lateOrdersScreenLoader = action.payload;
    },
    setLateOrdersDataLoader: (state, action) => {
      state.lateOrdersDataLoader = action.payload;
    },
    setLateOrdersFiscalGraphData: (state, action) => {
      state.lateOrdersFiscalWeekGraph = action.payload;
    },

    setLateOrdersTableConfigLoader: (state, action) => {
      state.lateOrdersTableConfigLoader = action.payload;
    },
    setLateOrdersTableDataLoader: (state, action) => {
      state.lateOrdersTableDataLoader = action.payload;
    },
    setLateOrdersTableData: (state, action) => {
      state.lateOrdersTableData = action.payload;
    },
    clearLateOrdersStates: (state) => {
      state.isFiltersValid = false;
      state.selectedFilters = null;
      state.lateOrdersFilterElements = [];
      state.lateOrdersFilterDependency = [];
      state.lateOrdersFilterLoader = false;
      state.lateOrdersFilterConfig = [];
      state.lateOrdersScreenLoader = false;
      state.lateOrdersDataLoader = false;
      state.lateOrdersFiscalWeekGraph = [];
      state.lateOrdersTableConfigLoader = false;
      state.lateOrdersTableDataLoader = false;
      state.lateOrdersTableData = [];
    },
  },
});

export const {
  setSelectedFilters,
  setIsFiltersValid,
  setLateOrdersFilterElements,
  setLateOrdersFilterDependency,
  setLateOrdersFilterLoader,
  setLateOrdersFilterConfig,
  setLateOrdersScreenLoader,
  setLateOrdersDataLoader,
  setLateOrdersFiscalGraphData,
  setLateOrdersTableConfigLoader,
  setLateOrdersTableDataLoader,
  setLateOrdersTableData,
  clearLateOrdersStates,
} = reportsLateOrdersService.actions;

export const getLateOrdersTableConfig = (postbody) => () => {
  return axiosInstance({
    url: LATE_ORDERS_PROJECTIONS_TABLE_CONFIG,
    method: "GET",
    data: postbody,
  });
};

export const getLateOrdersTableData = (postbody) => () => {
  return axiosInstance({
    url: LATE_ORDERS_PROJECTIONS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export default reportsLateOrdersService.reducer;
