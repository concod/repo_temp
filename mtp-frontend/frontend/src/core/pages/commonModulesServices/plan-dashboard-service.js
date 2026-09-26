import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../Utils/axios";
import {
  GET_PLAN_DETAILS,
  GET_CREATED_PLANS,
  DELETE_PLAN,
  DELETE_CLUSTER_PLAN,
  CREATE_PLAN,
  GET_PLAN_LEVELS,
  DOWNLOAD_BUY_ROLLUP,
  GET_DASHBOARD_FILTERS,
  GET_DASHBOARD_PLANS_TABLE_CONFIG,
  COPY_ASSORT_PLAN,
  FINALIZE_FOR_PO,
  GET_SEASON_YEAR,
  GET_SEASON_OPTIONS,
  OMNI_HINDSIGHT_DASHBOARD_TABLE_CONFIG,
  CLUSTER_DASHBOARD_TABLE_CONFIG,
  DASHBOARD_FILTER,
  CREATE_MASTER_PLAN,
  GET_SUMMARY_VIEW_DATA,
  GET_CHOICE_VIEW_DATA,
  MAP_STYLE_DATA,
  UPLOAD_MFP_DATA,
  UPDATE_MFP_DATA
} from "../../Utils/apiConstants/assortSmartapiConstants";
import { GET_MFP_UPLOAD_DATA } from "../../Utils/apiConstants/assortSmartapiConstants";
export const dashboardService = createSlice({
  name: "dashboardService",
  initialState: {
    planDetails: [],
    dashboard_loader: false,
    plansTableData: [],
    plansTotalCount: 0,
    plansTableCols: [],
    planLevels: [],
    levelsJson: {},
    columnHeaderJson: {},
    dashboardFilters: [],
    bopTagData: [],
    import_cluster_loader: false,
    importCluster: false,
    summaryViewData: {},
    choiceViewData: {}
  },
  reducers: {
    setPlanDetails: (state, action) => {
      state.planDetails = action.payload;
    },
    setDashboardLoader: (state, action) => {
      state.dashboard_loader = action.payload;
    },
    setPlansData: (state, action) => {
      state.plansTableData = action.payload.data;
      state.plansTotalCount = action.payload.count;
    },
    setPlansTableCols: (state, action) => {
      state.plansTableCols = action.payload;
    },
    
    setPlanLevels: (state, action) => {
      state.planLevels = action.payload;
    },
    setLevelsJson: (state, action) => {
      state.levelsJson = action.payload;
    },
    setColumnHeaderJson: (state, action) => {
      state.columnHeaderJson = action.payload;
    },
    setDashboardFilters: (state, action) => {
      state.dashboardFilters = action.payload;
    },
    setBopTagData: (state, action) => {
      state.bopTagData = action.payload;
    },
    setImportClusterLoader: (state, action) => {
      state.import_cluster_loader = action.payload;
    },
    setImportClusterData: (state, action) => {
      state.importCluster = action.payload;
    },
    setSummaryViewData: (state, action) => {
      state.summaryViewData = action.payload;
    },
    setChoiceViewData: (state, action) => {
      state.choiceViewData = action.payload;
    }
  },
});

// Action creators are generated for each case reducer function
export const {
  setPlanDetails,
  setLoader,
  setPlansData,
  setPlansTableCols,
  setPlanLevels,
  setLevelsJson,
  setColumnHeaderJson,
  setBopTagData,
  setImportClusterLoader,
  setDashboardLoader,
  setImportClusterData,
  setSummaryViewData,
  setChoiceViewData
} = dashboardService.actions;
export const getPlanDetails = (planCode) => () => {
  return axiosInstance({
    url: `${GET_PLAN_DETAILS}/` + planCode,
    method: "GET",
  });
};
//API to fetch Plans Table Data in Dashboard
export const fetchAssortDashboardTableData = (
  body,
  page = 0,
  limit = 10
) => () => {
  return axiosInstance({
    url: `${GET_CREATED_PLANS}?page=${page + 1}&limit=${limit}`,
    method: "POST",
    data: body,
  });
};
export const fetchMFPUploadData = (
  body,
  page = 0,
  limit = 10
) => () => {
  return axiosInstance({
    url: `${GET_MFP_UPLOAD_DATA}?page=${page + 1}&limit=${limit}`,
    method: "POST",
    data: body,
  });
};
export const deletePlans = (body) => () => {
  return axiosInstance({
    url: `${DELETE_PLAN}`,
    method: "POST",
    data: body,
  });
};

