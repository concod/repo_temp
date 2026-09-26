import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  FETCH_STORE_GROUP_CLUSTER_METRIC_PARAMETERS,
  FETCH_STORE_GROUP_CUSTOM_CLUSTER_INFO,
  STORE_GROUP_MAPPINGS_UPLOAD,
  SUBMIT_CUSTOM_STORE_GROUP_CLUSTER_REQUEST,
} from "config/api";
import { uniqBy } from "lodash";

export const customStoreGroupService = createSlice({
  name: "customStoreGroupService",
  initialState: {
    selectedClusterClassification: "yoy",
    selectedClusterParameters: [],
    selectedClusterTimeFormat: [],
    selectedClusterTimePeriodRange: [null, null],
    selectedCluster: {},
    selectedClusterFilters: [],
    customStoreGroupLoader: false,
    storeGroups: [],
    storeGroupsCount: 0,
    selectedGroupType: "manual",
    selectedManualFilterType: "product_hierarchy",
    storeGroupFilters: [],
    manualFilteredStores: [],
    manualFilteredStoresCount: 0,
    manualFilteredStoresCols: [],
    manualselectedGroups: [],
    isLoading: false,
    groupsTableCols: [],
    selectedstores: [],
    selectedStoreGroupid: 0,
    deletedStoresInEdit: [],
    newGrpsInEdit: [],
    deletedGrpsInEdit: [],
    exisitingStoresInEdit: [],
    newStoresInEdit: [],
    viewGrpFilterValues: [],
    unselectedRowsInSelectAll: [],
    selectedStoreGroups: [],
    selectAllStoresState: false,
    selectedGroupToEdit: "",
    selectedFilters: [],
    tenantUploadConfig: {},
    handleGoBack: false,
    allowMultiChannelFlag: false,
  },
  reducers: {
    setClassificationValue: (state, action) => {
      state.selectedClusterClassification = action.payload;
    },
    setClusterParamters: (state, action) => {
      state.selectedClusterParameters = action.payload;
    },
    setClusterTimeFormat: (state, action) => {
      state.selectedClusterTimeFormat = action.payload;
    },
    setClusterTimePeriod: (state, action) => {
      state.selectedClusterTimePeriodRange = action.payload;
    },
    setStoreGroupCustomLoaderValue: (state, action) => {
      state.customStoreGroupLoader = action.payload;
    },
    setSelectedCluster: (state, action) => {
      state.selectedCluster = action.payload;
    },
    setSelectedClusterFilters: (state, action) => {
      state.selectedClusterFilters = action.payload;
    },
    resetToDefaultValues: (state) => {
      state.selectedClusterClassification = "yoy";
      state.selectedClusterParameters = [];
      state.selectedClusterTimeFormat = [];
      state.selectedClusterTimePeriodRange = [null, null];
      state.selectedCluster = {};
      state.selectedClusterFilters = [];
    },
    setViewGrpFilterValues: (state, action) => {
      state.viewGrpFilterValues = action.payload;
    },
    setStoreGroups: (state, action) => {
      state.storeGroups = [...action.payload.groupsData];
      state.storeGroupsCount = action.payload.count;
    },
    setFilterFields: (state, action) => {
      state.storeGroupFilters = [...action.payload];
    },
    setStoreGrpFilteredCols: (state, action) => {
      state.manualFilteredStoresCols = [...action.payload];
    },
    setManualGrpFilterType: (state, action) => {
      state.selectedManualFilterType = [...action.payload];
    },
    ToggleLoader: (state, action) => {
      state.isLoading = action.payload;
    },
    setStoreGroupFilteredStores: (state, action) => {
      state.manualFilteredStores = [...action.payload.data];
      state.manualFilteredStoresCount = action.payload.count;
    },
    setGroupsCols: (state, action) => {
      state.groupsTableCols = [...action.payload];
    },
    setSelectedStores: (state, action) => {
      state.selectedstores = uniqBy(action.payload, "store_code");
    },
    deleteSelectedStoreGrp: (state, action) => {
      state.selectedStoreGroupid = action.payload;
    },
    addToExistingStores: (state, action) => {
      state.exisitingStoresInEdit = uniqBy(action.payload, "store_code");
    },
    addSelectedGroups: (state, action) => {
      state.manualselectedGroups = uniqBy(action.payload, "sg_code");
    },
    newGrpsInEdit: (state, action) => {
      state.newGrpsInEdit = uniqBy(action.payload, "sg_code");
    },
    deletedGrpsInEdit: (state, action) => {
      state.deletedGrpsInEdit = uniqBy(action.payload, "sg_code");
    },
    deletedRowsInEdit: (state, action) => {
      state.deletedStoresInEdit = uniqBy(action.payload, "store_code");
    },
    newRowsInEdit: (state, action) => {
      state.newStoresInEdit = uniqBy(action.payload, "store_code");
    },
    setSelectedGroups: (state, action) => {
      state.selectedStoreGroups = uniqBy(action.payload, "store_code");
    },
    resetFilterStores: (state, action) => {
      state.manualFilteredStores = [];
      state.manualFilteredStoresCount = 0;
      state.selectedstores = [];
      state.deletedStoresInEdit = [];
      state.exisitingStoresInEdit = [];
      state.newStoresInEdit = [];
      state.newGrpsInEdit = [];
      state.deletedGrpsInEdit = [];
      state.manualselectedGroups = [];
      state.unselectedRowsInSelectAll = [];
      state.selectAllStoresState = false;
      state.selectedStoreGroups = [];
    },
    setUnselectedStoresInSelectAll: (state, action) => {
      state.unselectedRowsInSelectAll = action.payload;
    },
    setSelectedStoresSelectAllState: (state, action) => {
      state.selectAllStoresState = action.payload;
    },
    setSelectedStoreGrpType: (state, action) => {
      state.selectedGroupType = action.payload;
    },
    setSelectedGroupToEdit: (state, action) => {
      state.selectedGroupToEdit = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setTenantUploadConfig: (state, action) => {
      state.tenantUploadConfig = action.payload;
    },
    setHandleGoBack: (state, action) => {
      state.handleGoBack = action.payload;
    },
    setMultiChannelStatus: (state, action) => {
      state.allowMultiChannelFlag = action.payload;
    },
  },
});

export const {
  setClassificationValue,
  setClusterParamters,
  setClusterTimeFormat,
  setClusterTimePeriod,
  setStoreGroupCustomLoaderValue,
  setSelectedCluster,
  setSelectedClusterFilters,
  resetToDefaultValues,
  setViewGrpFilterValues,
  setStoreGroups,
  setFilterFields,
  setStoreGrpFilteredCols,
  setManualGrpFilterType,
  ToggleLoader,
  setStoreGroupFilteredStores,
  setGroupsCols,
  setSelectedStores,
  deleteSelectedStoreGrp,
  addToExistingStores,
  addSelectedGroups,
  newGrpsInEdit,
  deletedGrpsInEdit,
  deletedRowsInEdit,
  newRowsInEdit,
  resetFilterStores,
  setSelectedGroups,
  setUnselectedStoresInSelectAll,
  setSelectedStoresSelectAllState,
  setSelectedStoreGrpType,
  setSelectedGroupToEdit,
  setSelectedFilters,
  setTenantUploadConfig,
  setHandleGoBack,
  setMultiChannelStatus
} = customStoreGroupService.actions;

//APIs to fetch the required data
export const fetchStoreGroupClusterMetricParameters = (metricType) => () => {
  //Integrate with the API
  return axiosInstance({
    url: `${FETCH_STORE_GROUP_CLUSTER_METRIC_PARAMETERS}/${metricType}`,
    method: "GET",
  });
};

export const submitCustomStoreGroupClusterRequest = (body) => () => {
  return axiosInstance({
    url: `${SUBMIT_CUSTOM_STORE_GROUP_CLUSTER_REQUEST}`,
    method: "POST",
    data: body,
  });
};

export const fetchStoreGroupCustomClusterInfo = (reqId) => () => {
  return axiosInstance({
    url: `${FETCH_STORE_GROUP_CUSTOM_CLUSTER_INFO}/${reqId}`,
    method: "GET",
  });
};

// APIS
export const fetchFilterAttributes = (dimension) => (dispatch) => {
  return axiosInstance({
    url: "/core/filter?dimension=" + dimension,
    method: "GET",
  });
};

export const fetchStoreGroups = (body, grpId = "", pageNum = 1) => (
  dispatch
) => {
  let queryStr = `page=${pageNum}`;
  if (grpId !== "") {
    queryStr = queryStr + `&store_id=${grpId}`;
  }
  return axiosInstance({
    url: `/core/group/store?${queryStr}`,
    method: "POST",
    data: body,
  });
};

/**
 * @function
 * @description Fetch all store mapped to store groups
 * @param {Object} payload
 * @returns {Object}
 */
export const fetchMappedStores = (payload) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/store/list`,
    method: "POST",
    data: payload,
  });
};

/**
 * @func
 * @desc Fetch All store Groups with sg_code and name
 * @param {Object} body
 * @returns {Promise}
 */
export const fetchAllStoreGroups = (body) => {
  return axiosInstance({
    url: `/core/group/store/filter-list`,
    method: "POST",
    data: body,
  });
};

export const addStoresToGroups = (body) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/bulk/store `,
    method: "POST",
    data: body,
  });
};

