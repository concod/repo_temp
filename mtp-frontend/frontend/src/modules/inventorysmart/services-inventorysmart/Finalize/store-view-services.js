import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  FINALIZE_API,
  GET_PACKAGE_DETAILS,
  GET_PRODUCT_STORE_VIEW,
  GET_STORE_VIEW,
  GET_STORE_VIEW_SUMMARY,
  CHANGE_PLAN_STATUS,
  UPDATE_ALLOCATED_UNITS,
  GET_PACKAGE_DETAILS_FOR_BULK_EDIT,
  BULK_UPDATE_ALLOCATED_UNITS,
  SAVE_ALLOCATION,
  SAVE_DELIVERY_DATE,
  SAVE_CANCEL_DATE,
  UPLOAD_PO,
  UPLOAD_INV,
  SAVE_PRIORITY,
  GET_PRODUCT_STORE_SIZE_VIEW,
  BULK_UPDATE_MATERIALS,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import { CLEAR_NOTIFICATION } from "config/api";

export const inventorySmartFinalizeStoreViewService = createSlice({
  name: "inventorySmartFinalizeStoreViewService",
  initialState: {
    productStoreViewSummaryLoader: false,
    storeViewLoader: false,
    selectedFilters: [],
    isFiltersValid: false,
    articleTableLoader: false,
    viewPlanTableConfigLoader: false,
    createAllocationArticles: [],
    viewPlansTableConfig: [],
    viewPlansTableData: [],
    articlesTableData: {},
    storeDcTableLoader: false,
    productStoreTableLoader: false,
    productStoreSizeTableLoader: false,
    editAllocatedQtyLoader: false,
    allocationCode: null,
    originalAllocationCode: null,
    selectedArticles: null,
    moveToTiageLoader: false,
    finalized: false,
    planStatus: null,
    planType: null,
    downloadPlan: {},
    articles: undefined,
    currentSelectedArticles: null,
  },
  reducers: {
    setProductStoreViewSummaryLoader: (state, action) => {
      state.productStoreViewSummaryLoader = action.payload;
    },
    setStoreViewLoader: (state, action) => {
      state.storeViewLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
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
    setProductStoreViewLoader: (state, action) => {
      state.productStoreTableLoader = action.payload;
    },
    setProductStoreSizeViewLoader: (state, action) => {
      state.productStoreSizeTableLoader = action.payload;
    },
    setEditAllocatedQtyLoader: (state, action) => {
      state.editAllocatedQtyLoader = action.payload;
    },
    setAllocationCode: (state, action) => {
      state.allocationCode = action.payload;
    },
    setArticle: (state, action) => {
      state.articles = action.payload;
    },
    setOriginalAllocationCode: (state, action) => {
      state.originalAllocationCode = action.payload;
    },
    setSelectedArtilces: (state, action) => {
      state.selectedArticles = action.payload;
    },
    setMoveToTiageLoader: (state, action) => {
      state.moveToTiageLoader = action.payload;
    },
    setFinalized: (state, action) => {
      state.finalized = action.payload;
    },
    setDownloadPlan: (state, action) => {
      state.downloadPlan = action.payload;
    },
    setPlanStatus: (state, action) => {
      state.planStatus = action.payload;
    },
    setPlanType: (state, action) => {
      state.planType = action.payload;
    },
    setCurrentSelectedArticles: (state, action) => {
      state.currentSelectedArticles = action.payload;
    },
    resetStoreView: (state, _action) => {
      state.productStoreViewSummaryLoader = false;
      state.storeViewLoader = false;
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.articleTableLoader = false;
      state.viewPlanTableConfigLoader = false;
      state.viewPlansTableConfig = [];
      state.viewPlansTableData = [];
      state.storeDcTableLoader = false;
      state.productStoreTableLoader = false;
      state.productStoreSizeTableLoader = false;
      state.editAllocatedQtyLoader = false;
      state.allocationCode = null;
      state.originalAllocationCode = null;
      state.selectedArticles = null;
      state.planStatus = null;
      state.planType = null;
      state.moveToTiageLoader = false;
      state.finalized = false;
      state.downloadPlan = {};
      state.articles = undefined;
      state.currentSelectedArticles = null;
    },
  },
});

export const {
  setProductStoreViewSummaryLoader,
  setStoreViewLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setArticleTableLoader,
  setViewPlanTableConfigLoader,
  setCreateAllocationArticles,
  setViewPlanTableConfiguration,
  setViewPlanTableData,
  setArticlesTableData,
  setStoreDcTableLoader,
  setProductStoreViewLoader,
  setProductStoreSizeViewLoader,
  setEditAllocatedQtyLoader,
  setAllocationCode,
  setArticle,
  setOriginalAllocationCode,
  setSelectedArtilces,
  setMoveToTiageLoader,
  setFinalized,
  setDownloadPlan,
  setPlanStatus,
  setPlanType,
  resetStoreView,
  setCurrentSelectedArticles,
} = inventorySmartFinalizeStoreViewService.actions;

export const getStoreViewSummary = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_STORE_VIEW_SUMMARY,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getStoreView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_STORE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const saveShippingDates = (putBody) => () => {
  return axiosInstance({
    url: SAVE_DELIVERY_DATE,
    method: "PUT",
    data: putBody,
  });
};

export const saveCancelDates = (putBody) => () => {
  return axiosInstance({
    url: SAVE_CANCEL_DATE,
    method: "PUT",
    data: putBody,
  });
};

export const savePriority = (putBody) => () => {
  return axiosInstance({
    url: SAVE_PRIORITY,
    method: "PUT",
    data: putBody,
  });
};

export const getProductStoreView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_STORE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getProductStoreSizeView = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PRODUCT_STORE_SIZE_VIEW,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const getDrafts = (param) => () => {
  return axiosInstance({
    url: `/inventory-smart/plan/draft/${param}`,
    method: "GET",
  });
};

export const getStatus = (param) => () => {
  return axiosInstance({
    url: `/inventory-smart/finalize/get-plan-status?allocation_code=${param}`,
    method: "GET",
  });
};

export const changePlanStatus = (postBody) => () => {
  return axiosInstance({
    url: CHANGE_PLAN_STATUS,
    method: "POST",
    data: postBody,
  });
};

export const clearNotification = (postBody) => () => {
  return axiosInstance({
    url: CLEAR_NOTIFICATION,
    method: "POST",
    data: postBody,
  });
};

export const uploadPO = (postBody) => () => {
  return axiosInstance({
    url: UPLOAD_PO,
    method: "POST",
    data: postBody,
  });
};

export const uploadInv = (postBody) => () => {
  return axiosInstance({
    url: UPLOAD_INV,
    method: "POST",
    data: postBody,
  });
};

export const saveAllocation = (postBody) => () => {
  return axiosInstance({
    url: SAVE_ALLOCATION,
    method: "POST",
    data: postBody,
  });
};

export const finalizeApi = (postBody) => () => {
  return axiosInstance({
    url: FINALIZE_API,
    method: "POST",
    data: postBody,
  });
};

export const getpackageDetailsForEdit = (postBody) => () => {
  return axiosInstance({
    url: GET_PACKAGE_DETAILS,
    method: "POST",
    data: postBody,
  });
};

export const getpackageDetailsForBulkEdit = (postBody, isV3) => () => {
  return axiosInstance({
    url: GET_PACKAGE_DETAILS_FOR_BULK_EDIT,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const updateAllocatedUnits = (postBody) => () => {
  return axiosInstance({
    url: UPDATE_ALLOCATED_UNITS,
    method: "POST",
    data: postBody,
  });
};

export const bulkUpdateAllocatedUnits = (postBody, isV3) => () => {
  return axiosInstance({
    url: BULK_UPDATE_ALLOCATED_UNITS,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export const bulkUpdateMaterialLevel = (postBody, isV3) => () => {
  return axiosInstance({
    url: BULK_UPDATE_MATERIALS,
    method: "POST",
    data: postBody,
    isV3,
  });
};

export default inventorySmartFinalizeStoreViewService.reducer;
