import { createSlice } from "@reduxjs/toolkit";
import {
  FETCH_TABLE_CONFIG,
  PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_INDIVIDUAL_ROWS,
  PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_LIST,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartProductStoreInventorySourceMappingService = createSlice(
  {
    name: "inventorySmartProductStoreInventorySourceMappingService",
    initialState: {
      inventorysmartFilterLoader: false,
      inventoryProductStoreInventorySourceFilterConfig: [],
      selectedFilters: [],
      isFiltersValid: false,
      inventorysmartProductStoreInventorySourceMappingTableLoader: false,
      inventorysmartProductStoreInventorySourceMappingConfigLoader: false,
    },
    reducers: {
      setInventorysmartFilterLoader: (state, action) => {
        state.inventorysmartFilterLoader = action.payload;
      },
      setInventoryProductStoreInventorySourceFilterConfig: (state, action) => {
        state.inventoryProductStoreInventorySourceFilterConfig = action.payload;
      },
      setSelectedFilters: (state, action) => {
        state.selectedFilters = action.payload;
      },
      setIsFiltersValid: (state, action) => {
        state.isFiltersValid = action.payload;
      },
      setInventorysmartProductStoreInventorySourceMappingTableLoader: (
        state,
        action
      ) => {
        state.inventorysmartProductStoreInventorySourceMappingTableLoader =
          action.payload;
      },
      setInventorysmartProductStoreInventorySourceMappingConfigLoader: (
        state,
        action
      ) => {
        state.inventorysmartProductStoreInventorySourceMappingConfigLoader =
          action.payload;
      },
      resetProductStoreInventorySourceMappingStore: (state, _action) => {
        state.inventorysmartFilterLoader = false;
        state.inventoryProductStoreInventorySourceFilterConfig = [];
        state.selectedFilters = [];
        state.isFiltersValid = false;
        state.inventorysmartProductStoreInventorySourceMappingTableLoader = false;
        state.inventorysmartProductStoreInventorySourceMappingConfigLoader = false;
      },
    },
  }
);

export const {
  setInventorysmartFilterLoader,
  setInventoryProductStoreInventorySourceFilterConfig,
  setSelectedFilters,
  setIsFiltersValid,
  setInventorysmartProductStoreInventorySourceMappingTableLoader,
  setInventorysmartProductStoreInventorySourceMappingConfigLoader,
  resetProductStoreInventorySourceMappingStore,
} = inventorySmartProductStoreInventorySourceMappingService.actions;

export const getProductStoreInventorySourceTableConfig = (postBody) => () => {
  return axiosInstance({
    url: `${FETCH_TABLE_CONFIG}${postBody.tableConfigName}`,
    method: "GET",
  });
};

export const getProductStoreInventorySourceData = (postBody) => () => {
  return axiosInstance({
    url: PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_LIST,
    method: "POST",
    data: postBody,
  });
};

export const saveProductStoreInventorySourceMapping = (postBody) => () => {
  return axiosInstance({
    url: PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_LIST,
    method: "PUT",
    data: postBody,
  });
};

export const saveProductStoreInventorySourceMappingSingle = (postBody) => () => {
  return axiosInstance({
    url: PRODUCT_STORE_INVENTORY_SOURCE_MAPPING_INDIVIDUAL_ROWS,
    method: "PUT",
    data: postBody,
  });
}

export default inventorySmartProductStoreInventorySourceMappingService.reducer;
