import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../../core/Utils/axios";
import {
  GET_BUDGET_L2,
  OPTIMIZE_L3,
  UPDATE_BUDGET_L2,
  GET_L3_OPT,
  UPDATE_L3_OPT,
  GET_CLUSTER_OPT,
  UPDATE_CLUSTER_OPT,
  GET_PRODUCT_LIST,
  CREATE_NEW_L3,
  GET_DROPS_DATA,
  UPDATE_BUDGET_L2_DROP,
  DROP_CONFIG,
  GET_STORE_ELIGIBILITY_DATA,
  GET_CARRYOVER_SELECTION_DATA,
  OPTIMIZATION_CARRYOVER_LOGIC,
  UPDATE_CARRYOVER_SELECTION_DATA,
  GET_REVIEW_TARGET_DATA,
  OPTIMIZE_CARRYOVER_CLOUD_TASK,
  OPTIMIZATION_DROP_FLOW_CONFIGURATION,
  GET_RULE_ENGINE_CARRYOVER_DATA,
  DELETE_L3,
  GET_DROP_PLAN_DATA,
  REVIEW_BUDGET_ACROSS_DROPS,
  GET_PLAN_CARRYOVER_PERC_VIEW,
  UPADATE_DROP_FLOW_DATA,
  DELETE_OPTIMIZATION,
} from "../../../constants-assortsmart/apiConstants";

export const planInitialService = createSlice({
  name: "planInitialService",
  initialState: {
    loader_2_1: false,
    budgetL2Data: [],
    l3OptData: [],
    l2OptData: [],
    clusterOptData: [],
    productList: [],
    dynamicLevelFilters: [],
    clusterOptGraphData: {},
    dropsData: {},
    storeEligibilityData: {},
    reviewTargetData: [],
    dropFlowData: [],
    reviewBudgetAcrossDropsData: {},
    updateDropData: {},
    deleteOptimizationData: {},
  },
  reducers: {
    set2_1_Loader: (state, action) => {
      state.loader_2_1 = action.payload;
    },
    setBudgetL2Data: (state, action) => {
      state.budgetL2Data = action.payload;
    },
    setL3OptData: (state, action) => {
      state.l3OptData = action.payload;
    },
    setL2OptData: (state, action) => {
      state.l2OptData = action.payload;
    },
    setClusterOptData: (state, action) => {
      state.clusterOptData = action.payload;
    },
    setProductList: (state, action) => {
      state.productList = action.payload;
    },
    setDynamicLevelFilters: (state, action) => {
      state.dynamicLevelFilters = action.payload;
    },
    setClusterGraphdata: (state, action) => {
      state.clusterOptGraphData = action.payload;
    },
    setDropsData: (state, action) => {
      state.dropsData = action.payload;
    },
    setStoreEligibilityData: (state, action) => {
      state.storeEligibilityData = action.payload;
    },
    setReviewTargetData: (state, action) => {
      state.reviewTargetData = action.payload;
    },
    setDropFlowConfigData: (state, action) => {
      state.dropFlowData = action.payload;
    },
    setReviewBudgetAcrossDropsData: (state, action) => {
      state.reviewBudgetAcrossDropsData = action.payload;
    },
    setUpdateDropData: (state, action) => {
      state.updateDropData = action.payload;
    },
    setDeleteOptimizationData: (state, action) => {
      state.deleteOptimizationData = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  set2_1_Loader,
  setBudgetL2Data,
  setL3OptData,
  setL2OptData,
  setClusterOptData,
  setProductList,
  setDynamicLevelFilters,
  setClusterGraphdata,
  setDropsData,
  setStoreEligibilityData,
  setReviewTargetData,
  setDropFlowConfigData,
  setReviewBudgetAcrossDropsData,
  setUpdateDropData,
  setDeleteOptimizationData,
} = planInitialService.actions;

//budget level2 table apis
export const getBudgetL2Data = (postBody) => () => {
  return axiosInstance({
    url: GET_BUDGET_L2,
    method: "POST",
    data: postBody,
  });
};
export const getOptimizeL3Data = (postBody) => () => {
  return axiosInstance({
    url: OPTIMIZE_L3,
    method: "POST",
    data: postBody,
  });
};
export const getCarryoverOptimizeL3Data = (postBody) => () => {
  return axiosInstance({
    url: OPTIMIZE_CARRYOVER_CLOUD_TASK,
    method: "POST",
    data: postBody,
  });
};
export const updateBudgetL2Data = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_BUDGET_L2,
    method: "PUT",
    data: postBody,
  });
};

