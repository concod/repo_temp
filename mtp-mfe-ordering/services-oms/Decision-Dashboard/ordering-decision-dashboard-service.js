import { createSlice } from "@reduxjs/toolkit";

export const orderingDashboardService = createSlice({
  name: "orderingDashboardService",
  initialState: {
    isFiltersValid: false,
    selectedFilters: [],
    selectedDates: {
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    },
    filterDependencyData: [],
    screenConfigs: {},
  },
  reducers: {
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setSelectedDates: (state, action) => {
      state.selectedDates = action.payload;
    },
    setFilterDependencyData: (state, action) => {
      state.filterDependencyData = action.payload;
    },
    setOrderingDDScreenConfigs: (state, action) => {
      state.screenConfigs = action.payload;
    },
    resetOrderingDashboardStore: (state, _action) => {
      state.isFiltersValid = false;
      state.selectedFilters = [];
      state.selectedDates = {
        fiscalInfoStartDate: null,
        fiscalInfoEndDate: null,
      };
      state.filterDependencyData = [];
      state.screenConfigs = {};
    },
  },
});

export const {
  setSelectedFilters,
  setIsFiltersValid,
  setSelectedDates,
  setFilterDependencyData,
  setOrderingDDScreenConfigs,
  resetOrderingDashboardStore,
} = orderingDashboardService.actions;

export default orderingDashboardService.reducer;
