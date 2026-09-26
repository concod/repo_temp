import { createSlice } from "@reduxjs/toolkit";
import {
  STORE_INVENTORY_TABLE_CONFIG,
  ARTICLE_INVENTORY_TABLE_CONFIG,
  STORE_INVENTORY_TABLE_DATA,
  ARTICLE_INVENTORY_TABLE_DATA,
  STORE_DETAILS_AT_SIZES,
  PO_SIZE_MAP,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartStoreInventoryService = createSlice({
  name: "inventorySmartStoreInventoryService",
  initialState: {
    storeInventoryLoader: false,
    articleInventoryLoader: false,
    storeInventoryTableConfigLoader: false,
    articleInventoryTableConfigLoader: false,
    storeInventoryTableData: [],
    articleInventoryTableData: [],
  },
  reducers: {
    setStoreInventoryLoader: (state, action) => {
      state.storeInventoryLoader = action.payload;
    },
    setArticleInventoryLoader: (state, action) => {
      state.articleInventoryLoader = action.payload;
    },
    setStoreInventoryTableConfigLoader: (state, action) => {
      state.storeInventoryTableConfigLoader = action.payload;
    },
    setArticleInventoryTableConfigLoader: (state, action) => {
      state.articleInventoryTableConfigLoader = action.payload;
    },
    setStoreInventoryTableData: (state, action) => {
      state.storeInventoryTableData = action.payload;
    },
    setArticleInventoryTableData: (state, action) => {
      state.articleInventoryTableData = action.payload;
    },
    resetStoreInventoryState: (state, _action) => {
      state.storeInventoryLoader = false;
      state.articleInventoryLoader = false;
      state.storeInventoryTableConfigLoader = false;
      state.articleInventoryTableConfigLoader = false;
      state.storeInventoryTableData = [];
      state.articleInventoryTableData = [];
    },
  },
});

export const {
  setStoreInventoryLoader,
  setArticleInventoryLoader,
  setStoreInventoryTableConfigLoader,
  setArticleInventoryTableConfigLoader,
  setStoreInventoryTableData,
  setArticleInventoryTableData,
  resetStoreInventoryState,
} = inventorySmartStoreInventoryService.actions;

export const getStoreInventoryTableConfiguration = () => () => {
  return axiosInstance({
    url: STORE_INVENTORY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getStoreInventoryTableData = (postBody) => () => {
  return axiosInstance({
    url: STORE_INVENTORY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getStoreDetailsAtSizes = (postBody) => () => {
  return axiosInstance({
    url: STORE_DETAILS_AT_SIZES,
    method: "POST",
    data: postBody,
  });
};

export const getArticleInventoryTableConfiguration = () => () => {
  return axiosInstance({
    url: ARTICLE_INVENTORY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getArticleInventoryTableData = (postBody, isHidden) => () => {
  // isHidden is used to remove the exclusion filter from the filter, handled client specific
  return axiosInstance({
    url: ARTICLE_INVENTORY_TABLE_DATA,
    method: "POST",
    data: postBody,
    includeExclusionFilter: isHidden,
    excludeURLObject: null,
  });
};

export const getPOStoreCount = (payload) => () => {
  return axiosInstance({
    url: `${PO_SIZE_MAP}/${payload.po_code}/article/${payload.body.article}/details`,
    method: "GET",
  });
};

export const getStoreAndSizeValidation = (postBody, poCode) => () => {
  return axiosInstance({
    url: `${PO_SIZE_MAP}/${poCode}/validate`,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartStoreInventoryService.reducer;