export const fetchDropsData = (postBody) => () => {
  return axiosInstance({
    url: GET_DROPS_DATA,
    method: "POST",
    data: postBody,
  });
};

export const updateBudgetL2DropData = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_BUDGET_L2_DROP,
    method: "POST",
    data: postBody,
  });
};

export const fetchDropConfig = (postBody) => () => {
  return axiosInstance({
    url: DROP_CONFIG,
    method: "POST",
    data: postBody,
  });
};

//budget level3 table apis
export const getL3OptData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_L3_OPT,
    method: "POST",
    data: postBody,
  });
};
export const updateL3OptData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_L3_OPT,
    method: "PUT",
    data: postBody,
  });
};

//budget cluster table apis
export const getClusterOptData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_CLUSTER_OPT,
    method: "POST",
    data: postBody,
  });
};
export const updateClusterOptData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_CLUSTER_OPT,
    method: "PUT",
    data: postBody,
  });
};

// budget carryover selection apis
export const optimizationCarryOverLogic = (postBody) => () => {
  return axiosInstance({
    url: OPTIMIZATION_CARRYOVER_LOGIC,
    method: "POST",
    data: postBody,
  });
};

export const fetchPlanCarryoverData = (postBody) => () => {
  return axiosInstance({
    url: GET_CARRYOVER_SELECTION_DATA,
    method: "POST",
    data: postBody,
  });
};

export const fetchRuleEngineCarryoverData = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_RULE_ENGINE_CARRYOVER_DATA,
    method: "POST",
    data: postBody,
  });
};

export const updatePlanCarryoverData = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_CARRYOVER_SELECTION_DATA,
    method: "PUT",
    data: postBody,
  });
};

export const fetchPlanCarryoverPercView = (postBody) => () => {
  return axiosInstance({
    url: GET_PLAN_CARRYOVER_PERC_VIEW,
    method: "POST",
    data: postBody,
  });
};

//new class creation related apis
export const getProductList = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_PRODUCT_LIST,
    method: "POST",
    data: postBody,
  });
};
export const createNewL3 = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + CREATE_NEW_L3,
    method: "POST",
    data: postBody,
  });
};
export const getStoreEligibilityData = (postBody) => () => {
  return axiosInstance({
    url: GET_STORE_ELIGIBILITY_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getReviewTargetData = (postBody) => () => {
  return axiosInstance({
    url: GET_REVIEW_TARGET_DATA,
    method: "POST",
    data: postBody,
  });
};

export const optimizeDropFlowConfiguration = (postBody) => () => {
  return axiosInstance({
    url: OPTIMIZATION_DROP_FLOW_CONFIGURATION,
    method: "POST",
    data: postBody,
  });
};

export const deleteL3 = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + DELETE_L3,
    method: "POST",
    data: postBody,
  });
};
export const getDropPlanData = (postBody) => () => {
  return axiosInstance({
    url: GET_DROP_PLAN_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getReviewBudgetAcrossDropsData = (postBody) => () => {
  return axiosInstance({
    url: REVIEW_BUDGET_ACROSS_DROPS,
    method: "POST",
    data: postBody,
  });
};
export const updateDropFlowData = (postBody) => () => {
  return axiosInstance({
    url: UPADATE_DROP_FLOW_DATA,
    method: "POST",
    data: postBody,
  });
};

export const deleteL3Optimization = (postBody, endpoint) => () => {
  return axiosInstance({
    url: endpoint + DELETE_OPTIMIZATION,
    method: "POST",
    data: postBody,
  });
};

// Selectors

export const planInitialReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.planInitialReducer
);

export const budgetL2TableDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.budgetL2Data
);

export const budgetClusterOcrptTableDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.clusterOptData
);

export const budgetClusterOptGraphDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.clusterOptGraphData
);

export const budgetLevelThreeTableDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.l3OptData
);

export const budgetLevelTwoTableDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.l2OptData
);

export const loader_2_1_Selector = createSelector(
  planInitialReducerSelector,
  (state) => state.loader_2_1
);

export const productListSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.productList
);

export const ClusterStoreEligibilitySelector = createSelector(
  planInitialReducerSelector,
  (state) => state.storeEligibilityData
);

export const reviewTargetSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.reviewTargetData
);

export const dropFlowDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.dropFlowData
);
export const reviewBudgetAcrossDropsSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.reviewBudgetAcrossDropsData
);
export const updateDropDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.updateDropData
);
export const deleteOptimizationDataSelector = createSelector(
  planInitialReducerSelector,
  (state) => state.deleteOptimizationData
);

export default planInitialService.reducer;
