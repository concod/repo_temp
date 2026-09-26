import { createSlice } from "@reduxjs/toolkit";
import {
  GET_PAST_ALLOCATION_TABLE_CONFIG,
  GET_PAST_ALLOCATION_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartPastAllocationService = createSlice({
  name: "inventorySmartPastAllocationService",
  initialState: {
    inventorysmartPastAllocationFilterLoader: false,
    inventorysmartPastAllocationTableConfigLoader: false,
    inventorysmartPastAllocationTableDataLoader: false,
    inventorysmartPastAllocationFilterElements: [],
    inventorysmartPastAllocationFilterDependency: [],
    selectedFilters: [],
    isFiltersValid: false,
    PastAllocationTableConfig: [],
    PastAllocationTableData: [],
    backButtonClicked: false,
    formFilters: {},
  },
  reducers: {
    setInventorysmartPastAllocationFilterLoader: (state, action) => {
      state.inventorysmartPastAllocationFilterLoader = action.payload;
    },
    setInventorysmartPastAllocationTableDataLoader: (state, action) => {
      state.inventorysmartPastAllocationTableDataLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setInventorysmartPastAllocationFilterElements: (state, action) => {
      state.inventorysmartPastAllocationFilterElements = action.payload;
    },
    setInventorysmartPastAllocationFilterDependency: (state, action) => {
      state.inventorysmartPastAllocationFilterDependency = action.payload;
    },
    setBackButtonClicked: (state, action) => {
      state.backButtonClicked = action.payload;
    },
    setFormData: (state, action) => {
      state.formFilters = action.payload;
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
    resetPastAllocationState: (state) => {
      state.inventorysmartPastAllocationFilterLoader = false;
      state.inventorysmartPastAllocationTableConfigLoader = false;
      state.inventorysmartPastAllocationTableDataLoader = false;
      state.inventorysmartPastAllocationFilterElements = [];
      state.inventorysmartPastAllocationFilterDependency = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.PastAllocationTableConfig = [];
      state.PastAllocationTableData = [];
      state.backButtonClicked = false;
      state.formFilters = {};
    },
  },
});

export const {
  setInventorysmartPastAllocationFilterLoader,
  setInventorysmartPastAllocationTableDataLoader,
  setSelectedFilters,
  setInventorysmartPastAllocationFilterElements,
  setInventorysmartPastAllocationFilterDependency,
  setBackButtonClicked,
  setFormData,
  setIsFiltersValid,
  setPastAllocationTableConfig,
  setPastAllocationTableData,
  resetPastAllocationState,
} = inventorySmartPastAllocationService.actions;

export const getPastAllocationTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_PAST_ALLOCATION_TABLE_CONFIG,
    method: "GET",
  });
};

export const getPastAllocationTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_PAST_ALLOCATION_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartPastAllocationService.reducer;
