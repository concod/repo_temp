import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_DAILY_ALLOCATION_TABLE_DETAILS,
  GET_DAILY_ALLOCATION_ARTICLE_TO_STORE_VIEW,
  GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE,
  GET_DAILY_ALLOCATION_STORE_TO_ARTICLE_VIEW,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const dailyAllocationService = createSlice({
  name: "dailyAllocationService",
  initialState: {
    dailyAllocationScreenLoader: false,
    dailyAllocationTableData: [],
    dailyAllocationFilterConfiguration: [],
  },
  reducers: {
    setDailyAllocationScreenLoader: (state, action) => {
      state.dailyAllocationScreenLoader = action.payload;
    },
    setDailyAllocationTableData: (state, action) => {
      state.dailyAllocationTableData = action.payload;
    },
    setDailyAllocationFilterConfiguration: (state, action) => {
      state.dailyAllocationFilterConfiguration = action.payload;
    },
    clearDailyAllocationStates: (state) => {
      state.dailyAllocationScreenLoader = false;
      state.dailyAllocationTableData = [];
      state.dailyAllocationFilterConfiguration = [];
    },
  },
});

export const {
  setDailyAllocationScreenLoader,
  setDailyAllocationTableData,
  setDailyAllocationFilterConfiguration,
  clearDailyAllocationStates,
} = dailyAllocationService.actions;

export const getDailyAllocationTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_DAILY_ALLOCATION_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getDailyAllocationArticleToStore = (postbody) => () => {
  return axiosInstance({
    url: GET_DAILY_ALLOCATION_ARTICLE_TO_STORE_VIEW,
    method: "POST",
    data: postbody,
  });
};

export const getDailyAllocationStoreTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE,
    method: "POST",
    data: postbody,
  });
};

export const getDailyAllocationStoreToArticle = (postbody) => () => {
  return axiosInstance({
    url: GET_DAILY_ALLOCATION_STORE_TO_ARTICLE_VIEW,
    method: "POST",
    data: postbody,
  });
};

export default dailyAllocationService.reducer;
