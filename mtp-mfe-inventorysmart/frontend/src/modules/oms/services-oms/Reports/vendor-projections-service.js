import { createSlice } from "@reduxjs/toolkit";

export const reportsVendorProjectionsService = createSlice({
  name: "reportsVendorProjectionsService",
  initialState: {
    screenLoader: false,
    dataLoader: false,
    isCalledFromVendorStore: false,
    isFiltersValid: false,
    selectedFilters: null,
    filterElements: [],
    filterDependency: [],
    filterLoader: false,
    filterConfig: {},
  },
  reducers: {
    setIsCalledFromVendorStore: (state, action) => {
      state.isCalledFromVendorStore = action.payload;
    },
    setScreenLoader: (state, action) => {
      state.screenLoader = action.payload;
    },
    setDataLoader: (state, action) => {
      state.dataLoader = action.payload;
    },
    setFilterConfig: (state, action) => {
      state.filterConfig = action.payload;
    },

    setFilterElements: (state, action) => {
      state.filterElements = action.payload;
    },
    setFilterDependency: (state, action) => {
      state.filterDependency = action.payload;
    },
    setFilterLoader: (state, action) => {
      state.filterLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    clearStates: (state) => {
      state.filterDependency = [];
      state.filterLoader = false;
      state.screenLoader = false;
      state.dataLoader = false;
      state.isCalledFromVendorStore = false;
      state.isFiltersValid = false;
      state.selectedFilters = null;
    },
  },
});

export const {
  setScreenLoader,
  setDataLoader,
  setFilterConfig,
  setIsCalledFromVendorStore,
  setSelectedFilters,
  setIsFiltersValid,
  setFilterElements,
  setFilterDependency,
  setFilterLoader,
  clearStates,
} = reportsVendorProjectionsService.actions;

export default reportsVendorProjectionsService.reducer;
