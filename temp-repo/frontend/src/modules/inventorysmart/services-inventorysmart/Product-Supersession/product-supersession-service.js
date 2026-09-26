import { createSlice } from "@reduxjs/toolkit";
// import axiosInstance from "../../../../Utils/axios/index";

export const inventorySmartProductSupersessionService = createSlice({
  name: "inventorySmartProductSupersessionService",
  initialState: {
    inventorysmartFilterLoader: false,
    inventoryProductSupersessionFilterConfig: [],
    selectedFilters: [],
    isFiltersValid: false,
  },
  reducers: {
    setInventorysmartFilterLoader: (state, action) => {
      state.inventorysmartFilterLoader = action.payload;
    },
    setInventoryProductSupersessionFilterConfig: (state, action) => {
      state.inventoryProductSupersessionFilterConfig = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    resetProductSupersessionStore: (state, _action) => {
      state.inventorysmartFilterLoader = false;
      state.inventoryProductSupersessionFilterConfig = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
    },
  },
});

export const {
  setInventorysmartFilterLoader,
  setInventoryProductSupersessionFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  resetProductSupersessionStore,
} = inventorySmartProductSupersessionService.actions;

export default inventorySmartProductSupersessionService.reducer;
