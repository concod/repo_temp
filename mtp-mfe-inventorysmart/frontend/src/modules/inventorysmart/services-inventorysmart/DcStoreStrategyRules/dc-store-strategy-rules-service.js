import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {  DELETE_DC_STORE_STRATEGY_RULE, GET_DC_STORE_STRATEGY_RULES_LIST } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const dcStoreStrategyRulesService = createSlice({
  name: "dcStoreStrategyRulesService",
  initialState: {
    tableData: {},
    tableLoader: false,
  },
  reducers: {
    setDCStoreStrategyRulesTableData: (state, action) => {
      state.tableData = action.payload;
    },
    setDCStoreStrategyTableLoader: (state, action) => {
      state.tableLoader = action.payload;
    },
  },
});

export const getDCStoreStrategyRulesListTableData = (postbody) => ()   => {
  return axiosInstance({
    url: GET_DC_STORE_STRATEGY_RULES_LIST,
    method: "POST",
    data: postbody,
  });
};

export const deleteDCStoreStrategyRule = (payload) => ()  => {
  return axiosInstance({
    url: DELETE_DC_STORE_STRATEGY_RULE,
    method: "POST",
    data: payload,
  });
};

export const {
  setDCStoreStrategyRulesTableData,
  setDCStoreStrategyTableLoader,
} = dcStoreStrategyRulesService.actions;

export default dcStoreStrategyRulesService.reducer;
