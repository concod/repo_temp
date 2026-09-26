import { createSlice } from "@reduxjs/toolkit";
import { GET_TENANT_CONFIG, MODULES_CONFIG } from "config/api";
import axiosInstance from "core/Utils/axios";
import { clone, cloneDeep } from "lodash";
import {
  RCL_CREATION,
  RCL_EXISITING_UPDATE,
  RCL_FETCH_HIERARCHIES,
  RCL_HIERARCHY_LIST,
  RCL_LIST,
  RCL_RULES_DELETE,
  RCL_RULE_LIST,
  RCL_SAVE,
  RCL_RESET_TO_DEFAULT,
  RULES_LIST,
  RULES_SUMMARY,
  SET_ALL_RULES_TABLE,
  DC_STORE_RCL_LIST,
  DC_STORE_HIERARCHY_LIST,
  DC_STORE_RCL_FETCH_HIERARCHIES,
  DC_STORE_RCL_RULE_LIST,
  DC_STORE_RCL_CREATION,
  DC_STORE_RCL_SAVE,
  DC_STORE_RCL_RULES_DELETE,
  DC_STORE_RCL_EXISITING_UPDATE,
  DC_STORE__SUPPLY_RCL_EXISITING_UPDATE,
  PARTIAL_SET_ALL_FOR_RULES,
  SAVE_RULE_NAME,
  DOWNLOAD_STORE_CONSTRAINSTS,
  CHOICE_VIEW_DATA,
  DC_STORE_NETWORK_RCL_LIST,
  DC_STORE_NETWORK_HIERARCHY_LIST,
  DC_STORE_RCL_NETWORK_RULE_LIST,
  DC_STORE__NETWORK_RCL_CREATION,
  DC_STORE__NETWORK_RCL_SAVE,
  DC_STORE_RCL_NETWORK_RULES_DELETE,
  GET_DISTRIBUTION_STRATEGY,
  GET_STYLE_DISTRIBUTION_STRATEGY,
  CALCULATE_STYLE_PREVIEW,
  GET_SIZE_DISTRIBUTION_STRATEGY,
  RCL_CONSTRAINT_SIZES,
  CALCULATE_SIZE_PREVIEW,
  CALCULATE_SIZE_DISTRIBUTION,
  CHOICE_VIEW_DATA_V2,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { RULES_DELETE } from "../../constants-inventorysmart/apiConstants";
import {
  DELETE_RCL,
  OMS_DELETE_RCL,
  OMS_SET_ALL_PARTIAL_RCL_TABLE,
  OMS_SET_ALL_RCL_TABLE,
  SET_ALL_NETWORK_RCL_TABLE,
  SET_ALL_PARTIAL_RCL_TABLE,
  SET_ALL_RCL_TABLE,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";

//OMS Related Imports
import {
  OMS_RCL_LIST,
  OMS_RULES_DELETE,
  OMS_RCL_FETCH_HIERARCHIES,
  OMS_RCL_HIERARCHY_LIST,
  OMS_RCL_RULE_LIST,
  OMS_RCL_EXISITING_UPDATE,
  OMS_RCL_RULES_DELETE,
  OMS_RCL_CREATION,
  OMS_RCL_SAVE,
  OMS_SAVE_RULE_NAME,
} from "modules/oms/constants-oms/constraintsAPIConstants";

export const rulesConstraintsService = createSlice({
  name: "rulesConstraintService",
  initialState: {
    rulesConstraintsFilterConfig: [],
    rulesConstraintDashboardFilterConfig: [],
    editedRules: [],
    rulesTableLoader: false,
    rulesTableData: [],
    selectedRulesPlan: [],
    isSetAllModalVisible: false,
    rulesSetAllModalData: [],
    selectedRclToDelete: [],
    selectedRclLevel: [],
    selectedRclProductLevel: [],
    selectedRclConstraint: [],
    rclProductFilterConfig: [],
    selectedRclFromTable: [],
    savedEditedRcls: [],
    rulesDataUpdatedState: false,
    formattedConstraintsData: [],
    rclConstraintsTableData: [],
    selectedRclForAddHierarchies: {},
    rclActiveStep: 0,
    invalidKeys: [],
    allFiltersSelectedRclProduct: false,
    rclList: [],
    hierarchyList: [],
    createRulesTableManualBody: {},
    productsLevelDataForBackFlow: {},
    rulesConstraintsConfigs: {},
    storeConstraintsConfigs: {},
    createRulesConfigs: {},
  },
  reducers: {
    setRulesConstraintsFilterConfig: (state, action) => {
      state.rulesConstraintsFilterConfig = action.payload;
    },
    setRulesConstraintDashboardFilterConfig: (state, action) => {
      state.rulesConstraintDashboardFilterConfig = action?.payload;
    },
    saveEditedRules: (state, action) => {
      state.editedRules = action.payload;
    },
    setRulesTableLoader: (state, action) => {
      state.rulesTableLoader = action.payload;
    },
    setRulesTableData: (state, action) => {
      state.rulesTableData = action.payload;
    },
    setInvalidKeys: (state, action) => {
      state.invalidKeys = action.payload;
    },
    setSelectedRulesList: (state, action) => {
      state.selectedRulesPlan = action.payload;
    },
    setAllModalVisibility: (state, action) => {
      state.isSetAllModalVisible = action.payload;
    },
    setAllModalData: (state, action) => {
      state.rulesSetAllModalData = action.payload;
    },
    setSelectedRulesToDelete: (state, action) => {
      state.selectedRclToDelete = action.payload;
    },
    setRclSelectedLevel: (state, action) => {
      state.selectedRclLevel = action.payload;
    },
    setRclSelectedProductLevel: (state, action) => {
      state.selectedRclProductLevel = action.payload;
    },
    setProductsLevelDataForBackFlow: (state, action) => {
      state.productsLevelDataForBackFlow = action.payload;
    },
    setRclConstraints: (state, action) => {
      state.selectedRclConstraint = action.payload;
    },
    setRCLProductFilterCOnfig: (state, action) => {
      state.rclProductFilterConfig = action.payload;
    },
    setSelectedRCLFromTable: (state, action) => {
      state.selectedRclFromTable = action.payload;
    },
    saveEditedRCL: (state, action) => {
      state.savedEditedRcls = action.payload;
    },
    stateRulesDataOnServer: (state, action) => {
      state.rulesDataUpdatedState = action.payload;
    },
    saveRclConstraintsTableData: (state, action) => {
      state.rclConstraintsTableData = action.payload;
    },
    setRclAddHierarchiesRule: (state, action) => {
      state.selectedRclForAddHierarchies = action.payload;
    },
    setActiveRclStep: (state, action) => {
      state.rclActiveStep = action.payload;
    },
    isAllFiltersSelectedForRCLProduct: (state, action) => {
      state.allFiltersSelectedRclProduct = action.payload;
    },
    setHierarchyList: (state, action) => {
      state.hierarchyList = action.payload;
    },
    clearRclTabData: (state, action) => {
      state.selectedRclForAddHierarchies = {};
      state.selectedRclProductLevel = [];
      state.selectedRclLevel = [];
      state.selectedRclConstraint = [];
      state.selectedRclToDelete = [];
      state.selectedRclFromTable = [];
      state.rulesDataUpdatedState = false;
      state.rclActiveStep = 0;
      state.allFiltersSelectedRclProduct = false;
      state.rclProductFilterConfig = [];
      state.rclList = [];
      state.hierarchyList = [];
      state.createRulesTableManualBody = {};
      state.productsLevelDataForBackFlow = {};
    },
    setRclList: (state, action) => {
      state.rclList = action.payload;
    },
    setCreateRulesTableManualBody: (state, action) => {
      state.createRulesTableManualBody = action.payload;
    },
    setRulesConstraintsConfigs: (state, action) => {
      state.rulesConstraintsConfigs = action.payload;
    },
    setStoreConstraintsConfigs: (state, action) => {
      state.storeConstraintsConfigs = action.payload;
    },
    setCreateRulesConfigs: (state, action) => {
      state.createRulesConfigs = action.payload;
    },
  },
});

export const {
  setRulesConstraintsFilterConfig,
  setRulesConstraintDashboardFilterConfig,
  saveEditedRules,
  setRulesTableLoader,
  setRulesTableData,
  setInvalidKeys,
  setSelectedRulesList,
  setAllModalVisibility,
  setAllModalData,
  setSelectedRulesToDelete,
  setRclSelectedLevel,
  setRclSelectedProductLevel,
  setProductsLevelDataForBackFlow,
  setRclConstraints,
  setRCLProductFilterCOnfig,
  setSelectedRCLFromTable,
  stateRulesDataOnServer,
  saveEditedRCL,
  saveRclConstraintsTableData,
  setRclAddHierarchiesRule,
  setActiveRclStep,
  isAllFiltersSelectedForRCLProduct,
  clearRclTabData,
  setRclList,
  setHierarchyList,
  setCreateRulesTableManualBody,
  setRulesConstraintsConfigs,
  setStoreConstraintsConfigs,
  setCreateRulesConfigs,
} = rulesConstraintsService.actions;

export const getRulesListData = (postBody) => {
  return axiosInstance({
    url: RULES_LIST,
    method: "POST",
    data: postBody,
  });
};

export const getRulesSummaryData = (postBody) => {
  return axiosInstance({
    url: RULES_SUMMARY,
    method: "POST",
    data: postBody,
  });
};

export const get_rules_constraints_config = async (postBody) => {
  return await axiosInstance({
    url: MODULES_CONFIG,
    method: "POST",
    data: postBody,
  });
};

export const getTenantConfigData = async (applicationCode, config_url) => {
  return await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${`?attribute_name=${config_url}`}`,
    method: "GET",
  });
};
export const saveSetAllModalData = (postBody, isPartialSetAll) => {
  let url = SET_ALL_RULES_TABLE;
  if (isPartialSetAll) {
    url = PARTIAL_SET_ALL_FOR_RULES;
  }
  return axiosInstance({
    url: url,
    method: "POST",
    data: postBody,
  });
};
export const deleteRules = (postBody, isOMSConstraintsFlow) => {
  let url = RULES_DELETE;
  if (isOMSConstraintsFlow) {
    url = OMS_RULES_DELETE;
  }
  return axiosInstance({
    url,
    method: "POST",
    data: postBody,
  });
};
export const getRclList = (
  isConstraintsFlow,
  isOMSConstraintsFlow,
  isDCNetworkFlow,
  isPOStrategyFlow
) => {
  let url = RCL_LIST;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_LIST;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_RCL_LIST;
  }
  if (isDCNetworkFlow) {
    url = DC_STORE_NETWORK_RCL_LIST;
  }
  return axiosInstance({
    url,
    method: "GET",
    params: isPOStrategyFlow ? { is_po_strategy_flow: true } : {},
  });
};
export const getRclHierarchy = (
  isConstraintsFlow,
  isOMSConstraintsFlow,
  isDCNetworkFlow,
  isPOStrategyFlow
) => {
  let url = RCL_HIERARCHY_LIST;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_HIERARCHY_LIST;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_HIERARCHY_LIST;
  }
  if (isDCNetworkFlow) {
    url = DC_STORE_NETWORK_HIERARCHY_LIST;
  }
  return axiosInstance({
    url,
    method: "GET",
    params: isPOStrategyFlow ? { is_po_strategy_flow: true } : {},
  });
};
export const getRclRuleList = (
  postBody,
  isConstraintsFlow,
  isOMSConstraintsFlow,
  getRclRuleList,
  isPOStrategyFlow
) => {
  let url = RCL_RULE_LIST;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_RULE_LIST;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_RCL_RULE_LIST;
  }
  if (getRclRuleList) {
    url = DC_STORE_RCL_NETWORK_RULE_LIST;
  }
  const payload = {
    ...postBody,
    is_po_strategy_flow: isPOStrategyFlow || false,
  };
  return axiosInstance({
    url,
    method: "POST",
    data: payload,
  });
};
export const resetToDefault = (postBody) => {
  let url = RCL_RESET_TO_DEFAULT;
  return axiosInstance({
    url,
    method: "POST",
    data: postBody,
  });
};
export const createRcl = (
  postBody,
  isConstraintsFlow,
  isOMSConstraintsFlow,
  isDCNetworkFlow
) => {
  let url = RCL_CREATION;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_CREATION;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_RCL_CREATION;
  }
  if (isDCNetworkFlow) {
    url = DC_STORE__NETWORK_RCL_CREATION;
  }
  return axiosInstance({
    url,
    method: "POST",
    data: postBody,
  });
};

export const getSelectProductFilterConfiguration = (screenName) => () => {
  return axiosInstance({
    url: `core/filter-configuration/screen/${screenName}`,
    method: "GET",
  });
};

export const saveRcl = (
  postBody,
  isConstraintsFlow,
  isOMSConstraintsFlow,
  isDCNetworkFlow,
  isPOStrategyFlow
) => {
  let url = RCL_SAVE;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_SAVE;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_RCL_SAVE;
  }
  if (isDCNetworkFlow) {
    url = DC_STORE__NETWORK_RCL_SAVE;
  }
  const payload = {
    ...postBody,
    is_po_strategy_flow: isPOStrategyFlow || false,
  };
  return axiosInstance({
    url,
    method: "POST",
    data: payload,
  });
};
export const deleteRcl = (postBody, isOMSConstraintsFlow) => {
  let url = DELETE_RCL;
  if (isOMSConstraintsFlow) {
    url = OMS_DELETE_RCL;
  }
  return axiosInstance({
    url,
    method: "POST",
    data: postBody,
  });
};
export const saveSetAllDataForRCL = (
  postBody,
  isPartialSetAll,
  isOMSConstraintsFlow,
  iDCNetworkFlow,
  isPOStrategyFlow
) => {
  let url = SET_ALL_RCL_TABLE;
  if (isPartialSetAll) {
    url = SET_ALL_PARTIAL_RCL_TABLE;
  }
  if (isOMSConstraintsFlow) {
    url = OMS_SET_ALL_RCL_TABLE;
    if (isPartialSetAll) {
      url = OMS_SET_ALL_PARTIAL_RCL_TABLE;
    }
  }
  if (iDCNetworkFlow) {
    url = SET_ALL_NETWORK_RCL_TABLE;
  }
  const payload = {
    ...postBody,
    is_po_strategy_flow: isPOStrategyFlow || false,
  };
  return axiosInstance({
    url: url,
    method: "POST",
    data: payload,
  });
};

/** Create-new-rule flow — standard constraints RCL endpoints (no OMS / DC Store routing). */
export const saveCreateNewRuleRcl = (postBody) =>
  axiosInstance({
    url: RCL_SAVE,
    method: "POST",
    data: {
      ...postBody,
    },
  });

export const saveCreateNewRuleSetAllDataForRCL = (
  postBody,
  isPartialSetAll = false
) =>
  axiosInstance({
    url: isPartialSetAll ? SET_ALL_PARTIAL_RCL_TABLE : SET_ALL_RCL_TABLE,
    method: "POST",
    data: {
      ...postBody,
    },
  });

export const createNewRuleRcl = (postBody) =>
  axiosInstance({
    url: RCL_CREATION,
    method: "POST",
    data: postBody,
  });

export const fetchCreateNewRuleExistingRclDetails = (postBody, rcl_code) =>
  axiosInstance({
    url: `${RCL_EXISITING_UPDATE}/${rcl_code}`,
    method: "POST",
    data: {
      ...postBody,
    },
  });

export const deleteRclRules = (
  postBody,
  isConstraintsFlow,
  isOMSConstraintsFlow,
  isDCNetworkFlow,
  isPOStrategyFlow
) => {
  let url = RCL_RULES_DELETE;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_RULES_DELETE;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_RCL_RULES_DELETE;
  }
  if (isDCNetworkFlow) {
    url = DC_STORE_RCL_NETWORK_RULES_DELETE;
  }
  const payload = {
    ...postBody,
    is_po_strategy_flow: isPOStrategyFlow || false,
  };
  return axiosInstance({
    url: `${url}`,
    method: "DELETE",
    data: payload,
  });
};

export const fetchSelectedRclHeirarchies = (
  postBody,
  isConstraintsFlow,
  isOMSConstraintsFlow,
  isDCNetworkFlow
) => {
  let url = RCL_FETCH_HIERARCHIES;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_FETCH_HIERARCHIES;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_RCL_FETCH_HIERARCHIES;
  }
  if (isDCNetworkFlow) {
    url = DC_STORE_RCL_FETCH_HIERARCHIES;
  }
  return axiosInstance({
    url: `${url}/${postBody}`,
    method: "GET",
  });
};

export const fetchExistingRclDetails = (
  postBody,
  rcl_code,
  isConstraintsFlow,
  isOMSConstraintsFlow,
  isDCNetworkFlow,
  isPOStrategyFlow
) => {
  let url = RCL_EXISITING_UPDATE;
  if (isOMSConstraintsFlow) {
    url = OMS_RCL_EXISITING_UPDATE;
  }
  if (!isConstraintsFlow) {
    url = DC_STORE_RCL_EXISITING_UPDATE;
  }
  if (isDCNetworkFlow) {
    url = DC_STORE__SUPPLY_RCL_EXISITING_UPDATE;
  }
  const payload = {
    ...postBody,
    is_po_strategy_flow: isPOStrategyFlow || false,
  };
  return axiosInstance({
    url: `${url}/${rcl_code}`,
    method: "POST",
    data: payload,
  });
};

export const saveRuleName = (postBody, isOMSConstraintsFlow) => {
  let url = SAVE_RULE_NAME;
  if (isOMSConstraintsFlow) {
    url = OMS_SAVE_RULE_NAME;
  }
  return axiosInstance({
    url: url,
    method: "POST",
    data: postBody,
  });
};

export const downloadStoreConstraints = (postBody) => async () => {
  return axiosInstance({
    url: DOWNLOAD_STORE_CONSTRAINSTS,
    method: "POST",
    data: postBody,
  });
};

export const getChoiceViewData = (postBody) => async () => {
  return axiosInstance({
    url: CHOICE_VIEW_DATA,
    method: "POST",
    data: postBody,
  });
};
export const getChoiceViewDataV2 = (postBody) => async () => {
  return axiosInstance({
    url: CHOICE_VIEW_DATA_V2,
    method: "POST",
    data: postBody,
  });
};

export const uploadRclConstraints = (postbody) => async () => {
  return axiosInstance({
    url: `/inventory-smart/constraint/rcl/upload-constraints`,
    method: "POST",
    data: postbody,
  });
};

export const getDistributionStrategy = (postBody) => {
  return axiosInstance({
    url: GET_DISTRIBUTION_STRATEGY,
    method: "POST",
    data: postBody,
  });
};

export const getStyleDistributionStrategy = (postBody) => {
  return axiosInstance({
    url: GET_STYLE_DISTRIBUTION_STRATEGY,
    method: "POST",
    data: postBody,
  });
};

export const calculateStylePreview = (postBody) => {
  return axiosInstance({
    url: CALCULATE_STYLE_PREVIEW,
    method: "POST",
    data: postBody,
  });
};

export const getSizeDistributionStrategy = (postBody) => {
  return axiosInstance({
    url: GET_SIZE_DISTRIBUTION_STRATEGY,
    method: "POST",
    data: postBody,
  });
};

export const getRclConstraintSizes = (postBody) => {
  return axiosInstance({
    url: RCL_CONSTRAINT_SIZES,
    method: "POST",
    data: postBody,
  });
};

export const calculateSizePreview = (postBody) => {
  return axiosInstance({
    url: CALCULATE_SIZE_PREVIEW,
    method: "POST",
    data: postBody,
  });
};

export const calculateSizeDistribution = (postBody) => {
  return axiosInstance({
    url: CALCULATE_SIZE_DISTRIBUTION,
    method: "POST",
    data: postBody,
  });
};

export default rulesConstraintsService.reducer;
