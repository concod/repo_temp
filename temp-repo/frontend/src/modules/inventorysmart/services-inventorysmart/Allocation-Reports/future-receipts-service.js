import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {
  GET_FUTURE_RECEIPTS_TABLE_DATA,
  SAVE_FUTURE_RECEIPTS_TARGET_WOS,
  GET_FUTURE_RECEIPTS_SUB_ROWS_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const additionalReportsService = createSlice({
  name: "additionalReportsService",
  initialState: {
    futureReceiptsLoader: false,
    futureReceiptsTableLoader: false,
    futureReceiptsTableData: [],
    futureReceiptsFilterConfiguration: [],
  },
  reducers: {
    setFutureReceiptsLoader: (state, action) => {
      state.futureReceiptsLoader = action.payload;
    },
    setFutureReceiptsTableLoader: (state, action) => {
      state.futureReceiptsTableLoader = action.payload;
    },
    setFutureReceiptsTableData: (state, action) => {
      state.futureReceiptsTableData = action.payload;
    },
    setFutureReceiptsFilterConfiguration: (state, action) => {
      state.futureReceiptsFilterConfiguration = action.payload;
    },
    clearFutureReceiptStates: (state) => {
      state.futureReceiptsLoader = false;
      state.futureReceiptsTableData = [];
      state.futureReceiptsFilterConfiguration = [];
    },
  },
});

export const {
  setFutureReceiptsLoader,
  setFutureReceiptsTableData,
  setFutureReceiptsFilterConfiguration,
  clearFutureReceiptStates,
  setFutureReceiptsTableLoader,
} = additionalReportsService.actions;

export const getFutureReceiptsTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_FUTURE_RECEIPTS_TABLE_DATA,
    method: "POST",
    data: postbody,
  });
};

export const getFutureReceiptsSubRowsData = (postbody) => () => {
  return axiosInstance({
    url: GET_FUTURE_RECEIPTS_SUB_ROWS_DATA,
    method: "POST",
    data: postbody,
  });
};

export const saveFutureReceiptsTargetWos = (postbody) => () => {
  return axiosInstance({
    url: SAVE_FUTURE_RECEIPTS_TARGET_WOS,
    method: "POST",
    data: postbody,
  });
};

export default additionalReportsService.reducer;
