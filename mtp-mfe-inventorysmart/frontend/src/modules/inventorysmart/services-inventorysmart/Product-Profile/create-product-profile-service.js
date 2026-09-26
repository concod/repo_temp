import { createSlice } from "@reduxjs/toolkit";
import {
  GET_PRODUCTS_TO_SELECT,
  GET_PRODUCTS_STORE_SIZE_PENETRATION,
  SAVE_NEW_PRODUCT_PROFILE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "core/Utils/axios";

export const createProductProfileService = createSlice({
  name: "createProductProfileService",
  initialState: {
    newProductProfileLoader: false,
    newProductProfileFilterConfiguration: [],
    listOfProducts: [],
    listOfProductsPenetrationValue: [],
    createPPFilterDependency: [],
    createProductProfileModuleConfig: {},
  },
  reducers: {
    setNewProductProfileLoader: (state, action) => {
      state.newProductProfileLoader = action.payload;
    },
    setNewProductProfileFilterConfiguration: (state, action) => {
      state.newProductProfileFilterConfiguration = action.payload;
    },
    setProductsToSelectForProductProfile: (state, action) => {
      state.listOfProducts = action.payload;
    },
    setProductsStoreSizePenetration: (state, action) => {
      state.listOfProductsPenetrationValue = action.payload;
    },
    resetCreateProductProfile: (state) => {
      state.newProductProfileLoader = false;
      state.newProductProfileFilterConfiguration = [];
      state.listOfProducts = [];
      state.listOfProductsPenetrationValue = [];
      state.createPPFilterDependency = [];
      state.createProductProfileModuleConfig = {};
    },
    setCreatePPFilterDependency: (state, action) => {
      state.createPPFilterDependency = action.payload;
    },
    setCreateProductProfileModuleConfig: (state, action) => {
      state.createProductProfileModuleConfig = action.payload;
    },
  },
});

export const {
  setNewProductProfileLoader,
  setNewProductProfileFilterConfiguration,
  setProductsToSelectForProductProfile,
  setProductsStoreSizePenetration,
  resetCreateProductProfile,
  setCreatePPFilterDependency,
  setCreateProductProfileModuleConfig,
} = createProductProfileService.actions;

export const getProductsToSelectForProductProfile = (postbody) => () => {
  return axiosInstance({
    url: GET_PRODUCTS_TO_SELECT,
    method: "POST",
    data: postbody,
  });
};

export const getProductsStoreSizePenetration = (postbody) => () => {
  return axiosInstance({
    url: GET_PRODUCTS_STORE_SIZE_PENETRATION,
    method: "POST",
    data: postbody,
  });
};
export const saveProductProfile = (postbody) => () => {
  return axiosInstance({
    url: SAVE_NEW_PRODUCT_PROFILE,
    method: "POST",
    data: postbody,
  });
};

export const saveEditedProductProfile = (postbody) => () => {
  return axiosInstance({
    url: SAVE_NEW_PRODUCT_PROFILE,
    method: "PATCH",
    data: postbody,
  });
};

export default createProductProfileService.reducer;
