import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { GET_DC_OUTBOUND_PROJECTION_GRAPH } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { GET_DC_OUTBOUND_PROJECTION_CHOICE_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { GET_DC_OUTBOUND_PROJECTION_CHOICE_CHANNEL_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const dcOutboundProjectionService = createSlice({
  name: "dcOutboundProjectionService",
  initialState: {
    dcOutboundProjectionTableLoader: false,
    dcOutboundProjectionGraphLoader: false,
    dcOutboundProjectionTableData: [],
    dcOutboundProjectionFilterConfiguration: [],
  },
  reducers: {
    setDcOutboundProjectionTableLoader: (state, action) => {
      state.dcOutboundProjectionTableLoader = action.payload;
    },
    setDcOutboundProjectionGraphLoader: (state, action) => {
        state.dcOutboundProjectionGraphLoader = action.payload;
    },
    setDcOutboundProjectionTableData: (state, action) => {
      state.dcOutboundProjectionTableData = action.payload;
    },
    setDcOutboundProjectionFilterConfiguration: (state, action) => {
      state.dcOutboundProjectionFilterConfiguration = action.payload;
    },
    clearDcOutboundProjectionStates: (state) => {
      state.dcOutboundProjectionTableData = [];
      state.dcOutboundProjectionFilterConfiguration = [];
    },
  },
});

export const {
  setDcOutboundProjectionTableData,
  setDcOutboundProjectionFilterConfiguration,
  clearDcOutboundProjectionStates,
  setDcOutboundProjectionTableLoader,
  setDcOutboundProjectionGraphLoader,
} = dcOutboundProjectionService.actions;

export const getDcOutboundProjectionChoiceChannelTableData = (
  postbody
) => () => {
  return axiosInstance({
    url: GET_DC_OUTBOUND_PROJECTION_CHOICE_CHANNEL_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getDcOutboundProjectionChoiceTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_DC_OUTBOUND_PROJECTION_CHOICE_TABLE_DETAILS,
    method: "POST",
    data: postbody,
  });
};

export const getDcOutboundProjectionGraphData = (postbody) => () => {
  return axiosInstance({
    url: GET_DC_OUTBOUND_PROJECTION_GRAPH,
    method: "POST",
    data: postbody,
  });
};

export default dcOutboundProjectionService.reducer;
