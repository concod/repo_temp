import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import { RELEASE_FLOW_ARTICLE_LIST, RELEASE_FLOW_STORE_LIST , RELEASE_NEW_STORE_PRODUCTS} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const newStoreReleaseFlowService = createSlice({
  name: "newStoreReleaseFlowService",
  initialState: {
    newStoreReleaseFlowLoader: false,
  },
  reducers: {
    setNewStoreReleaseFlowLoader: (state, action) => {
      state.newStoreReleaseFlowLoader = action.payload;
    },
  },
});

export const { setNewStoreReleaseFlowLoader } =
  newStoreReleaseFlowService.actions;

export const releaseListOfArticles = (body) => () => {
  return axiosInstance({
    url: RELEASE_NEW_STORE_PRODUCTS,
    method: "POST",
    data: body,
  });
};

export const fetchReleaseFlowStoreList = (id) => () => {
  return axiosInstance({
    url: RELEASE_FLOW_STORE_LIST + "/" + id,
    method: "GET",
  });
};

export const fetchReleaseFlowApprovedList = (id) => () => {
  return axiosInstance({
    url: RELEASE_FLOW_ARTICLE_LIST + "/" + id,
    method: "GET",
  });
};

export default newStoreReleaseFlowService.reducer;
