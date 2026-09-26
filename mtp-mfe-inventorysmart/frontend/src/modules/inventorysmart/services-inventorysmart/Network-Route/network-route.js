import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

import {
  DC_DATA,
  NETWORK_DROPDOWN_OPTIONS,
  CREATE_NETWORK_ROUTE,
  GET_NETWORK_LIST,
  GET_NETWORK_BY_ID,
  UPDATE_NETWORK_ROUTE,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const networkRouteService = createSlice({
  name: "networkRouteService",
  initialState: {
    networkRouteTableConfigLoader: false,
    networkRouteTableDataLoader: false,
  },
  reducers: {
    setNetworkRouteTableDataLoader: (state, action) => {
      state.networkRouteTableDataLoader = action.payload;
    },
    setNetworkRouteTableConfigLoader: (state, action) => {
      state.networkRouteTableConfigLoader = action.payload;
    },
  },
});

export const {
  setNetworkRouteTableConfigLoader,
  setNetworkRouteTableDataLoader,
} = networkRouteService.actions;

export const getNetwork = (postBody) => () => {
  return axiosInstance({
    url: GET_NETWORK_LIST,
    method: "POST",
    data: postBody,
  });
};

export const getDropDownOptions = (postBody) => () => {
  return axiosInstance({
    url: NETWORK_DROPDOWN_OPTIONS,
    method: "POST",
    data: postBody,
  });
};
export const createNetworkRoute = (postBody) => () => {
  return axiosInstance({
    url: CREATE_NETWORK_ROUTE,
    method: "POST",
    data: postBody,
  });
};
export const updateNetworkRoute = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_NETWORK_ROUTE,
    method: "POST",
    data: postBody,
  });
};
export const getNetworkRouteByID = (postBody) => () => {
  return axiosInstance({
    url: `${GET_NETWORK_BY_ID}${postBody}`,
    method: "GET",
  });
};

export default networkRouteService.reducer;
