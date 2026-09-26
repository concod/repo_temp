import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

import {
  GET_USER_CREATED_TABLE_DATA,
  GET_IA_RECOMMENDED_TABLE_DATA,
  GET_STORE_SIZE_CONTRIBUTION_DATA,
  GET_STYLE_COLOR_DESCRIPTION_DATA,
  DELETE_USER_PRODUCT_PROFILE,
  GET_STORE_BAND_CONTRIBUTION_DATA,
  UPDATE_STORE_CONTRIBUTION_DATA,
  UPDATE_SET_ALL_STORE_CONTRIBUTION,
  UPDATE_IA_STORE_CONTRIBUTION,
  FETCH_IA_EDITS_SAVED_DATA
} from "../../constants-inventorysmart/apiConstants";

export const productProfileDashboardService = createSlice({
  name: "productProfileDashboardService",
  initialState: {
    productProfileTableLoader: false,
    productProfileDashboardFilterConfig: [],
    userProductProfileDashboardFilterConfig: [],
    tableDataIARecommended: [],
    tableDataUserCreated: [],
    initialUserStoreSizeContributionTableData: [],
    productProfileModuleConfig: {},
    initialIAStoreSizeContributionTableData: [],
  },
  reducers: {
    setProductProfileDashboardFilterConfig: (state, action) => {
      state.productProfileDashboardFilterConfig = action.payload;
    },
    setUserProductProfileDashboardFilterConfig: (state, action) => {
      state.userProductProfileDashboardFilterConfig = action.payload;
    },
    setProductProfileTableLoader: (state, action) => {
      state.productProfileTableLoader = action.payload;
    },
    setIARecommendedTableData: (state, action) => {
      state.tableDataIARecommended = action.payload;
    },
    setUserCreatedTableData: (state, action) => {
      state.tableDataUserCreated = action.payload;
    },
    setInitialUserStoreSizeContributionData: (state, action) => {
      state.initialUserStoreSizeContributionTableData = action.payload;
    },
    setProductProfileModuleConfig: (state, action) => {
      state.productProfileModuleConfig = action.payload;
    },
    setInitialIAStoreSizeContributionTableData: (state, action) => {
      state.initialIAStoreSizeContributionTableData = action.payload;
    },
    resetProductProfile: (state) => {
      state.productProfileTableLoader = false;
      state.productProfileDashboardFilterConfig = [];
      state.tableDataIARecommended = [];
      state.tableDataUserCreated = [];
      state.initialUserStoreSizeContributionTableData = [];
      state.userProductProfileDashboardFilterConfig = [];
      state.productProfileModuleConfig = {};
      state.initialIAStoreSizeContributionTableData = [];
    },
  },
});

export const {
  setProductProfileDashboardFilterConfig,
  setUserProductProfileDashboardFilterConfig,
  setIARecommendedTableData,
  setUserCreatedTableData,
  setInitialUserStoreSizeContributionData,
  resetProductProfile,
  setProductProfileTableLoader,
  setProductProfileModuleConfig,
  setInitialIAStoreSizeContributionTableData,
} = productProfileDashboardService.actions;

export const getCustomFiltersData = (postBody, apiUrl) => () => {
  return axiosInstance({
    url: apiUrl,
    method: "POST",
    data: postBody,
  });
};

export const getIARecommededTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_IA_RECOMMENDED_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getUserCreatedTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_USER_CREATED_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getStoreSizeContributionData = (data) => () => {
  return axiosInstance({
    url: GET_STORE_SIZE_CONTRIBUTION_DATA + data.screen,
    method: "POST",
    data: data.body,
  });
};

export const getStyleColorDescriptionData = (pp_code) => () => {
  return axiosInstance({
    url: `${GET_STYLE_COLOR_DESCRIPTION_DATA}?pp_code=${pp_code}`,
    method: "GET",
    data: {},
  });
};

export const deleteUserProductProfile = (id) => () => {
  return axiosInstance({
    url: DELETE_USER_PRODUCT_PROFILE + "/" + id,
    method: "DELETE",
    data: {},
  });
};

export const getStoreBandContributionData = (data) => () => {
  return axiosInstance({
    url: GET_STORE_BAND_CONTRIBUTION_DATA,
    method: "POST",
    data: data,
  });
};

export const updateUserStoreContribution = (data) => () => {
  return axiosInstance({
    url: UPDATE_STORE_CONTRIBUTION_DATA + data.screen,
    method: "POST",
    data: data.body,
  });
};

export const updateSetAllStoreSizeContribution = (data) => () => {
  return axiosInstance({
    url: UPDATE_SET_ALL_STORE_CONTRIBUTION,
    method: "POST",
    data: data,
  });
};

export const updateIAStoreContribution = (data) => () => {
  return axiosInstance({
    url: UPDATE_IA_STORE_CONTRIBUTION,
    method: "POST",
    data: data,
  });
};

export const getIAEditsSavedData = (data) => () => {
  return axiosInstance({
    url: FETCH_IA_EDITS_SAVED_DATA,
    method: "POST",
    data: data,
  });
};

export default productProfileDashboardService.reducer;
