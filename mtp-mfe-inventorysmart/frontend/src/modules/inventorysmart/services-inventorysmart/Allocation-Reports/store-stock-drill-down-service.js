import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";
import { GET_STORE_STOCK_DRILL_DOWN_PRODUCT_VIEW_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

import {
  GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS,
  GET_STORE_STOCK_DRILL_DOWN_BAND_LEVEL_TABLE_DETAILS,
  GET_STORE_STOCK_DRILL_DOWN_STORE_SIZE_LEVEL_TABLE_DETAILS,
  GET_STORE_STOCK_DRILL_DOWN_ARTICLE_STORE_LEVEL_TABLE_DETAILS,
  GET_STORE_STOCK_DRILL_DOWN_ARTICLE_SIZE_LEVEL_TABLE_DETAILS,
  GET_INVENTORY_DETAILS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const storeStockDrillDownService = createSlice({
  name: "storeStockDrillDownService",
  initialState: {
    stockDrillDownTableLoader: false,
    popUpTableLoader:false,
    stockDrillDownTableData: [],
    stockDrillDownFilterConfigurationStore: [],
    stockDrillDownFilterConfigurationBand: [],
  },
  reducers: {
    setStockDrillDownTableLoader: (state, action) => {
      state.stockDrillDownTableLoader = action.payload;
    },
    setStockDrillDownFilterConfigurationStore: (state, action) => {
      state.stockDrillDownFilterConfigurationStore = action.payload;
    },
    setStockDrillDownFilterConfigurationBand: (state, action) => {
      state.stockDrillDownFilterConfigurationBand = action.payload;
    },
    setPopUpTableLoader: (state, action) => {
      state.popUpTableLoader = action.payload;
    },
    clearStoreStockDrillDownStates: (state) => {
      state.stockDrillDownTableData = [];
      state.stockDrillDownFilterConfigurationStore = [];
      state.stockDrillDownFilterConfigurationBand = [];
    },
  },
});

export const {
  setStockDrillDownFilterConfigurationStore,
  setStockDrillDownFilterConfigurationBand,
  setStockDrillDownTableLoader,
  clearStoreStockDrillDownStates,
  setPopUpTableLoader
} = storeStockDrillDownService.actions;

export const getStoreStockBandTableData = (postbody) => () => {

  if(postbody.filters){
    postbody.filters = postbody.filters.filter((filter) => {
      return filter.attribute_name !== "store_code"
    })
  }
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_BAND_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};
export const getStoreStockStoreTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};
export const getStoreStockStoreProductViewTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_PRODUCT_VIEW_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};
export const getStoreStockCartersTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getStoreSizeLevelData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_STORE_SIZE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody
  })
}

export const getArticleSizeLevelData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_ARTICLE_SIZE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
}

export const getStoreStockArticleStoreData = (postbody) => () => {
  return axiosInstance({
    url: GET_STORE_STOCK_DRILL_DOWN_ARTICLE_STORE_LEVEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getInventoryDetails = (body) => () => {
  return axiosInstance({
    url: GET_INVENTORY_DETAILS,
    method: "POST",
    data: body,
  });
};


export default storeStockDrillDownService.reducer;
