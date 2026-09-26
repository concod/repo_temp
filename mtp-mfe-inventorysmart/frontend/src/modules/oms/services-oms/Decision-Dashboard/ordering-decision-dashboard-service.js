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
    orderingDashboardDcOptions: [],
    orderingDashboardSelectedDcs: [],
    orderingDashboardDcOptionsLoading: false,
    vendorDcVariants: [],
    selectedVendorDcVariantKey: "v2",
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
    setOrderingDashboardDcOptions: (state, action) => {
      state.orderingDashboardDcOptions = action.payload;
    },
    setOrderingDashboardSelectedDcs: (state, action) => {
      state.orderingDashboardSelectedDcs = action.payload;
    },
    setOrderingDashboardDcOptionsLoading: (state, action) => {
      state.orderingDashboardDcOptionsLoading = action.payload;
    },
    setVendorDcVariants: (state, action) => {
      state.vendorDcVariants = Array.isArray(action.payload)
        ? action.payload
        : [];
    },
    setSelectedVendorDcVariantKey: (state, action) => {
      state.selectedVendorDcVariantKey =
        typeof action.payload === "string" ? action.payload : "v2";
    },
    clearOrderingDashboardDcState: (state) => {
      state.orderingDashboardDcOptions = [];
      state.orderingDashboardSelectedDcs = [];
      state.orderingDashboardDcOptionsLoading = false;
      state.selectedFilters = (state.selectedFilters || []).filter(
        (f) => f?.dimension !== "dc"
      );
      state.vendorDcVariants = [];
      state.selectedVendorDcVariantKey = "v2";
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
      state.orderingDashboardDcOptions = [];
      state.orderingDashboardSelectedDcs = [];
      state.orderingDashboardDcOptionsLoading = false;
      state.vendorDcVariants = [];
      state.selectedVendorDcVariantKey = "v2";
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
  setOrderingDashboardDcOptions,
  setOrderingDashboardSelectedDcs,
  setOrderingDashboardDcOptionsLoading,
  setVendorDcVariants,
  setSelectedVendorDcVariantKey,
  clearOrderingDashboardDcState,
} = orderingDashboardService.actions;

export default orderingDashboardService.reducer;