export const deleteStoresFromGroups = (body) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/bulk/store `,
    method: "DELETE",
    data: body,
  });
};

/**
 * @func
 * @desc Fetch all Store which corresponds to the given Store Group Id.
 * @param {Integer} grpId
 * @param {Object} body
 * @returns
 */
export const fetchAllStoreCodes = (grpId, body) => {
  return axiosInstance({
    url: `/core/group/store/${grpId}/stores?page_size=-1`,
    method: "POST",
    data: body,
  });
};

export const fetchStoreGrpFilteredStores = (body, grpId = "", pageNum = 1) => (
  dispatch
) => {
  let queryStr = `page=${pageNum}`;
  if (grpId !== "") {
    queryStr = queryStr + `&store_id=${grpId}`;
  }
  return axiosInstance({
    url: `/core/group/store/filter?${queryStr}`,
    method: "POST",
    data: body,
  });
};

export const createNewGroup = (groupBody) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/store/new`,
    method: "POST",
    data: groupBody,
  });
};

export const uploadStoreGroups = (uploadBody) => {
  return axiosInstance({
    url: `${STORE_GROUP_MAPPINGS_UPLOAD}`,
    method: "POST",
    data: uploadBody,
  });
};

export const fetchIndividualGroup = (grpId, body) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/store/${grpId}/definitions`,
    method: "POST",
    data: body,
  });
};

export const EditGroup = (grpData, grpId, action) => (dispatch) => {
  let queryParams = ``;
  if (action !== "") {
    queryParams += `${queryParams !== "" ? "&" : "?"}action=${action}`;
  }
  return axiosInstance({
    url: `/core/group/store/${grpId}${queryParams}`,
    method: "PUT",
    data: grpData,
  });
};

export const fetchGroupStores = (grpId, body, pageIndex = 0, pageSize = 10) => (
  dispatch
) => {
  return axiosInstance({
    url: `/core/group/store/${grpId}/stores?page=${
      pageIndex + 1
    }&page_size=${pageSize}`,
    method: "POST",
    data: body,
  });
};

export const deleteStoreGroup = (grpId) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/store/${grpId}`,
    method: "DELETE",
  });
};

export const getGroupInfo = (grpId) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/store/info/${grpId}`,
    method: "GET",
    data: {},
  });
};

export const updateGrp = (grpId, body) => (dispatch) => {
  return axiosInstance({
    url: `/core/group/store/${grpId}`,
    method: "PUT",
    data: body,
  });
};

export default customStoreGroupService.reducer;
