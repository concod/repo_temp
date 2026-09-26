import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";
import {
  GET_REMODEL_STORE_LIST,
  REMODEL_STORE_LIST_EDIT,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const remodelStoreAttributesService = createSlice({
  name: "remodelStoreAttributesService",
  initialState: {
    remodelStoreAttributesLoader: false,
    saveRemodelStoreDetailsForBackFlow: {},
    remodelStoreListDetails: {},
  },
  reducers: {
    setRemodelStoreAttributesLoader: (state, action) => {
      state.remodelStoreAttributesLoader = action.payload;
    },
    setRemodelStoreDetailsForBackFlow: (state, action) => {
      state.saveRemodelStoreDetailsForBackFlow = action.payload;
    },
    setRemodelStoreListDetails: (state, action) => {
      state.remodelStoreListDetails = action.payload;
    },
    clearRemodelStoreAttributesDetails: (state) => {
      state.remodelStoreAttributesLoader = false;
      state.saveRemodelStoreDetailsForBackFlow = {};
      state.remodelStoreListDetails = {};
    },
  },
});

export const {
  setRemodelStoreAttributesLoader,
  setRemodelStoreDetailsForBackFlow,
  clearRemodelStoreAttributesDetails,
  setRemodelStoreListDetails,
} = remodelStoreAttributesService.actions;

export const fetchRemodelStoreList = () => () => {
  return axiosInstance({
    url: GET_REMODEL_STORE_LIST,
    method: "GET",
  });
};

export const fetchRemodelIndividualStoreList = (storeCode) => () => {
  return axiosInstance({
    url: REMODEL_STORE_LIST_EDIT + `/${storeCode}`,
    method: "GET",
  });
};

export default remodelStoreAttributesService.reducer;
