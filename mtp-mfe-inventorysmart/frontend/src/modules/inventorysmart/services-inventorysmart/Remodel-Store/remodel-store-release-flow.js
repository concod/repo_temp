import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";
import {RELEASE_NEW_STORE_PRODUCTS, RELEASE_FLOW_ARTICLE_LIST, RELEASE_FLOW_STORE_LIST} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const remodelStoreReleaseFlowService = createSlice({
  name: "remodelStoreReleaseFlowService",
  initialState: {
    remodelStoreReleaseFlowLoader: false,
  },
  reducers: {
    setRemodelStoreReleaseFlowLoader: (state, action) => {
      state.remodelStoreReleaseFlowLoader = action.payload;
    },
  },
});

export const {
  setRemodelStoreReleaseFlowLoader,
} = remodelStoreReleaseFlowService.actions;

export const releaseRemodelStoreApprovedProducts = (body) => () => {
    return axiosInstance({
      url: RELEASE_NEW_STORE_PRODUCTS,
      method: "POST",
      data: body,
    });
  };
  
  export const fetchRemodelStoreReleaseStoreDetails = (id) => () => {
    return axiosInstance({
      url: RELEASE_FLOW_STORE_LIST + "/" + id,
      method: "GET",
    });
  };
  
  export const fetchRemodelStoreReleaseApprovedList = (id) => () => {
    return axiosInstance({
      url: RELEASE_FLOW_ARTICLE_LIST + "/" + id,
      method: "GET",
    });
  };

  export default remodelStoreReleaseFlowService.reducer;
