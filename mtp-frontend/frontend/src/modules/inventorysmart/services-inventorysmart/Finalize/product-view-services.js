import { createSlice } from "@reduxjs/toolkit";
import {
  GET_PRODUCT_VIEWS,
  GET_PRODUCT_VIEW_SUMMARY,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

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
    articleSummaryData: [],
    articleSummaryColumnData: [],
    vcpqErrorData: {},
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
    setArticleSummaryData: (state, action) => {
      state.articleSummaryData = action.payload;
    },
    setArticleSummaryColumnData: (state, action) => {
      state.articleSummaryColumnData = action.payload;
    },
    setVCPQErrorData: (state, action) => {
      state.vcpqErrorData = action.payload;
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
      state.articleSummaryData = [];
      state.articleSummaryColumnData = [];
      state.vcpqErrorData = {};
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
  setArticleSummaryData,
  setArticleSummaryColumnData,
  setVCPQErrorData,
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

export default inventorySmartFinalizeProductViewService.reducer;