export const deleteClusterPlans = (body) => () => {
  return axiosInstance({
    url: `${DELETE_CLUSTER_PLAN}`,
    method: "POST",
    data: body,
  });
};
//API to create a new Plan
export const createPlanAPI = (body) => () => {
  return axiosInstance({
    url: CREATE_PLAN,
    method: "POST",
    data: body,
  });
};

//API to download a rolled-up version of the plan
export const downloadBuyRollupData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + DOWNLOAD_BUY_ROLLUP,
    method: "POST",
    data: body,
  });
};

//API to retrieve all the hierarchy levels required for filters
export const getPlanLevels = () => () => {
  return axiosInstance({
    url: GET_PLAN_LEVELS,
    method: "GET",
  });
};

//API to retrieve the dashboard filters
export const getDashboardFilters = () => () => {
  return axiosInstance({
    url: GET_DASHBOARD_FILTERS,
    method: "GET",
  });
};

//API to retrieve the table config of dashboard
export const getDashboardPlansTableConfig = () => () => {
  return axiosInstance({
    url: GET_DASHBOARD_PLANS_TABLE_CONFIG,
    method: "GET",
  });
};

//API to retrive the table config omni / dashboard
export const getTableConfig = (pathname) => {
  return axiosInstance({
    url:
      pathname === "clusterdashboard"
        ? `${CLUSTER_DASHBOARD_TABLE_CONFIG}/cluster-plan-dashboard`
        : `${OMNI_HINDSIGHT_DASHBOARD_TABLE_CONFIG}/omni-dashboard`,
    method: "GET",
  });
};

//API to copy assort plan
export const copyAssortPlan = (copyBody,endpoint) => () => {
  return axiosInstance({
    url: endpoint + COPY_ASSORT_PLAN,
    method: "POST",
    data: copyBody,
  });
};

//API to make a plan finalize for Purchase Order
export const finalizeForPO = (finalizeForPOBody) => () => {
  return axiosInstance({
    url: FINALIZE_FOR_PO,
    method: "PATCH",
    data: finalizeForPOBody,
  });
};

export const mapStyleData = (body) => () => {
  return axiosInstance({
    url: MAP_STYLE_DATA,
    method: "POST",
    data: body,
  });
};

export const getBopTagData = (body) => () => {
  return axiosInstance({
    url: GET_SEASON_YEAR,
    method: "POST",
    data: body,
  });
};

export const getSeasonOptions = (body) => () => {
  return axiosInstance({
    url: GET_SEASON_OPTIONS,
    method: "POST",
    data: body,
  });
};

//Get dashboard filters
export const getDashboardFilterLevels = (param) => () => {
  return axiosInstance({
    url: `${DASHBOARD_FILTER}/${param}`,
    method: "GET",
  });
};

export const createMasterPlan = (reqBody) => () => {
  
  return axiosInstance({
    url: CREATE_MASTER_PLAN,
    method: "POST",
    data: reqBody
  })
}

export const getSummaryViewData = (reqBody,viewType) => () => {
  return axiosInstance({
    url: GET_SUMMARY_VIEW_DATA + viewType,
    method: "POST",
    data: reqBody
  });
}

export const uploadMFPData = (reqBody) => () => {
  return axiosInstance({
    url: UPLOAD_MFP_DATA,
    method: "POST",
    data: reqBody
  })
}

export const updateMFPUploadData = (reqBody) => () => {
  return axiosInstance({
    url: UPDATE_MFP_DATA,
    method: "PUT",
    data: reqBody
  });
}

// Selectors

export const planDashboardReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.planDashboardReducer
);

export const levelsJsonDataSelector = createSelector(
  planDashboardReducerSelector,
  (state) => state.levelsJson
);

export const planDetailsDataSelector = createSelector(
  planDashboardReducerSelector,
  (state) => state.planDetails
);

export const columnHeaderJsonSelector = createSelector(
  planDashboardReducerSelector,
  (state) => state.columnHeaderJson
);

export const planLevelsDataSelector = createSelector(
  planDashboardReducerSelector,
  (state) => state.planLevels
);

export const summaryDataSelector = createSelector(
  planDashboardReducerSelector,
  (state) => state.summaryViewData
);

export const choiceDataSelector = createSelector(
  planDashboardReducerSelector,
  (state) => state.choiceViewData
);

export const dashboardLoaderSelector = createSelector(
  planDashboardReducerSelector,
  (state) => state.dashboard_loader
);

export default dashboardService.reducer;
