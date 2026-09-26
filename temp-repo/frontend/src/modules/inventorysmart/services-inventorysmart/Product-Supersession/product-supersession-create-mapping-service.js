import { createSlice } from "@reduxjs/toolkit";
import { GET_SUPERSESSION_PRODUCTS_MAPPING_LIST } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartProductSupersessionCreateMappingService = createSlice(
  {
    name: "inventorySmartProductSupersessionCreateMappingService",
    initialState: {
      inventorysmartCreateMappingPopupTableLoader: false,
      inventorysmartCreateMappingPopupDataLoader: false,
      inventorysmartCreateMappingTableLoader: false,
      inventorysmartCreateMappingDataLoader: false,
      inventorysmartCreateProductMappingFilterLoader: false,
      inventoryCreateProductMappingFilterConfig: [],
      inventorysmartCreateProductMappingFilterDependency: [],
      inventorysmartCreateProducMappingEditedConfiguration: null,
      selectedFilters: [],
      isFiltersValid: false,
    },
    reducers: {
      setInventorysmartCreateMappingPopupTableLoader: (state, action) => {
        state.inventorysmartCreateMappingPopupTableLoader = action.payload;
      },
      setInventorysmartCreateMappingPopupDataLoader: (state, action) => {
        state.inventorysmartCreateMappingPopupDataLoader = action.payload;
      },
      setInventorysmartCreateMappingTableLoader: (state, action) => {
        state.inventorysmartCreateMappingTableLoader = action.payload;
      },
      setInventorysmartCreateMappingDataLoader: (state, action) => {
        state.inventorysmartCreateMappingDataLoader = action.payload;
      },
      setInventorysmartCreateMappingFilterLoader: (state, action) => {
        state.inventorysmartCreateProductMappingFilterLoader = action.payload;
      },
      setInventoryCreateProductMappingFilterConfig: (state, action) => {
        state.inventoryCreateProductMappingFilterConfig = action.payload;
      },
      setInventorysmartCreateProductMappingFilterDependency: (
        state,
        action
      ) => {
        state.inventorysmartCreateProductMappingFilterDependency =
          action.payload;
      },
      setInventorysmartCreateProducMappingEditedConfiguration: (
        state,
        action
      ) => {
        state.inventorysmartCreateProducMappingEditedConfiguration =
          action.payload;
      },
      setSelectedFilters: (state, action) => {
        state.selectedFilters = action.payload;
      },
      setIsFiltersValid: (state, action) => {
        state.isFiltersValid = action.payload;
      },
      partialResetCreateProductMappingStore: (state, _action) => {
        state.inventorysmartCreateMappingPopupTableLoader = false;
        state.inventorysmartCreateMappingPopupDataLoader = false;
        state.inventorysmartCreateMappingTableLoader = false;
        state.inventorysmartCreateMappingDataLoader = false;
        state.inventorysmartCreateProductMappingFilterLoader = false;
        state.selectedFilters = [];
        state.isFiltersValid = false;
      },
      resetCreateProductMappingStore: (state, _action) => {
        state.inventorysmartCreateMappingPopupTableLoader = false;
        state.inventorysmartCreateMappingPopupDataLoader = false;
        state.inventorysmartCreateMappingTableLoader = false;
        state.inventorysmartCreateMappingDataLoader = false;
        state.inventorysmartCreateProductMappingFilterLoader = false;
        state.inventoryCreateProductMappingFilterConfig = [];
        state.inventorysmartCreateProductMappingFilterDependency = [];
        state.inventorysmartCreateProducMappingEditedConfiguration = null;
        state.selectedFilters = [];
        state.isFiltersValid = false;
      },
    },
  }
);

export const {
  setInventorysmartCreateMappingPopupTableLoader,
  setInventorysmartCreateMappingPopupDataLoader,
  setInventorysmartCreateMappingTableLoader,
  setInventorysmartCreateMappingDataLoader,
  setInventorysmartCreateMappingFilterLoader,
  setInventoryCreateProductMappingFilterConfig,
  setInventorysmartCreateProductMappingFilterDependency,
  setInventorysmartCreateProducMappingEditedConfiguration,
  setSelectedFilters,
  setIsFiltersValid,
  partialResetCreateProductMappingStore,
  resetCreateProductMappingStore,
} = inventorySmartProductSupersessionCreateMappingService.actions;

export const getProductMappingData = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPERSESSION_PRODUCTS_MAPPING_LIST,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartProductSupersessionCreateMappingService.reducer;
