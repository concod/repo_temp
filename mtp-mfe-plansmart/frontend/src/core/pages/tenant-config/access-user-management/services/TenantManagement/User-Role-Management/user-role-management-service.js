import { createSelector, createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";
import {
  GET_ROLE_MGMT_FILTER_CONFIG,
  TABLE_HIERARCHY_ASSIGN_ROLE,
  FETCH_TABLE_BASED_ON_FILTER,
  FETCH_UNASSIGNED_ROLES_LIST,
  SAVE_UPDATE_DELETE_USER_ROLE_MAPPING,
  GET_ROLE_MGMT_TABLE_CONFIG,
  ASSIGN_USER_ROLE_FORM_FILTERS,
  GET_USER_ACCESS_HIERARCHIES,
  GET_URM_FILTERS_LIST,
} from "config/api";
import { cloneDeep, isNil } from "lodash";

export const userRoleManagementService = createSlice({
  name: "userRoleManagementService",
  initialState: {
    assignUserRoleMgmtLoader: false,
    isSuperUser: false,
    planningLevelHierarchy: [],
    userLevelHierarchy: [],
    userAccessList: { create: {}, delete: {}, edit: {}, approve: {} },
    tenantDateFormat: "MM-DD-YYYY",
    tenantTimeZone: "",
    filter_attribute_exclusion_values: [],
    allAPIsIncludedInFilterExclusion: false,
    productStoreDimensionHierarchy: [],
    productDimensionHierarchy: [],
    storeDimensionHierarchy: [],
    selectionAutoPopulate: {
      product_store: {
        article: ["l0_name", "l1_name", "l2_name", "l3_name"],
        product_description: ["l0_name", "l1_name", "l2_name", "l3_name"],
        style_description: ["l0_name", "l1_name", "l2_name"],
      },
      product: {
        article: ["l0_name", "l1_name", "l2_name"],
        product_description: ["l0_name", "l1_name", "l2_name"],
        style_description: ["l0_name", "l1_name", "l2_name"],
      },
      store: { group_id: ["channel"] },
    },
    currentScreenName: "",
    ticketingConfig: {
      isEnabled: true,
    },
    isEditMode: false,
    filterConfigType: "global",
    filterSaveLevel: "mandatory",
    quickFilterLoad: false,
    filterSaveLimit: 20,
    isFilterSaveGlobal: false,
    editUserRoleMappingData: {},
    newUsersList: [],
    tenantUamConfig: { table_uam: false, filter_uam: true },
    client_specific_super_users: [],
    autoPopulateOnLoadFields: [],
    showModuleConfigurator: false,
  },
  reducers: {
    setTableHierarchyOnAssignRole: (state, action) => {},
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
    setCurrentScreenName: (state, action) => {
      state.currentScreenName = action?.payload || "";
    },
    setTicketingModuleConfig: (state, action) => {
      state.ticketingConfig = { ...action.payload };
    },
    setEditMode: (state, action) => {
      state.isEditMode = action.payload;
    },
    setEditUserRoleMappingData: (state, action) => {
      state.editUserRoleMappingData = { ...action.payload };
    },
    setNewUsersList: (state, action) => {
      state.newUsersList = [...action.payload];
    },
    setShowModuleConfigurator: (state, action) => {
      state.showModuleConfigurator = action.payload;
    },
    setFilterMappingeConfig: (state, action) => {
      if (!action.payload) {
        state.filterConfigType = "global";
        state.filterSaveLevel = "mandatory";
        state.filterSaveLimit = 20;
        state.quickFilterLoad = false;
      } else {
        if (action.payload.config_type) {
          state.filterConfigType =
            action.payload.config_type === "global-screen" ||
            action.payload.config_type === "screen"
              ? "screen"
              : "global";
        } else {
          state.filterConfigType = "global";
        }
        state.isFilterSaveGlobal =
          action.payload?.config_type === "global-screen" ? true : false;
        state.filterSaveLevel = action.payload.save_level
          ? action.payload.save_level
          : "mandatory";
        state.filterSaveLimit = action.payload?.save_limit
          ? action.payload?.save_limit
          : 20;
        state.quickFilterLoad = action?.payload?.quick_filter_load
          ? action?.payload?.quick_filter_load
          : false;
        state.autoPopulateOnLoadFields = action?.payload?.auto_populate_on_load
          ? action?.payload?.auto_populate_on_load
          : [];
      }
    },
    setTenantUamconfig: (state, action) => {
      const uamConfig = action.payload?.[0]?.attribute_value;
      if (!isNil(uamConfig?.table_uam) && !isNil(uamConfig?.filter_uam)) {
        state.tenantUamConfig.table_uam = uamConfig.table_uam;
        state.tenantUamConfig.filter_uam = uamConfig.filter_uam;
      }
    },
    setClientSpecificSuperUsers: (state, action) => {
      state.client_specific_super_users = cloneDeep(action?.payload || []);
    },
    enableMandatoryProductAutoPopulate: (state, action) => {
      state.selectionAutoPopulate.product = {
        ...state.selectionAutoPopulate.product,
        ...action?.payload,
      };
      state.selectionAutoPopulate.product_store = {
        ...state.selectionAutoPopulate.product_store,
        ...action?.payload,
      };
    },
    setFilterHierarchyOrder: (state, action) => {
      const productStoreHierarchyList = action.payload?.product_store;
      const productHierarchyList = action?.payload?.product;
      const storeHierarchyList = action?.payload?.store;
      let productAutoPopulateList = {};
      let storeAutoPopulateList = {};
      let productStoreAutoPopulateList = {};

      if (productStoreHierarchyList) {
        state.productStoreDimensionHierarchy = productStoreHierarchyList;
        productStoreAutoPopulateList = generateAutoPolulateList(
          productStoreHierarchyList
        );
      }
      if (productHierarchyList) {
        state.productDimensionHierarchy = productHierarchyList;
        productAutoPopulateList = generateAutoPolulateList(
          productHierarchyList
        );
      }
      if (storeHierarchyList) {
        state.storeDimensionHierarchy = storeHierarchyList;
        storeAutoPopulateList = generateAutoPolulateList(storeHierarchyList);
      }
      state.selectionAutoPopulate.product_store = {
        ...state.selectionAutoPopulate.product_store,
        ...productStoreAutoPopulateList,
      };
      state.selectionAutoPopulate.product = {
        ...state.selectionAutoPopulate.product,
        ...productAutoPopulateList,
      };
      state.selectionAutoPopulate.store = {
        ...state.selectionAutoPopulate.store,
        ...storeAutoPopulateList,
      };
    },
  },
});

// utils
const generateAutoPolulateList = (hierarchyList) => {
  let autoPopulateList = {};
  hierarchyList?.forEach((item, index) => {
    if (index !== 0) {
      autoPopulateList[item] = hierarchyList?.slice(0, index);
    }
  });

  return autoPopulateList;
};

// Action creators are generated for each case reducer function
export const {
  setUserRoleMgmtLoader,
  setTableHierarchyOnAssignRole,
  setIsSuperUser,
  setPlanningLevelHierarchy,
  setUserLevelHierarchy,
  setUserAccessList,
  setTenantTimeconfig,
  setfilterAttributeExclusionValues,
  setAllAPIsIncludedInFilterExclusion,
  setCurrentScreenName,
  setTicketingModuleConfig,
  setEditMode,
  setNewUsersList,
  setEditUserRoleMappingData,
  setFilterMappingeConfig,
  setTenantUamconfig,
  setClientSpecificSuperUsers,
  enableMandatoryProductAutoPopulate,
  setFilterHierarchyOrder,
  setShowModuleConfigurator
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

export const getAccessHierachyData = async (heirarchy_id) => {
  return axiosInstance({
    url: `${GET_USER_ACCESS_HIERARCHIES}/${heirarchy_id}`,
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

export const getUnmappedUserRoles = () => async () => {
  return axiosInstance({
    url: `${FETCH_UNASSIGNED_ROLES_LIST}`,
    method: "GET",
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

export const userRoleManagementServiceSelector = createSelector(
  (state) => state,
  (state) => state.tenantUserRoleMgmtReducer.userRoleManagementReducer
);

export const userAccessListSelector = createSelector(
  userRoleManagementServiceSelector,
  (state) => state.userAccessList
);

export default userRoleManagementService.reducer;
