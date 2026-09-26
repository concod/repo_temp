import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { PRODUCT_LIFE_CYCLE_LIST, PRODUCT_LIFE_CYCLE_UPDATE, DOWNLOAD_USER_MAINTAINED_DATES } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const inventorySmartApplicationLifecycle = createSlice({
  name: "inventorySmartapplicationLifecycle",
  initialState: {
    inventorySmartApplicationLifeCycleLoader: false,
    inventorySmartApplicationLifeCycleTableLoader: false,
    inventorySmartApplicationLifeCycleTableData: [],
    inventorySmartApplicationLifeCycleFilterConfiguration: [],
  },
  reducers: {
    setInventorySmartApplicationLifeCycleLoader: (state, action) => {
      state.inventorySmartApplicationLifeCycleLoader = action.payload;
    },
    setInventorySmartApplicationLifeCycleTableLoader: (state, action) => {
      state.inventorySmartApplicationLifeCycleTableLoader = action.payload;
    },
    setInventorySmartApplicationLifeCycleTableData: (state, action) => {
      state.inventorySmartApplicationLifeCycleTableData = action.payload;
    },
    setInventorySmartApplicationLifeCycleFilterConfiguration: (
      state,
      action
    ) => {
      state.inventorySmartApplicationLifeCycleFilterConfiguration =
        action.payload;
    },
  },
});

export const {
  setInventorySmartApplicationLifeCycleLoader,
  setInventorySmartApplicationLifeCycleTableLoader,
  setInventorySmartApplicationLifeCycleTableData,
  setInventorySmartApplicationLifeCycleFilterConfiguration,
} = inventorySmartApplicationLifecycle.actions;

export const getProductLifeCycleList = (postBody) => () => {
  return axiosInstance({
    url: PRODUCT_LIFE_CYCLE_LIST,
    method: "POST",
    data: postBody
  });
};


export const updateProductLifeCycleDates = (postbody) => () => {
  return axiosInstance({
    url: `${PRODUCT_LIFE_CYCLE_UPDATE}`,
    method: "POST",
    data: postbody,
  });
};

export const DownloadRequest = (postBody) => () => {
  return axiosInstance({
    url: DOWNLOAD_USER_MAINTAINED_DATES,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartApplicationLifecycle.reducer;
