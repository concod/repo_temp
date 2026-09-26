import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { 
  NEW_STORE_PERFORMANCE_KPI_VIEW,
  NEW_STORE_PERFORMANCE_DETAILS_TABLE,
  NEW_STORE_PERFORMANCE_GRAPH 
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

// Initial State
const initialState = {
  newStoresTrackingTableLoader: false,
  newStoresTrackingKpiLoader: false,
  newStoresTrackingGraphLoader: false,
  newStoresTrackingFilterLoader: false,
  newStoresTrackingFilterConfiguration: {},
  newStoresTrackingFiltersState: null,
  newStoresTrackingKpiData: {},
  newStoresTrackingGraphData: {},
  isFiltersValid: false,
  loadGraphData: false,
};

const inventorySmartNewStoresTrackingService = createSlice({
  name: "inventorySmartNewStoresTrackingService",
  initialState,
  reducers: {
    setNewStoresTrackingTableLoader: (state, action) => {
      state.newStoresTrackingTableLoader = action.payload;
    },
    setNewStoresTrackingKpiLoader: (state, action) => {
      state.newStoresTrackingKpiLoader = action.payload;
    },
    setNewStoresTrackingGraphLoader: (state, action) => {
      state.newStoresTrackingGraphLoader = action.payload;
    },
    setNewStoresTrackingFilterLoader: (state, action) => {
      state.newStoresTrackingFilterLoader = action.payload;
    },
    setNewStoresTrackingFilterConfiguration: (state, action) => {
      state.newStoresTrackingFilterConfiguration = action.payload;
    },
    saveNewStoresTrackingFiltersState: (state, action) => {
      state.newStoresTrackingFiltersState = action.payload;
    },
    setNewStoresTrackingKpiData: (state, action) => {
      state.newStoresTrackingKpiData = action.payload;
    },
    setNewStoresTrackingGraphData: (state, action) => {
      state.newStoresTrackingGraphData = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setLoadGraphData: (state, action) => {
      state.loadGraphData = action.payload;
    },
    clearNewStoresTrackingStates: (state) => {
      state.newStoresTrackingTableLoader = false;
      state.newStoresTrackingKpiLoader = false;
      state.newStoresTrackingGraphLoader = false;
      state.newStoresTrackingFilterLoader = false;
      state.newStoresTrackingFilterConfiguration = {};
      state.newStoresTrackingFiltersState = null;
      state.newStoresTrackingKpiData = {};
      state.newStoresTrackingGraphData = {};
      state.isFiltersValid = false;
      state.loadGraphData = false;  
    },
  },
});

export const {
  setNewStoresTrackingTableLoader,
  setNewStoresTrackingKpiLoader,
  setNewStoresTrackingGraphLoader,
  setNewStoresTrackingFilterLoader,
  setNewStoresTrackingFilterConfiguration,
  saveNewStoresTrackingFiltersState,
  setNewStoresTrackingKpiData,
  setNewStoresTrackingGraphData,
  setShowNewStoresTrackingDetails,
  setIsFiltersValid,
  clearNewStoresTrackingStates,
  setLoadGraphData,
} = inventorySmartNewStoresTrackingService.actions;

// API Actions
export const getNewStoresTrackingKpiData = (body) => {
  return () => axiosInstance({
    url: NEW_STORE_PERFORMANCE_KPI_VIEW,
    method: "POST",
    data: body,
  });
};

export const getNewStoresTrackingDetailsTableData = (body) => {
  return () => axiosInstance({
    url: NEW_STORE_PERFORMANCE_DETAILS_TABLE,
    method: "POST",
    data: body,
  });
};

export const getNewStoresTrackingGraphData = (body) => {
  return () => axiosInstance({
    url: NEW_STORE_PERFORMANCE_GRAPH,
    method: "POST",
    data: body,
  });
};

export const downloadNewStoresTrackingDetails = (body) => {
  return () => axiosInstance({
    url: `${NEW_STORE_PERFORMANCE_DETAILS_TABLE}/download`,
    method: "POST",
    data: body,
  });
};


export default inventorySmartNewStoresTrackingService.reducer;
