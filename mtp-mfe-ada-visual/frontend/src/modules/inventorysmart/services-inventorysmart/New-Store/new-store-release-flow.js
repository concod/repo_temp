import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import { RELEASE_FLOW_ARTICLE_LIST } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

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
    url: RELEASE_FLOW_ARTICLE_LIST,
    method: "PATCH",
    data: body,
  });
};

export default newStoreReleaseFlowService.reducer;
