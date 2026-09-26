import { createSlice } from "@reduxjs/toolkit";
// import axiosInstance from "../../../../Utils/axios/index";

export const inventorySmartProductSupersessionService = createSlice({
  name: "inventorySmartProductSupersessionService",
  initialState: {
    inventorysmartFilterLoader: false,
    inventoryProductSupersessionFilterConfig: [],
    selectedFilters: [],
    isFiltersValid: false,
    selectedProductMappingsForEdit: [],
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
    setSelectedProductMappingsForEdit(state, action) {
      state.selectedProductMappingsForEdit = action.payload;
    },
    resetSelectedProductMappingsForEdit(state, _action) {
      state.selectedProductMappingsForEdit = [];
    },
  },
});

export const {
  setInventorysmartFilterLoader,
  setInventoryProductSupersessionFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  resetProductSupersessionStore,
  setSelectedProductMappingsForEdit,
  resetSelectedProductMappingsForEdit,
} = inventorySmartProductSupersessionService.actions;

export default inventorySmartProductSupersessionService.reducer;
