import { createSlice } from "@reduxjs/toolkit";
import { GET_ALL_STORES, GET_SUPERSESSION_PRODUCTS_MAPPING_REVIEW_DATA, STORE_DATA } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartProductSupersessionReviewMappingService = createSlice(
  {
    name: "inventorySmartProductSupersessionReviewMappingService",
    initialState: {
      inventorysmartReviewSizeMappingTableLoader: false,
      inventorysmartReviewMappingTableLoader: false,
      inventorysmartReviewMappingDataLoader: false,
      modifiedProductMapping: [],
    },
    reducers: {
      setInventorysmartReviewSizeMappingTableLoader: (state, action) => {
        state.inventorysmartReviewSizeMappingTableLoader = action.payload;
      },
      setInventorysmartReviewMappingTableLoader: (state, action) => {
        state.inventorysmartReviewMappingTableLoader = action.payload;
      },
      setInventorysmartReviewMappingDataLoader: (state, action) => {
        state.inventorysmartReviewMappingDataLoader = action.payload;
      },
      setModifiedProductMapping: (state, action) => {
        state.modifiedProductMapping = action.payload;
      },
      resetReviewProductMappingStore: (state, _action) => {
        state.inventorysmartReviewSizeMappingTableLoader = false;
        state.inventorysmartReviewMappingTableLoader = false;
        state.inventorysmartReviewMappingDataLoader = false;
        state.modifiedProductMapping = [];
      },
    },
  }
);

export const {
  setInventorysmartReviewSizeMappingTableLoader,
  setInventorysmartReviewMappingTableLoader,
  setInventorysmartReviewMappingDataLoader,
  setModifiedProductMapping,
  resetReviewProductMappingStore,
} = inventorySmartProductSupersessionReviewMappingService.actions;

export const getProductMappingReviewData = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPERSESSION_PRODUCTS_MAPPING_REVIEW_DATA,
    method: "POST",
    data: postBody,
  });
};

export const saveProductMappingReviewData = (postBody) => () => {
  return axiosInstance({
    url: GET_SUPERSESSION_PRODUCTS_MAPPING_REVIEW_DATA,
    method: "PUT",
    data: postBody,
  });
};

export const getStore = (postBody) => () => {
  return axiosInstance({
    url: `${STORE_DATA}?page=1&page_size=100000`,
    method: "POST",
    data: postBody,
  });
};

export const getAllStores = (postBody) => () => {
  return axiosInstance({
    url: `${GET_ALL_STORES}?store_level=store&page=1&page_size=100000`,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartProductSupersessionReviewMappingService.reducer;
