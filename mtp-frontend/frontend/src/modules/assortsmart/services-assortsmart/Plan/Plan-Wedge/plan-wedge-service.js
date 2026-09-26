import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../../core/Utils/axios";
import {
  GET_WEDGE_METRICS,
  GET_WEDGE_ATTRIBUTES,
  GET_WEDGE_TABLE_DATA,
  UPDATE_WEDGE_TABLE_DATA,
  OPTIMIZE_WEDGE,
  GET_PLAN_OPTMIZATION_CONSTRAINT,
  UPDATE_OPTMIZATION_CONSTRAINT_DATA,
  DEPTH_MULTIPLIER,
  UPLOAD_WEDGE,
  GET_PLAN_SETUP_DROPS,
  UPDATE_PLAN_SETUP_DROPS,
  WEDGE_ADD_CHOICE,
  WEDGE_ADD_CHOICE_VALIDATION,
  WEDGE_DELETE_CHOICE,
  WEDGE_DELETE_FETCH_DATA,
  ADD_DROP_SHIP_CHOICES,
  EOP_UPDATE,
  WEDGE_ADD_STYLE,
  GET_MAP_STYLE_DETAILS,
  MAP_CARRYOVER_STYLE_DETAILS,
  RE_OPTIMIZE_WEDGE,
  UPDATE_STYLE_WEDGE_TABLE_DATA,
  FETCH_PAC_DOWNLOAD_DATA,
  UPDATE_ARTICLE_DETAILS,
  FETCH_CHOICE_SET_DETAILS,
  UPDATE_CHOICE_SET_DETAILS,
  SISTER_STYLE_MAPPING,
  FETCH_SISTER_STYLE_MAPPING,
  DELETE_CHOICE_SET_DETAILS,
  IMAGE_WEDGE_MAP,
  ADD_WEDGE_ATTRIBUTE,
  DOWNLOAD_WEDGE_DATA,
  UPDATE_DEPTH_MULTIPLIER,
} from "../../../constants-assortsmart/apiConstants";

export const planInitialService = createSlice({
  name: "planInitialService",
  initialState: {
    loader_2_3: false,
    planMetricsData: [],
    wedgeFiltersData: [],
    wedgeData: [],
    styleWedgeData: [],
    wedgeAttributeData: [],
    planOptimizationConstraintData: {},
    planSetupDropsData: {},
    updateSetupDropsResponse: false,
    l3MinQtyJson: {},
    deleteChoiceLoader: false,
    deleteChoiceData: [],
    showWedge: false,
    map_style_loader: false,
    constraint_loader_2_3: false,
  },
  reducers: {
    set2_3_Loader: (state, action) => {
      state.loader_2_3 = action.payload;
    },
    setPlanMetricsData: (state, action) => {
      state.planMetricsData = action.payload;
    },
    setWedgeFiltersData: (state, action) => {
      state.wedgeFiltersData = action.payload;
    },
    setWedgeAttributeData: (state, action) => {
      state.wedgeAttributeData = action.payload;
    },
    setWedgeData: (state, action) => {
      state.wedgeData = action.payload;
    },
    setStyleLevelWedgeData: (state, action) => {
      state.styleWedgeData = action.payload;
    },
    setPlanOptimizationConstraintData: (state, action) => {
      state.planOptimizationConstraintData = action.payload;
    },
    setPlanSetupDrops: (state, action) => {
      state.planSetupDropsData = action.payload;
      state.updateSetupDropsResponse = false;
    },
    setUpdatePlanSetupDropsResponse: (state, action) => {
      state.updateSetupDropsResponse = action.payload;
    },
    setl3MinQtyJson: (state, action) => {
      state.l3MinQtyJson = action.payload;
    },
    setDeleteChoiceLoader: (state, action) => {
      state.deleteChoiceLoader = action.payload;
    },
    setDeleteChoiceData: (state, action) => {
      state.deleteChoiceData = action.payload;
    },
    setDeleteStyleData: (state, action) => {
      state.deleteStyleData = action.payload;
    },
    setShowWedgeScreen: (state, action) => {
      state.showWedge = action.payload;
    },
    setMapStyleLoader: (state, action) => {
      state.map_style_loader = action.payload;
    },
    setConstraint_2_3_Loader: (state, action) => {
      state.constraint_loader_2_3 = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  set2_3_Loader,
  setPlanMetricsData,
  setWedgeFiltersData,
  setWedgeData,
  setStyleLevelWedgeData,
  setWedgeAttributeData,
  setOptimizeWedgeData,
  setPlanOptimizationConstraintData,
  setPlanSetupDrops,
  setUpdatePlanSetupDropsResponse,
  setl3MinQtyJson,
  setDeleteChoiceData,
  setDeleteStyleData,
  setDeleteChoiceLoader,
  setShowWedgeScreen,
  setMapStyleLoader,
  setConstraint_2_3_Loader,
} = planInitialService.actions;

//budget level2 table apis
export const getPlanMetricsData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_WEDGE_METRICS,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};
export const getWedgeAttributesData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_WEDGE_ATTRIBUTES,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getWedgeData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_WEDGE_TABLE_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const updateWedgeData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_WEDGE_TABLE_DATA,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};

export const updateStyleWedgeData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_STYLE_WEDGE_TABLE_DATA,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getOptimizeWedge = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + OPTIMIZE_WEDGE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getReOptimizeWedge = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + RE_OPTIMIZE_WEDGE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getPlanOptimizationConstraintData = (
  postBody,
  endpoint,
  objID
) => () => {
  return axiosInstance({
    url: endpoint + GET_PLAN_OPTMIZATION_CONSTRAINT,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const updateOptimizationConstraintData = (
  postBody,
  endpoint,
  objID
) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_OPTMIZATION_CONSTRAINT_DATA,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};

export const getDepthMultiplierData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + DEPTH_MULTIPLIER,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const updateDepthMultiplierData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_DEPTH_MULTIPLIER,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};

export const uploadWedgeData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPLOAD_WEDGE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const getPlanSetupdrops = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_PLAN_SETUP_DROPS,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const updatePlanSetupdrops = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_PLAN_SETUP_DROPS,
    method: "PUT",
    data: postBody,
    object_id: objID,
  });
};

