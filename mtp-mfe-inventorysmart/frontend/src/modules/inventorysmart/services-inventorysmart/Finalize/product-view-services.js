import { createSlice } from "@reduxjs/toolkit";
import {
  DOWNLOAD_SELECTED_PRODUCT_STORE_DETAILS,
  DOWNLOAD_MASTER_PRODUCT_STORE_SIZE_VIEW,
  GET_PRODUCT_VIEWS,
  GET_PRODUCT_VIEW_SUMMARY,
  HLE_ENABLE_EDIT,
  HLE_RESET_TO_ORIGINAL
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";
import { config } from "../../../../config";

export const inventorySmartFinalizeProductViewService = createSlice({
  name: "inventorySmartFinalizeProductViewService",
  initialState: {
    productStoreViewSummaryLoader: false,
    productViewLoader: false,
    selectedFilters: [],
    formFilters: {},
    isFiltersValid: false,
    articleTableLoader: false,
    viewPlanTableConfigLoader: false,
    createAllocationArticles: [],
    viewPlansTableConfig: [],
    viewPlansTableData: [],
    articlesTableData: {},
    storeDcTableLoader: false,
    invalidAllocation: false,
    storeDetialsTableDataForFinalize: null,
    inventorySmartFinalizeFilterDependency: [],
    redirectedFrom: null,
  },
  reducers: {
    setProductStoreViewSummaryLoader: (state, action) => {
      state.productStoreViewSummaryLoader = action.payload;
    },
    setProductViewLoader: (state, action) => {
      state.productViewLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setFormFilters: (state, action) => {
      state.formFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setArticleTableLoader: (state, action) => {
      state.articleTableLoader = action.payload;
    },
    setViewPlanTableConfigLoader: (state, action) => {
      state.viewPlanTableConfigLoader = action.payload;
    },
    setCreateAllocationArticles: (state, action) => {
      state.createAllocationArticles = action.payload;
    },
    setViewPlanTableConfiguration: (state, action) => {
      state.viewPlansTableConfig = action.payload;
    },
    setViewPlanTableData: (state, action) => {
      state.viewPlansTableData = action.payload;
    },
    setArticlesTableData: (state, action) => {
      state.articlesTableData = action.payload;
    },
    setStoreDcTableLoader: (state, action) => {
      state.storeDcTableLoader = action.payload;
    },
    setStoreDetailsTableData: (state, action) => {
      state.storeDetialsTableDataForFinalize = action.payload;
    },
    setInvalidAllocation: (state, action) => {
      state.invalidAllocation = action.payload;
    },
    setInventorySmartFinalizeFilterDependency: (state, action) => {
      state.inventorySmartFinalizeFilterDependency = action.payload;
    },
    setRedirectedFrom: (state, action) => {
      state.redirectedFrom = action.payload;
    },
    resetProductView: (state, _action) => {
      state.productStoreViewSummaryLoader = false;
      state.productViewLoader = false;
      state.selectedFilters = [];
      state.formFilters = {};
      state.isFiltersValid = false;
      state.articleTableLoader = false;
      state.viewPlanTableConfigLoader = false;
      state.viewPlansTableConfig = [];
      state.viewPlansTableData = [];
      state.storeDcTableLoader = false;
      state.invalidAllocation = false;
      state.storeDetialsTableDataForFinalize = null;
      state.inventorySmartFinalizeFilterDependency = [];
      state.redirectedFrom = null;
    },
  },
});

export const {
  setProductStoreViewSummaryLoader,
  setProductViewLoader,
  setSelectedFilters,
  setFormFilters,
  setIsFiltersValid,
  setArticleTableLoader,
  setViewPlanTableConfigLoader,
  setCreateAllocationArticles,
  setViewPlanTableConfiguration,
  setViewPlanTableData,
  setArticlesTableData,
  setStoreDcTableLoader,
  setStoreDetailsTableData,
  setInvalidAllocation,
  setInventorySmartFinalizeFilterDependency,
  setRedirectedFrom,
  resetProductView,
} = inventorySmartFinalizeProductViewService.actions;

export const getProductViewSummary = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_VIEW_SUMMARY,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getProductView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_VIEWS,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const downloadSelectedProductStoreDetails = (payload, isV3) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_SELECTED_PRODUCT_STORE_DETAILS}/download`,
    method: "POST",
    data: payload,
    isV3,
  });
};

export const downloadMasterProductStoreSizeView = (payload, isV3) => () => {
  return axiosInstance({
    url: `${DOWNLOAD_MASTER_PRODUCT_STORE_SIZE_VIEW}/download`,
    method: "POST",
    data: payload,
    isV3,
  });
};

export const callUpdateToggleAPI = (postBody) => () => {
  return axiosInstance({
    url: HLE_ENABLE_EDIT,
    method: "POST",
    data: postBody,
  });
};

export const hleResetToOriginal = (postBody) => () => {
  return axiosInstance({
    url: HLE_RESET_TO_ORIGINAL,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartFinalizeProductViewService.reducer;
