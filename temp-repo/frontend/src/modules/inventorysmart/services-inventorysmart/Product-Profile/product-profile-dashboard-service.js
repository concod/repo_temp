import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

import {
  GET_USER_CREATED_TABLE_DATA,
  GET_IA_RECOMMENDED_TABLE_DATA,
  GET_STORE_SIZE_CONTRIBUTION_DATA,
  GET_STYLE_COLOR_DESCRIPTION_DATA,
  DELETE_USER_PRODUCT_PROFILE,
  GET_STORE_SIZE_CONTRIBUTION_FOR_USER_DATA,
} from "../../constants-inventorysmart/apiConstants";

export const productProfileDashboardService = createSlice({
  name: "productProfileDashboardService",
  initialState: {
    productProfileDashboardLoader: false,
    productProfileTableLoader: false,
    productProfileDashboardFilterConfig: [],
    tableDataIARecommended: [],
    tableDataUserCreated: [],
    storeSizeContributionTableData: [],
    styleColorDescriptionData: [],
  },
  reducers: {
    setProductProfileDashboardFilterConfig: (state, action) => {
      state.productProfileDashboardFilterConfig = action.payload;
    },
    setProductProfileDashboardLoader: (state, action) => {
      state.productProfileDashboardLoader = action.payload;
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
    setStoreSizeContributionData: (state, action) => {
      state.storeSizeContributionTableData = action.payload;
    },
    setStyleColorDescriptionData: (state, action) => {
      state.styleColorDescriptionData = action.payload;
    },
    resetProductProfile: (state) => {
      state.productProfileDashboardLoader = false;
      state.productProfileTableLoader = false;
      state.productProfileDashboardFilterConfig = [];
      state.tableDataIARecommended = [];
      state.tableDataUserCreated = [];
      state.storeSizeContributionTableData = [];
      state.styleColorDescriptionData = [];
    },
  },
});

export const {
  setProductProfileDashboardFilterConfig,
  setProductProfileDashboardLoader,
  setIARecommendedTableData,
  setUserCreatedTableData,
  setStoreSizeContributionData,
  setStyleColorDescriptionData,
  resetProductProfile,
  setProductProfileTableLoader,
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
    url: `${GET_STORE_SIZE_CONTRIBUTION_DATA}?pp_code=${data.pp_code}&metrics=sale&channel=${data.channel}`,
    method: "GET",
    data: {},
  });
};

export const getStoreSizeContributionForUserData = (data) => () => {
  return axiosInstance({
    url: `${GET_STORE_SIZE_CONTRIBUTION_FOR_USER_DATA}?pp_code=${data.pp_code}&metrics=sale`,
    method: "GET",
    data: {},
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
export default productProfileDashboardService.reducer;
