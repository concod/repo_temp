import axiosInstance from "../../../../../core/Utils/axios";
import { createSelector, createSlice } from "@reduxjs/toolkit";
import {
  GET_CHANNELS_BASED_STORE_GROUPS,
  GET_STORE_CHANNELS,
  GET_PLAN_DETAILS,
  CALCULATE_SIG_SCORE,
  GET_PERFORMANCE_ATTRIBUTES,
  GET_PRODUCT_ATTRIBUTES,
  GET_CLUSTER_ATTRIBUTES,
  RUN_CLUSTER,
  UPDATE_ATTRIBUTES,
  ADD_ECOM_CLUSTER,
  MULTIPLE_CHANNEL_DYNAMIC_COL,
  UPLOAD_CLUSTER,
  VALIDATE_CLUSTER,
} from "modules/assortsmart/constants-assortsmart/apiConstants";
export const clusterInputService = createSlice({
  name: "clusterInputService",
  initialState: {
    storeChannels: [],
    clusterInputIndexLoader_1_1: false,
    clusterInputEditPlanLoader_1_1: false,
    clusterInputStoreSelectionLoader_1_1: false,
    clusterInputAttributesTableLoader_1_1: false,
    isClusterInputLoading: false,
    attributeClusterLoader_1_1: false,
    displayAttribTable: false,
    clusterAttributes: {},
    selectedProductAttributes: [],
    selectedStoreAttributes: [],
    selectedPerformanceAttributes: [],
    isMinAttributesSelected: false,
    selectedStoreGrp: "",
    clusterInputFilterData: {},
  },
  reducers: {
    setStoreChannels: (state, action) => {
      state.planDetails = action.payload;
    },
    setClusterInputLoader: (state, action) => {
      switch (action.payload.loader_type) {
        case "edit_plan":
          state.clusterInputEditPlanLoader_1_1 = action.payload.status;
          break;
        case "store_selection":
          state.clusterInputStoreSelectionLoader_1_1 = action.payload.status;
          break;
        case "attributes_table":
          state.clusterInputAttributesTableLoader_1_1 = action.payload.status;
          break;
        default:
          //Index type is default.
          state.clusterInputIndexLoader_1_1 = action.payload.status;
          break;
      }
    },
    setDisplayAttribTable: (state, action) => {
      state.displayAttribTable = action.payload;
    },
    setClusterAttributes: (state, action) => {
      state.clusterAttributes = action.payload;
    },
    setSelectedProductAttributes: (state, action) => {
      state.selectedProductAttributes = action.payload;
    },
    setSelectedStoreAttributes: (state, action) => {
      state.selectedStoreAttributes = action.payload;
    },
    setSelectedPerformanceAttributes: (state, action) => {
      state.selectedPerformanceAttributes = action.payload;
    },
    setIsMinAttributesSelected: (state, action) => {
      state.isMinAttributesSelected = action.payload;
    },
    setSelectedStoreGrp: (state, action) => {
      state.selectedStoreGrp = action.payload;
    },
    resetClusterSelectionFields: (state) => {
      state.displayAttribTable = false;
      state.selectedPerformanceAttributes = [];
      state.selectedProductAttributes = [];
      state.isMinAttributesSelected = false;
      state.selectedStoreGrp = "";
      state.clusterInputIndexLoader_1_1 = false;
      state.clusterInputEditPlanLoader_1_1 = false;
      state.clusterInputStoreSelectionLoader_1_1 = false;
      state.clusterInputAttributesTableLoader_1_1 = false;
    },
    setClusterInputFilterData: (state, action) => {
      state.clusterInputFilterData = action.payload;
    },
  },
});
// Action creators are generated for each case reducer function
export const {
  setStoreChannels,
  setClusterInputLoader,
  setDisplayAttribTable,
  setClusterAttributes,
  setSelectedPerformanceAttributes,
  setSelectedProductAttributes,
  setSelectedStoreAttributes,
  setIsMinAttributesSelected,
  setSelectedStoreGrp,
  setAttributerClusterLoaderStatus,
  resetClusterSelectionFields,
  setClusterInputFilterData,
} = clusterInputService.actions;
//API to fetch the channels in a tenant
export const getStoreChannels = () => () => {
  return axiosInstance({
    url: `${GET_STORE_CHANNELS}`,
    method: "GET",
  });
};
//API to fetch the store groups in a channel
export const getChannelBasedStoreGroups = (
  channelType,
  subChannelType,
  objID
) => () => {
  let url =
    `${GET_CHANNELS_BASED_STORE_GROUPS}?include_all_stores=true&ch_type=` +
    channelType.join(",");
  if (subChannelType?.length) {
    url = url + "&sub_ch_type=" + subChannelType.join(",");
  }
  return axiosInstance({
    url: url,
    method: "GET",
    object_id: objID,
  });
};

