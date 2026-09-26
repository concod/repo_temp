import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { cloneDeep } from "lodash";
import {
  STORE_TRANSFER_LIST,
  STORE_TRANSFER_CREATION,
  STORE_TRANSFER_SET_ALL,
  STORE_TRANSFER_SAVE
} from "../../constants-inventorysmart/apiConstants";

export const storeTransferConfigurationService = createSlice({
  name: "storeTransferConfigurationService",
  initialState: {
    storeTransferConfigLoader: false,
    storeTransferConfigData: [],
    storeTransferConfigVisible: false,
    storeTransferFilterConfiguration: [],
    storeTransferFiltersState: {},
    storeTransferModuleConfig: null,
  },
  reducers: {
    setStoreTransferConfigLoader: (state, action) => {
      state.storeTransferConfigLoader = action.payload;
    },
    setStoreTransferConfigData: (state, action) => {
      state.storeTransferConfigData = action.payload;
    },
    setStoreTransferConfigVisible: (state, action) => {
      state.storeTransferConfigVisible = action.payload;
    },
    resetStoreTransferConfig: (state) => {
      state.storeTransferConfigData = [];
      state.storeTransferConfigLoader = false;
      state.storeTransferFilterConfiguration = [];
      state.storeTransferFiltersState = {};
    },
    setStoreTransferFilterConfiguration: (state, action) => {
      state.storeTransferFilterConfiguration = action.payload;
    },
    saveStoreTransferFiltersState: (state, action) => {
      state.storeTransferFiltersState = action.payload;
    },
    setStoreTransferModuleConfig: (state, action) => {
      state.storeTransferModuleConfig = action.payload;
    },
  },
});

export const {
  setStoreTransferConfigLoader,
  setStoreTransferConfigData,
  setStoreTransferConfigVisible,
  resetStoreTransferConfig,
  setStoreTransferFilterConfiguration,
  saveStoreTransferFiltersState,
  setStoreTransferModuleConfig,
} = storeTransferConfigurationService.actions;

// API endpoints for Store Transfer Configuration
export const getStoreTransferList = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_LIST,
    method: "POST",
    data: postbody,
  });
};

export const getStoreTransferCreation = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_CREATION,
    method: "POST",
    data: postbody,
  });
};

export const setStoreTransferSetAll = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_SET_ALL,
    method: "POST",
    data: postbody,
  });
};

export const saveStoreTransferConfiguration = (postbody) => () => {
  return axiosInstance({
    url: STORE_TRANSFER_SAVE,
    method: "POST",
    data: postbody,
  });
};

export default storeTransferConfigurationService.reducer;
