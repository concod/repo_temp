import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  RULE_GROUPS_LIST,
  RULE_GROUPS_CREATE,
  RULE_GROUPS_RULE,
  RULE_GROUPS_EXCEPTION,
  RULE_GROUPS_DELETE,
  RULE_GROUPS_SUMMARY,
  RULE_GROUPS_UPDATE,
  RULE_GROUPS_UPDATE_CONSTRAINTS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const ruleGroupService = createSlice({
  name: "ruleGroupService",
  initialState: {
    ruleGroupLoader: false,
    ruleGroupsTableData: [],
    manageConstraints: {
      preSelectedKeys: [],
      selectedCount: 0,
      loading: false,
    },
    editedRuleGroupRules: [],
  },
  reducers: {
    setRuleGroupLoader: (state, action) => {
      state.ruleGroupLoader = action.payload;
    },
    setRuleGroupsTableData: (state, action) => {
      state.ruleGroupsTableData = action.payload;
    },
    setManageConstraintsPreSelectedKeys: (state, action) => {
      state.manageConstraints.preSelectedKeys = action.payload;
      state.manageConstraints.selectedCount = action.payload.length;
    },
    setManageConstraintsSelectedCount: (state, action) => {
      state.manageConstraints.selectedCount = action.payload;
    },
    setManageConstraintsLoading: (state, action) => {
      state.manageConstraints.loading = action.payload;
    },
    resetManageConstraints: (state) => {
      state.manageConstraints.selectedCount = 0;
      state.manageConstraints.loading = false;
    },
    saveEditedRuleGroupRules: (state, action) => {
      state.editedRuleGroupRules = action.payload;
    },
  },
});

export const {
  setRuleGroupLoader,
  setRuleGroupsTableData,
  setManageConstraintsPreSelectedKeys,
  setManageConstraintsSelectedCount,
  setManageConstraintsLoading,
  resetManageConstraints,
  saveEditedRuleGroupRules,
} = ruleGroupService.actions;

export const getRuleGroupsList = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_LIST,
    method: "POST",
    data: postBody,
  });
};

export const createRuleGroup = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_CREATE,
    method: "POST",
    data: postBody,
  });
};

export const getRuleGroupRules = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_RULE,
    method: "POST",
    data: postBody,
  });
};

export const getRuleGroupExceptionList = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_EXCEPTION,
    method: "POST",
    data: postBody,
  });
};

export const deleteRuleGroups = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_DELETE,
    method: "DELETE",
    data: postBody,
  });
};

export const getRuleGroupsSummary = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_SUMMARY,
    method: "POST",
    data: postBody,
  });
};

export const updateRuleGroup = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_UPDATE,
    method: "PATCH",
    data: postBody,
  });
};

export const updateRuleGroupConstraints = (postBody) => {
  return axiosInstance({
    url: RULE_GROUPS_UPDATE_CONSTRAINTS,
    method: "PATCH",
    data: postBody,
  });
};

export default ruleGroupService.reducer;
