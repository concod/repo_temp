import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  GET_STORE_VIEW_SUMMARY,
  GET_STORE_VIEW,
  GET_STORE_PRODUCT_VIEW,
  GET_PRODUCT_STORE_VIEW,
  GET_PRODUCT_SIZE_VIEW,
  GET_STORE_SIZE_VIEW,
  GET_PRODUCT_SIZE_STORE_VIEW,
  GET_VIEW_PACK_CONFIGURATION,
  FINALIZE_ENABLE_EDIT,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

const initialState = {
  allocationCode: null,
  originalAllocationCode: null,
  planStatus: null,
  planType: null,
  articles: undefined,
  selectedArticle: null,
  selectedArticles: null,
  displayArticle: null,
  fetchArticleSummary: null,
  fetchProductDetails: null,
  fetchProductStoreDetails: null,
  fetchProductSizeDetails: null,
  fetchStoreDetails: null,
  // Bumped after every successful edit apply in the new-flow product view.
  // Monotonic so consumers can tell a real bump from their own mount run.
  productViewRefreshToken: 0,
  // null = not yet fetched; array = latest pack-configuration list (product view).
  packConfigurations: null,
  // Per-article cache for store-product-size. Keyed by String(article).
  packConfigByArticle: {},
};

export const inventorySmartNewFlowStoreViewService = createSlice({
  name: "inventorySmartNewFlowStoreViewService",
  initialState,
  reducers: {
    setAllocationCode: (state, action) => {
      state.allocationCode = action.payload;
    },
    setOriginalAllocationCode: (state, action) => {
      state.originalAllocationCode = action.payload;
    },
    setPlanStatus: (state, action) => {
      state.planStatus = action.payload;
    },
    setPlanType: (state, action) => {
      state.planType = action.payload;
    },
    setArticle: (state, action) => {
      state.articles = action.payload;
    },
    setSelectedArticle: (state, action) => {
      state.selectedArticle = action.payload;
    },
    setSelectedArticles: (state, action) => {
      state.selectedArticles = action.payload;
    },
    setDisplayArticle: (state, action) => {
      state.displayArticle = action.payload;
    },
    setFetchArticleSummary: (state, action) => {
      state.fetchArticleSummary = action.payload;
    },
    setFetchProductDetails: (state, action) => {
      state.fetchProductDetails = action.payload;
    },
    setFetchProductStoreDetails: (state, action) => {
      state.fetchProductStoreDetails = action.payload;
    },
    setFetchProductSizeDetails: (state, action) => {
      state.fetchProductSizeDetails = action.payload;
    },
    setFetchStoreDetails: (state, action) => {
      state.fetchStoreDetails = action.payload;
    },
    refreshProductViews: (state) => {
      state.productViewRefreshToken += 1;
      state.packConfigurations = null;
      state.packConfigByArticle = {};
    },
    setPackConfigurations: (state, action) => {
      state.packConfigurations = action.payload;
      if (action.payload === null) {
        state.packConfigByArticle = {};
      }
    },
    setPackConfigForArticle: (state, action) => {
      const article = action.payload?.article;
      if (article == null || article === "") return;
      state.packConfigByArticle[String(article)] =
        action.payload.configs || [];
    },
    resetNewFlowStoreView: () => initialState,
  },
});

export const {
  setAllocationCode,
  setOriginalAllocationCode,
  setPlanStatus,
  setPlanType,
  setArticle,
  setSelectedArticle,
  setSelectedArticles,
  setDisplayArticle,
  setFetchArticleSummary,
  setFetchProductDetails,
  setFetchProductStoreDetails,
  setFetchProductSizeDetails,
  setFetchStoreDetails,
  refreshProductViews,
  setPackConfigurations,
  setPackConfigForArticle,
  resetNewFlowStoreView,
} = inventorySmartNewFlowStoreViewService.actions;

export const getStoreViewSummary = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_STORE_VIEW_SUMMARY,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getStoreView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_STORE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getStoreProductView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_STORE_PRODUCT_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getProductStoreView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_STORE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getProductSizeView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_SIZE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getStoreSizeView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_STORE_SIZE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getProductSizeStoreView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_SIZE_STORE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getViewPackConfiguration = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_VIEW_PACK_CONFIGURATION,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const enableEdit = (postBody) => () => {
  return axiosInstance({
    url: FINALIZE_ENABLE_EDIT,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartNewFlowStoreViewService.reducer;
