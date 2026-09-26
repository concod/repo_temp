import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { GET_IN_STOCK_TABLE_DATA_SKU, GET_IN_STOCK_KPI_DATA, GET_IN_STOCK_TABLE_DATA_STORE } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

const initialState = {
  inStockScreenLoader: false,
  inStockTableLoader: false,
  inStockTableData: [],
  inStockFilterConfiguration: [],
  inStockFiltersState: { view_type: "article" },
  showInStockDetails: false,
  inStockKpiData: {},
  isFiltersValid: false,
  selectedInStockViewType: "article",
};

const inStockReportService = createSlice({
  name: "inStockReportService",
  initialState,
  reducers: {
    setInStockScreenLoader: (state, action) => {
      state.inStockScreenLoader = action.payload;
    },
    setInStockTableLoader: (state, action) => {
      state.inStockTableLoader = action.payload;
    },
    setInStockFilterConfiguration: (state, action) => {
      state.inStockFilterConfiguration = action.payload;
    },
    saveInStockFiltersState: (state, action) => {
      state.inStockFiltersState = action.payload;
    },
    setShowInStockDetails: (state, action) => {
      state.showInStockDetails = action.payload;
    },
    setInStockKpiData: (state, action) => {
      state.inStockKpiData = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setSelectedInStockViewType: (state, action) => {
      state.selectedInStockViewType = action.payload;
    },
    clearInStockStates: (state) => {
      state.inStockScreenLoader = false;
      state.inStockTableLoader = false;
      state.inStockTableData = [];
      state.inStockFiltersState = { view_type: "article" };
      state.showInStockDetails = false;
      state.inStockKpiData = {};
      state.isFiltersValid = false;
      state.selectedInStockViewType = "article";
    },
  },
});

export const {
  setInStockScreenLoader,
  setInStockTableLoader,
  setInStockTableData,
  setInStockFilterConfiguration,
  saveInStockFiltersState,
  setShowInStockDetails,
  setInStockKpiData,
  clearInStockStates,
  setIsFiltersValid,
  setSelectedInStockViewType,
} = inStockReportService.actions;

export const getInStockSKUTableData = (postbody) => {
  const requestBody = {
    ...postbody,
  };
  
  return () => axiosInstance({
    url: GET_IN_STOCK_TABLE_DATA_SKU,
    method: "POST",
    data: requestBody,
  });
};
export const getInStockStoreTableData = (postbody) => {
  const requestBody = {
    ...postbody,
  };
  
  return () => axiosInstance({
    url: GET_IN_STOCK_TABLE_DATA_STORE,
    method: "POST",
    data: requestBody,
  });
};

export const getInStockKpiData = (postbody) => {
  console.log("postbody", postbody);
  const requestBody = {
    ...postbody,
  };
  
  return () => axiosInstance({
    url: GET_IN_STOCK_KPI_DATA,
    method: "POST",
    data: requestBody,
  });
};

export default inStockReportService.reducer; 