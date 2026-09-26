import { createSlice } from "@reduxjs/toolkit";
import {
  CREATE_ALLOCATION_API,
  CREATE_PLANS_FILTER_CONFIG,
  GET_ALLOCATE,
  GET_ALLOCATE_PO,
  GET_APS_WOS,
  GET_COLUMN,
  GET_DCS,
  GET_OH_STORE_SIZE,
  GET_SETALL_DCS,
  GET_STOREGROUP_STORE_MAP,
  GET_STORES,
  GET_TENANT_CONFIG,
  RE_CREATE_ALLOCATION_API,
  SAVE_DRAFT,
  SAVE_PALN_FOR_DRAFT,
  UPDATE_RES_QTY,
  WARMUP_ALLOCATION,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartCreateAllocationService = createSlice({
  name: "inventorySmartCreateAllocationService",
  initialState: {
    inventorysmartFilterLoader: false,
    allocationName: null,
    selectedFilters: [],
    articleAgGridParams: {},
    isFiltersValid: false,
    articleTableLoader: false,
    viewPlanTableConfigLoader: false,
    createAllocationArticles: [],
    viewPlansTableConfig: [],
    viewPlansTableData: [],
    articlesTableData: {},
    storeDcTableLoader: false,
    mandatoryFilter: null,
    inventorysmartCreateAllocationFilterDependency: [],
    backButtonClicked: false,
    isValidDraft: false,
    showInvalidDraftModal: true,
    draftResult: {},
    poCode: null,
    poName: null,
    newStoreData: null,
    filteredSelection: [],
    popUpLinkFromDashbaord: null,
    type: null,
  },
  reducers: {
    setInventorysmartFilterLoader: (state, action) => {
      state.inventorysmartFilterLoader = action.payload;
    },
    setAllocationName: (state, action) => {
      state.allocationName = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setArticleAgGridParams: (state, action) => {
      state.articleAgGridParams = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setArticleTableLoader: (state, action) => {
      state.articleTableLoader = action.payload;
    },
    setViewPlanTableConfigLoader: (state, action) => {
      state.viewPlanTableConfigLoader = action.payload;
    },
    setCreateAllocationArticles: (state, action) => {
      state.createAllocationArticles = action.payload;
    },
    setViewPlanTableConfiguration: (state, action) => {
      state.viewPlansTableConfig = action.payload;
    },
    setViewPlanTableData: (state, action) => {
      state.viewPlansTableData = action.payload;
    },
    setArticlesTableData: (state, action) => {
      state.articlesTableData = action.payload;
    },
    setStoreDcTableLoader: (state, action) => {
      state.storeDcTableLoader = action.payload;
    },
    setMandatoryFilter: (state, action) => {
      state.mandatoryFilter = action.payload;
    },
    setInventorysmartCreateAllocationFilterDependency: (state, action) => {
      state.inventorysmartCreateAllocationFilterDependency = action.payload;
    },
    setIsValidDraft: (state, action) => {
      state.isValidDraft = action.payload;
    },
    setShowInvalidDraftModal: (state, action) => {
      state.showInvalidDraftModal = action.payload;
    },
    setBackButtonClicked: (state, action) => {
      state.backButtonClicked = action.payload;
    },
    setDraftsResult: (state, action) => {
      state.draftResult = action.payload;
    },
    setPOCode: (state, action) => {
      state.poCode = action.payload;
    },
    setPOName: (state, action) => {
      state.poName = action.payload;
    },
    setNewStoreData: (state, action) => {
      state.newStoreData = action.payload;
    },
    setFilteredSelection: (state, action) => {
      state.filteredSelection = action.payload;
    },
    setPopUpLinkFromDashbaord: (state, action) => {
      state.popUpLinkFromDashbaord = action.payload;
    },
    setType: (state, action) => {
      state.type = action.payload;
    },
    resetCreateAllocationStoreState: (state, _action) => {
      state.inventorysmartFilterLoader = false;
      state.allocationName = null;
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.articleTableLoader = false;
      state.viewPlanTableConfigLoader = false;
      state.viewPlansTableConfig = [];
      state.viewPlansTableData = [];
      state.storeDcTableLoader = false;
      state.mandatoryFilter = null;
      state.inventorysmartCreateAllocationFilterDependency = [];
      state.backButtonClicked = false;
      state.articleAgGridParams = {};
      state.isValidDraft = false;
      state.showInvalidDraftModal = true;
      state.draftResult = {};
      state.poCode = null;
      state.poName = null;
      state.newStoreData = null;
      state.filteredSelection = [];
      state.popUpLinkFromDashbaord = null;
      state.type = null;
      state.createAllocationArticles = [];
    },
  },
});

export const {
  setInventorysmartFilterLoader,
  setAllocationName,
  setSelectedFilters,
  setArticleAgGridParams,
  setIsFiltersValid,
  setArticleTableLoader,
  setViewPlanTableConfigLoader,
  setCreateAllocationArticles,
  setViewPlanTableConfiguration,
  setViewPlanTableData,
  setArticlesTableData,
  setStoreDcTableLoader,
  resetCreateAllocationStoreState,
  setMandatoryFilter,
  setInventorysmartCreateAllocationFilterDependency,
  setIsValidDraft,
  setShowInvalidDraftModal,
  setBackButtonClicked,
  setDraftsResult,
  setPOCode,
  setPOName,
  setNewStoreData,
  setFilteredSelection,
  setPopUpLinkFromDashbaord,
  setType,
} = inventorySmartCreateAllocationService.actions;

export const getFilterConfiguration = () => () => {
  return axiosInstance({
    url: CREATE_PLANS_FILTER_CONFIG,
    method: "GET",
  });
};

export const getAllocate = (postBody) => () => {
  return axiosInstance({
    url: GET_ALLOCATE,
    method: "POST",
    data: postBody,
  });
};

export const getAllocatePO = (postBody) => () => {
  return axiosInstance({
    url: GET_ALLOCATE_PO,
    method: "POST",
    data: postBody,
  });
};

export const getColumn = () => () => {
  return axiosInstance({
    url: GET_COLUMN,
    method: "GET",
  });
};

export const getApsWos = (postBody) => () => {
  return axiosInstance({
    url: GET_APS_WOS,
    method: "POST",
    data: postBody,
  });
};

export const getStoreGroupStoreMap = (postBody) => () => {
  return axiosInstance({
    url: GET_STOREGROUP_STORE_MAP,
    method: "POST",
    data: postBody,
  });
};

export const getSetAllDcs = () => () => {
  return axiosInstance({
    url: GET_SETALL_DCS,
    method: "GET",
  });
};

export const getStores = (postBody) => () => {
  return axiosInstance({
    url: GET_STORES,
    method: "POST",
    data: postBody,
  });
};

export const getDCs = (postBody) => () => {
  return axiosInstance({
    url: GET_DCS,
    method: "POST",
    data: postBody,
  });
};

// isV3 can be set to true directly if incase it applies for all client else drive it from tenant attribute
export const createAllocationApi = (postBody, isV3) => () => {
  return axiosInstance({
    url: CREATE_ALLOCATION_API,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const reCreateAllocationApi = (postBody) => () => {
  return axiosInstance({
    url: RE_CREATE_ALLOCATION_API,
    method: "POST",
    data: postBody,
  });
};

export const getOHStoreSize = (postBody) => () => {
  return axiosInstance({
    url: GET_OH_STORE_SIZE,
    method: "POST",
    data: postBody,
  });
};

export const savePlanForDraft = (postBody) => () => {
  return axiosInstance({
    url: SAVE_PALN_FOR_DRAFT,
    method: "POST",
    data: postBody,
  });
};

export const saveDraft = (postBody) => () => {
  return axiosInstance({
    url: SAVE_DRAFT,
    method: "POST",
    data: postBody,
  });
};

export const deleteDrafts = (param) => () => {
  return axiosInstance({
    url: `/inventory-smart/plan/draft/${param}`,
    method: "DELETE",
  });
};

export const updateReserveQuantity = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_RES_QTY,
    method: "POST",
    data: postBody,
  });
};

export const warmUpAllocation = (postBody, isV3) => () => {
  return axiosInstance({
    url: WARMUP_ALLOCATION,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export default inventorySmartCreateAllocationService.reducer;