export const addWedgeChoice = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + WEDGE_ADD_CHOICE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const addWedgeChoiceValidtion = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + WEDGE_ADD_CHOICE_VALIDATION,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const deleteWedgeChoice = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + WEDGE_DELETE_CHOICE,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const addWedgeStyle = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + WEDGE_ADD_STYLE,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const deleteDataFetch = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + WEDGE_DELETE_FETCH_DATA,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const addDropshipChoices = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + ADD_DROP_SHIP_CHOICES,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const updateEOP = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + EOP_UPDATE,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const getMapStyleDetails = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + GET_MAP_STYLE_DETAILS,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const mapCarryoverStyleDetails = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + MAP_CARRYOVER_STYLE_DETAILS,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const fetchPacDownloadTableData = (
  body,
  endpoint,
  page = 0,
  limit = 10,
  objID
) => () => {
  return axiosInstance({
    url:
      endpoint + `${FETCH_PAC_DOWNLOAD_DATA}?page=${page + 1}&limit=${limit}`,
    method: "POST",
    data: body,
    object_id: objID,
  });
};

export const updateArticleDetails = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_ARTICLE_DETAILS,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const fetchChoiceSet = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + FETCH_CHOICE_SET_DETAILS,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const updateChoiceSet = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPDATE_CHOICE_SET_DETAILS,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const deleteChoiceSet = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + DELETE_CHOICE_SET_DETAILS,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const fetchStyleMappingData = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + FETCH_SISTER_STYLE_MAPPING,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const sisterStyleMapping = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + SISTER_STYLE_MAPPING,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const imageGenWedgeMapping = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + IMAGE_WEDGE_MAP,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const addWedgeAttribute = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + ADD_WEDGE_ATTRIBUTE,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const downloadWedgeData = (reqBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + DOWNLOAD_WEDGE_DATA,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

// Selectors

export const planWedgeReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.planWedgeReducer
);

export const set2_3_LoaderSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.loader_2_3
);

export const planOptimizationConstraintDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.planOptimizationConstraintData
);

export const updateSetupDropsSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.updateSetupDropsResponse
);

export const l3MinQtyJsonSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.l3MinQtyJson
);

export const wedgeDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.wedgeData
);

export const wedgeAttributeDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.wedgeAttributeData
);

export const planMetricsDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.planMetricsData
);

export const wedgeFiltersDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.wedgeFiltersData
);

export const deleteChoiceDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.deleteChoiceData
);

export const planSetupDropsDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.planSetupDropsData
);

export const deleteStyleDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.deleteStyleData
);

export const styleWedgeDataSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.styleWedgeData
);

export const mapStyleLoaderSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.map_style_loader
);

export const setConstraint_2_3_LoaderSelector = createSelector(
  planWedgeReducerSelector,
  (state) => state.constraint_loader_2_3
);

export default planInitialService.reducer;
