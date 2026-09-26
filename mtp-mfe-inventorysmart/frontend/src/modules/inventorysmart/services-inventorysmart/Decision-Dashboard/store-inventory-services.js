import { createSlice } from "@reduxjs/toolkit";
import {
  STORE_INVENTORY_TABLE_CONFIG,
  FETCH_TABLE_CONFIG,
  ARTICLE_INVENTORY_TABLE_CONFIG,
  STORE_INVENTORY_TABLE_DATA,
  ARTICLE_INVENTORY_TABLE_DATA,
  STORE_DETAILS_AT_SIZES,
  GET_INVENTORY_DETAILS,
  CLOUD_FUNCTIONS_URL,
  FILTER_PLAN,
  ALAN_SUMMARY,
  CLOUD_FUNCTIONS_BASE_URL,
  ALAN_PRODUCT_INSIGHT,
  getAdvanceFilteringUrl,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";
import axios from "axios";

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

export const getStoreInventoryTableConfiguration = (tableName) => () => {
  return axiosInstance({
    url: tableName ? `${FETCH_TABLE_CONFIG}${tableName}` : STORE_INVENTORY_TABLE_CONFIG,
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

export const getArticleInventoryTableData = (postBody) => () => {
  return axiosInstance({
    url: ARTICLE_INVENTORY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getInventoryDetails = (body) => () => {
  return axiosInstance({
    url: GET_INVENTORY_DETAILS,
    method: "POST",
    data: body,
  });
};

export const getAlanSummary = (body) => () => {
  const INVENTORY_DETAILS_ALAN_SUMMARY = `${CLOUD_FUNCTIONS_BASE_URL}${ALAN_PRODUCT_INSIGHT}`;
  return axios.post(INVENTORY_DETAILS_ALAN_SUMMARY, body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const fetchFilterPlansData = async (body, isProdCloudFunction = false) => {
  const FILTER_PLANS_API = getAdvanceFilteringUrl(isProdCloudFunction);
  try {
    const response = await fetch(FILTER_PLANS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(body), 
    });

    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const getFilterPlan = async (body) =>  {
  const FILTER_PLAN_API = `${CLOUD_FUNCTIONS_URL}${FILTER_PLAN}`;
  try {
    const response = await fetch(FILTER_PLAN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify(body),
    });

    return await response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * getAggregatedSummary
 * Calls the aggregated insights cloud function.
 */
export const getAggregatedSummary = async (body) => {
  const AGGREGATED_SUMMARY_API = `${CLOUD_FUNCTIONS_URL}${ALAN_SUMMARY}`;
  const response = await fetch(AGGREGATED_SUMMARY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`);
    err.status = response.status;
    try {
      const errBody = await response.json();
      err.detail = errBody?.detail || null;
    } catch (_) {}
    throw err;
  }

  return await response.json();
};

export default inventorySmartStoreInventoryService.reducer;
