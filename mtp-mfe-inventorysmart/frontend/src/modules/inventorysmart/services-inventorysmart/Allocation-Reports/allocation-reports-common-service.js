import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { GET_DC_OUTBOUND_PROJECTION_CHOICE_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { GET_DC_OUTBOUND_PROJECTION_CHOICE_CHANNEL_TABLE_DETAILS } from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import {
  GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS,
  GET_DAILY_ALLOCATION_SUMMARY_PRODUCT_VIEW,
  GET_DAILY_ALLOCATION_SUMMARY_STORE_VIEW,
  GET_EXCESS_INVENTORY_TABLE_DETAILS,
  GET_LOST_SALES_TABLE_DATA,
  GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS,
  GET_READINESS_TABLE_DETAILS,
  GET_FORECAST_ACCURACY_TABLE_DETAILS,
  GET_IN_STOCK_TABLE_DATA,
  GET_DAILY_ALLOCATION_TABLE_DETAILS,
  GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const allocationReportsCommonService = createSlice({
  name: "allocationReportsCommonService",
  initialState: {
    allocationReportsLoader: false,
    allocationReportsConfiguration: {},
    aggregates: null,
    moduleConfig: {},
  },
  reducers: {
    setAllocationReportsLoader: (state, action) => {
      state.allocationReportsLoader = action.payload;
    },
    setAllocationReportsConfiguration: (state, action) => {
      state.allocationReportsConfiguration = action.payload;
    },
    setAggregates: (state, action) => {
      state.aggregates = action.payload;
    },
    setModuleConfig: (state, action) => {
      const {key,value} = action.payload;
      state.moduleConfig = {
        ...state.moduleConfig,
        [key]: value
      }
    }
  },
});

export const {
  setAllocationReportsConfiguration,
  setAllocationReportsLoader,
  setAggregates,
  setModuleConfig
} = allocationReportsCommonService.actions;

export const downloadSSD = (postbody, path) => () => {
  path = path || GET_STORE_STOCK_DRILL_DOWN_STORE_LEVEL_TABLE_DETAILS;
  return axiosInstance({
    url: `${path}/download`,
    method: "POST",
    data: postbody
  })
}

export const downloadLostSales = (postbody) => () => {
  return axiosInstance({
    url: `${GET_LOST_SALES_TABLE_DATA}/download`,
    method: "POST",
    data: postbody
  })
}

export const downloadExcessInventory = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_EXCESS_INVENTORY_TABLE_DETAILS}/download`,
    method: "POST",
    data: postBody,
  });
}

export const downloadDASProduct = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_DAILY_ALLOCATION_SUMMARY_PRODUCT_VIEW}/download`,
    method: "POST",
    data: postBody,
  });
}

export const downloadDASStore = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_DAILY_ALLOCATION_SUMMARY_STORE_VIEW}/download`,
    method: "POST",
    data: postBody,
  });
}

export const downloadDASArticle = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_DAILY_ALLOCATION_TABLE_DETAILS}/download`,
    method: "POST",
    data: postBody,
  });
}

export const downloadDASDC = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_DAILY_ALLOCATION_TABLE_DETAILS_STORE}/download`,
    method: "POST",
    data: postBody,
  });
}

export const downloadDeepdive = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_ALLOCATION_DEEP_DIVE_TABLE_DETAILS}/download`,
    method: "POST",
    data: postBody,
  });
}

export const downloadReadiness = (postbody) => () => {
  return axiosInstance({
    url: `${GET_READINESS_TABLE_DETAILS}/${postbody.channel}/download`,
    method: "POST",
    data: postbody
  })
}

export const downloadForecast = (postbody) => () => {
  return axiosInstance({
    url: `${GET_FORECAST_ACCURACY_TABLE_DETAILS}/download`,
    method: "POST",
    data: postbody
  })
}

export const downloadDCOutboundChoiceChannel = (postbody) => () => {
  return axiosInstance({
    url: `${GET_DC_OUTBOUND_PROJECTION_CHOICE_CHANNEL_TABLE_DETAILS}/download`,
    method: "POST",
    data: postbody
  })
}

export const downloadDCOutboundChoice = (postbody) => () => {
  return axiosInstance({
    url: `${GET_DC_OUTBOUND_PROJECTION_CHOICE_TABLE_DETAILS}/download`,
    method: "POST",
    data: postbody
  })
}

export const downloadInStockArticle = (postbody) => () => {
  return axiosInstance({
    url: `${GET_IN_STOCK_TABLE_DATA}/article/download`,
    method: "POST",
    data: postbody
  })
}

export const downloadInStockStore = (postbody) => () => {
  return axiosInstance({
    url: `${GET_IN_STOCK_TABLE_DATA}/store/download`,
    method: "POST",
    data: postbody
  })
}

export default allocationReportsCommonService.reducer;
