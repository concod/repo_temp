import { createSlice } from "@reduxjs/toolkit";

export const reportsVendorProjectionsService = createSlice({
  name: "reportsVendorProjectionsService",
  initialState: {
    screenLoader: false,
    dataLoader: false,
    isFiltersValid: false,
    selectedFilters: null,
    filterElements: [],
    filterDependency: [],
    filterLoader: false,
  },
  reducers: {
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
    clearForecastStates: (state) => {
      state.forecastFilterElements = [];
      state.filterDependency = [];
      state.filterLoader = false;
      state.screenLoader = false;
      state.dataLoader = false;
      state.isFiltersValid = false;
      state.selectedFilters = null;
    },
  },
});

export const {
  setScreenLoader,
  setDataLoader,
  setFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  setFilterElements,
  setFilterDependency,
  setFilterLoader,
  clearStates,
} = reportsVendorProjectionsService.actions;

export default reportsVendorProjectionsService.reducer;