export const updatePlanAPI = (body, planCode, endpoint) => () => {
  return axiosInstance({
    url: endpoint + `${GET_PLAN_DETAILS}/${planCode}`,
    method: "PUT",
    data: body,
    object_id: planCode,
  });
};

export const uploadClusterData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + UPLOAD_CLUSTER,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const validateClusterData = (postBody, endpoint, objID) => () => {
  return axiosInstance({
    url: endpoint + VALIDATE_CLUSTER,
    method: "POST",
    data: postBody,
    object_id: objID,
  });
};

export const calculateSigScore = (body, objID) => () => {
  return axiosInstance({
    url: `${CALCULATE_SIG_SCORE}`,
    method: "POST",
    data: body,
    object_id: objID,
  });
};

export const fetchPerformanceAttributes = (planId) => () => {
  return axiosInstance({
    url: `${GET_PERFORMANCE_ATTRIBUTES}/${planId}`,
    method: "GET",
    object_id: planId,
  });
};
export const fetchProductAttributes = (planId) => () => {
  return axiosInstance({
    url: `${GET_PRODUCT_ATTRIBUTES}/${planId}`,
    method: "GET",
    object_id: planId,
  });
};

export const fetchClusterAttributes = (planId) => () => {
  return axiosInstance({
    url: `${GET_CLUSTER_ATTRIBUTES}/${planId}`,
    method: "GET",
    object_id: planId,
  });
};
export const runCluster = (reqBody, objID) => () => {
  return axiosInstance({
    url: `${RUN_CLUSTER}`,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

/**
 * Update Attributes API will update the attributes table selection
 *
 * @param {*} reqBody - payload for update API
 * @returns axios promise
 */
export const updateAttributes = (reqBody, objID) => () => {
  return axiosInstance({
    url: `${UPDATE_ATTRIBUTES}`,
    method: "PUT",
    data: reqBody,
    object_id: objID,
  });
};

export const addEcomCluster = (reqBody, objID) => () => {
  return axiosInstance({
    url: `${ADD_ECOM_CLUSTER}`,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const perfDynamicCol = (reqBody, objID) => () => {
  return axiosInstance({
    url: `${MULTIPLE_CHANNEL_DYNAMIC_COL}`,
    method: "POST",
    data: reqBody,
    object_id: objID,
  });
};

export const ClusterInputReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.clusterInputReducer
);

export const clusterAttributesSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.clusterAttributes
);

export const selectedProductAttributesSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.selectedProductAttributes
);
export const selectedStoreAttributesSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.selectedStoreAttributes
);
export const selectedPerformanceAttributesSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.selectedPerformanceAttributes
);
export const isMinAttributesSelectedSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.isMinAttributesSelected
);
export const selectedStoreGrpSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.selectedStoreGrp
);
export const displayAttribTableSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.displayAttribTable
);
export const clusterInputIndexLoader_1_1Selector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.clusterInputIndexLoader_1_1
);

export const clusterInputEditPlanLoader_1_1Selector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.clusterInputEditPlanLoader_1_1
);

export const clusterInputStoreSelectionLoader_1_1Selector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.clusterInputStoreSelectionLoader_1_1
);

export const clusterInputAttributesTableLoader_1_1Selector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.clusterInputAttributesTableLoader_1_1
);
export const clusterInputFilterDataSelector = createSelector(
  ClusterInputReducerSelector,
  (state) => state.clusterInputFilterData
);

export default clusterInputService.reducer;
