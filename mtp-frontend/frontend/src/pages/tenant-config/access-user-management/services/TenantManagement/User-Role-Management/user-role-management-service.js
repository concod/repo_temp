import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "Utils/axios";
import {
  GET_ROLE_MGMT_FILTER_CONFIG,
  TABLE_HIERARCHY_ASSIGN_ROLE,
  FETCH_TABLE_BASED_ON_FILTER,
  GET_ROLE_MGMT_FILTER_ATTRIBUTES,
  GET_FILTERED_ATTRS_TO_ASSING_ROLE,
  SAVE_UPDATE_DELETE_USER_ROLE_MAPPING,
  GET_ROLE_MGMT_TABLE_CONFIG,
  ASSIGN_USER_ROLE_FORM_FILTERS,
  GET_URM_FILTERS_LIST,
} from "config/api";

export const userRoleManagementService = createSlice({
  name: "userRoleManagementService",
  initialState: {
    assignUserRoleMgmtLoader: false,
    loaderUserRoleMgmt: false,
    userRoleTableData: [],
    assignRoleToUserTable: [],
    assignRoleFilterList: [],
    filtersList: [],
    isSuperUser: false,
    planningLevelHierarchy: [],
    userLevelHierarchy: [],
    userAccessList: { create: {}, delete: {}, edit: {}, approve: {} },
    tenantDateFormat: "MM-DD-YYYY",
    tenantTimeZone: "",
    filter_attribute_exclusion_values: [],
    allAPIsIncludedInFilterExclusion: false,
    productDimensionHierarchy: [
      "product_channel_name",
      "l0_name",
      "l1_name",
      "l2_name",
    ],
    storeDimensionHierarchy: ["channel"],
    selectionAutoPopulate: {
      product: { article: ["l0_name", "l1_name", "l2_name"] },
      store: { group_id: ["channel"] },
    },
    filterDependency: [],
    ticketingConfig: {
      isEnabled: true,
    },
  },
  reducers: {
    setRolesMappedToUserData: (state, action) => {
      state.userRoleTableData = action.payload;
      state.loaderUserRoleMgmt = false;
    },
    setUserRoleMgmtLoader: (state, action) => {
      state.loaderUserRoleMgmt = action.payload;
    },
    setAssignRoleUserRoleMgmtLoader: (state, action) => {
      state.assignRoleUserRoleMgmtLoader = action.payload;
    },
    setFilterConfiguration: (state, action) => {
      state.filtersList = action.payload;
      state.loaderUserRoleMgmt = false;
    },
    setAssignRoleFilterConfiguration: (state, action) => {
      state.assignRoleFilterList = action.payload;
    },
    setTableHierarchyOnAssignRole: (state, action) => {
      state.assignRoleToUserTable = action.payload;
    },
    clearTableHierarchyOnAssignRole: (state, _action) => {
      state.assignRoleToUserTable = [];
      state.assignRoleFilterList = [];
    },
    clearUserRoleConfigStates: (state, _action) => {
      state.filtersList = [];
      state.userRoleTableData = [];
    },
    setIsSuperUser: (state, action) => {
      state.isSuperUser = action.payload;
    },
    setPlanningLevelHierarchy: (state, action) => {
      state.planningLevelHierarchy = action.payload;
    },
    setUserLevelHierarchy: (state, action) => {
      state.userLevelHierarchy = action.payload;
    },
    setUserAccessList: (state, action) => {
      state.userAccessList = action.payload;
    },
    setfilterAttributeExclusionValues: (state, action) => {
      state.filter_attribute_exclusion_values = action.payload;
    },
    setAllAPIsIncludedInFilterExclusion: (state, action) => {
      state.allAPIsIncludedInFilterExclusion = action.payload;
    },
    setTenantTimeconfig: (state, action) => {
      state.tenantTimeZone =
        action.payload?.[0]?.attribute_value?.value?.time_zone || "";
      state.tenantDateFormat =
        action.payload?.[0]?.attribute_value?.value?.time_format ||
        "MM-DD-YYYY";
    },
    setFilterDependency: (state, action) => {
      state.filterDependency = [...action.payload];
    },
    setTicketingModuleConfig: (state, action) => {
      state.ticketingConfig = { ...action.payload };
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setRolesMappedToUserData,
  setUserRoleMgmtLoader,
  setFilterConfiguration,
  setAssignRoleFilterConfiguration,
  setTableHierarchyOnAssignRole,
  setAssignRoleUserRoleMgmtLoader,
  clearTableHierarchyOnAssignRole,
  clearUserRoleConfigStates,
  setIsSuperUser,
  setPlanningLevelHierarchy,
  setUserLevelHierarchy,
  setFilterDependency,
  setUserAccessList,
  setTenantTimeconfig,
  setfilterAttributeExclusionValues,
  setAllAPIsIncludedInFilterExclusion,
  setTicketingModuleConfig,
} = userRoleManagementService.actions;

export const getFilterConfiguration = () => () => {
  return axiosInstance({
    url: GET_ROLE_MGMT_FILTER_CONFIG,
    method: "GET",
    data: "",
  });
};

export const getTableConfig = () => async () => {
  return axiosInstance({
    url: GET_ROLE_MGMT_TABLE_CONFIG,
    method: "GET",
  });
};

export const getTableHierarchyOnAssignRole = (postBody) => () => {
  return axiosInstance({
    url: TABLE_HIERARCHY_ASSIGN_ROLE,
    method: "POST",
    data: postBody,
  });
};

export const getFilteredAttributesToAssignRole = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_FILTERED_ATTRS_TO_ASSING_ROLE}`,
    method: "POST",
    data: postBody,
  });
};

export const getUserFilterAttributes = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_ROLE_MGMT_FILTER_ATTRIBUTES}`,
    method: "POST",
    data: postBody,
  });
};

export const saveUserRoleMappings = (postBody) => async () => {
  return axiosInstance({
    url: `${SAVE_UPDATE_DELETE_USER_ROLE_MAPPING}`,
    method: "POST",
    data: postBody,
  });
};

export const updateUserRoleMappings = (postBody) => async () => {
  return axiosInstance({
    url: `${SAVE_UPDATE_DELETE_USER_ROLE_MAPPING}`,
    method: "PUT",
    data: postBody,
  });
};

export const getRolesMappedToUserData = (postBody) => async () => {
  return axiosInstance({
    url: `${FETCH_TABLE_BASED_ON_FILTER}`,
    method: "POST",
    data: postBody,
  });
};

export const deleteRolesAssigned = (id) => async () => {
  return axiosInstance({
    url: `${SAVE_UPDATE_DELETE_USER_ROLE_MAPPING}/${id}`,
    method: "DELETE",
  });
};

export const getUserDetailsFormFilter = (postBody) => async () => {
  return axiosInstance({
    url: `${ASSIGN_USER_ROLE_FORM_FILTERS}`,
    method: "POST",
    data: postBody,
  });
};

export const getUrmFilters = (postBody) => async () => {
  const { data } = await axiosInstance({
    url: `${GET_URM_FILTERS_LIST}`,
    method: "POST",
    data: postBody,
  });

  return data.data;
};

export default userRoleManagementService.reducer;
