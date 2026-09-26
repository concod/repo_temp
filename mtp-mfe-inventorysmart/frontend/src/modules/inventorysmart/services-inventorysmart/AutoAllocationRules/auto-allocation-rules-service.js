import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { DELETE_AUTO_ALLOCATION_RULE, GET_ALLOCATION_RULES_LIST } from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const autoAllocationRulesService = createSlice({
  name: "autoAllocationRulesService",
  initialState: {
    tableData: {},
    tableLoader: false,
  },
  reducers: {
    setAutoAllocationRulesTableData: (state, action) => {
      state.tableData = action.payload;
    },
    setAutoAllocationRulesTableLoader: (state, action) => {
      state.tableLoader = action.payload;
    },
  },
});

export const getAllocationRulesListTableData = (postbody) => ()   => {
  return axiosInstance({
    url: GET_ALLOCATION_RULES_LIST,
    method: "POST",
    data: postbody,
  });
};

export const deleteAllocationRule = (payload) => ()  => {
  return axiosInstance({
    url: DELETE_AUTO_ALLOCATION_RULE,
    method: "POST",
    data: payload,
  });
};

export const {
  setAutoAllocationRulesTableData,
  setAutoAllocationRulesTableLoader,
} = autoAllocationRulesService.actions;

export default autoAllocationRulesService.reducer;
