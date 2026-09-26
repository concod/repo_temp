import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  DELETE_FROM_EXCEPTION_TABLE,
  EXCEPTION_CONSTRAINTS_CREATE,
  EXCEPTION_CREATE_PARTIAL_SET_ALL,
  EXCEPTION_CREATE_SET_ALL,
  EXCEPTION_DELETE,
  EXCEPTION_LIST,
  EXCEPTION_LIST_ONCLICK,
  EXCEPTION_PRODUCT_LIST,
  EXCEPTION_PRODUCT_STORE_LIST,
  EXCEPTION_STORE_LIST,
  SAVE_EXCEPTION_TABLE,
  SET_ALL_EXCEPTION_TABLE,
  SET_ALL_PARTIAL_EXCEPTION_TABLE,
  SAVE_EXCEPTION_RULE_NAME,
  DOWNLOAD_EXCEPTION_CONSTRAINTS,
  EXCEPTION_SUMMARY,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const exceptionConstraintsService = createSlice({
  name: "exceptionConstraintService",
  initialState: {
    exceptionFiltersConfig: [],
    exceptionLoader: false,
    productExceptionFilterConfig: [],
    selectedExceptionList: [],
    exceptionTableLoader: false,
    savedEditedExceptions: [],
    showSetAllModal: false,
    filtersOfExceptionProdStores: [],
    filtersOfExceptionStoreList: [],
    isSetAllModalVisible: false,
    exceptionSetAllModalData: [],
    productListExceptions: [],
    storeListExceptions: [],
    productListFilters: [],
    storeListFilters: [],
    exceptionTabState: {
      selectedProductList: [],
      selectedStoreList: [],
      savedEditedConstraints: [],
      exceptionConstraintTableData: [],
      selectedExceptionConstraintsList: [],
      tempExceptionsTableName: null,
      productListBackFlowData: {},
      storeListBackFlowData: {},
    },
    addExceptionStoreFilterConfig: [],
    setAllModalLoader: false,
    stateAfterExceptionUpdate: false,
    exceptionConfigs:{},
    exceptionSummaryData: {},
    exceptionSummaryLoader: false,
  },
  reducers: {
    setExceptionFilterConfig: (state, action) => {
      state.exceptionFiltersConfig = action.payload;
    },
    setExceptionTableLoader: (state, action) => {
      state.exceptionLoader = action.payload;
    },
    setExceptionTableData: (state, action) => {
      state.rulesTableData = action.payload;
    },
    setProductListData: (state, action) => {
      state.rulesTableData = action.payload;
    },
    setExceptionStoreFilterConfig: (state, action) => {
      state.productExceptionFilterConfig = action.payload;
    },
    saveEditedExceptions: (state, action) => {
      state.savedEditedExceptions = action.payload;
    },
    setAllModalVisible: (state, action) => {
      state.showSetAllModal = action.payload;
    },
    setSelectedProductList: (state, action) => {
      state.exceptionTabState.selectedProductList = action.payload;
    },
    setProductListBackFlowData: (state, action) => {
      state.exceptionTabState.productListBackFlowData = action.payload;
    },
    setStoreListBackFlowData: (state, action) => {
      state.exceptionTabState.storeListBackFlowData = action.payload;
    },
    setSelectedStoreList: (state, action) => {
      state.exceptionTabState.selectedStoreList = action.payload;
    },
    setExceptionConstraintsTableData: (state, action) => {
      state.exceptionTabState.exceptionConstraintTableData = action.payload;
    },
    setFiltersForExceptionProdStores: (state, action) => {
      state.filtersOfExceptionProdStores = action.payload;
    },
    setExceptionStoreListFilters: (state, action) => {
      state.filtersOfExceptionStoreList = action.payload;
    },
    setStoreTableData: (state, action) => {
      state.storeTableData = action.payload;
    },
    setAllModalVisibility: (state, action) => {
      state.isSetAllModalVisible = action.payload;
    },
    setAllModalData: (state, action) => {
      state.exceptionSetAllModalData = action.payload;
    },
    setSelectedExceptionConstraintsList: (state, action) => {
      state.exceptionTabState.selectedExceptionConstraintsList = action.payload;
    },
    saveEditedConstraints: (state, action) => {
      state.exceptionTabState.savedEditedConstraints = action.payload;
    },
    setExceptionsCreatedTableName: (state, action) => {
      state.exceptionTabState.tempExceptionsTableName = action.payload;
    },
    setSelectedExceptionList: (state, action) => {
      state.selectedExceptionList = action.payload;
    },
    setAddExceptionStoreFilterConfig: (state, action) => {
      state.addExceptionStoreFilterConfig = action.payload;
    },
    setSetAllModalLoader: (state, action) => {
      state.setAllModalLoader = action.payload;
    },
    saveStateAfterExceptionUpdate: (state, action) => {
      state.stateAfterExceptionUpdate = action.payload;
    },
    setProductListFilters: (state, action) => {
      state.productListFilters = action.payload;
    },
    setStoreListFilters: (state, action) => {
      state.storeListFilters = action.payload;
    },
    clearExceptionTabState: (state, action) => {
      state.exceptionTabState.savedEditedConstraints = [];
      state.exceptionTabState.selectedExceptionConstraintsList = [];
      state.exceptionTabState.exceptionConstraintTableData = [];
      state.exceptionTabState.selectedProductList = [];
      state.exceptionTabState.selectedStoreList = [];
      state.exceptionTabState.tempExceptionsTableName = [];
      state.filtersOfExceptionProdStores = [];
      state.filtersOfExceptionStoreList = [];
      state.stateAfterExceptionUpdate = [];
      state.exceptionTabState.productListBackFlowData = {};
      state.exceptionTabState.storeListBackFlowData = {};
      state.addExceptionStoreFilterConfig = [];
    },
    setExceptionConfigs:(state,action) => {
      state.exceptionConfigs = action.payload
    },
    setExceptionSummaryData: (state, action) => {
      state.exceptionSummaryData = action.payload;
    },
    setExceptionSummaryLoader: (state, action) => {
      state.exceptionSummaryLoader = action.payload;
    }
  },
});
export const {
  setExceptionFilterConfig,
  setExceptionTableLoader,
  setExceptionTableData,
  setSelectedExceptionList,
  setExceptionStoreFilterConfig,
  saveEditedExceptions,
  setAllModalVisible,
  setSelectedProductList,
  setSelectedStoreList,
  setExceptionConstraintsTableData,
  setFiltersForExceptionProdStores,
  setExceptionStoreListFilters,
  setStoreTableData,
  setAllModalVisibility,
  setAllModalData,
  setSelectedExceptionConstraintsList,
  saveEditedConstraints,
  setExceptionsCreatedTableName,
  setAddExceptionStoreFilterConfig,
  setSetAllModalLoader,
  saveStateAfterExceptionUpdate,
  setProductListFilters,
  setStoreListFilters,
  clearExceptionTabState,
  setProductListBackFlowData,
  setStoreListBackFlowData,
  setExceptionConfigs,
  setExceptionSummaryData,
  setExceptionSummaryLoader,
} = exceptionConstraintsService.actions;

export const getExceptionListData = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_LIST,
    method: "POST",
    data: postBody,
  });
};

export const getExceptionListOnClick = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_LIST_ONCLICK,
    method: "POST",
    data: postBody,
  });
};

export const deleteExceptions = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_DELETE,
    method: "POST",
    data: postBody,
  });
};

export const getProductListData = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_PRODUCT_LIST,
    method: "POST",
    data: postBody,
  });
};

export const getStoreListData = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_STORE_LIST,
    method: "POST",
    data: postBody,
  });
};

export const getProductStoreListData = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_PRODUCT_STORE_LIST,
    method: "POST",
    data: postBody,
  });
};

export const createExceptionConstraints = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_CONSTRAINTS_CREATE,
    method: "POST",
    data: postBody,
  });
};

export const saveSetAllModalData = (postBody, isPartialSetAll) => {
  let url = SET_ALL_EXCEPTION_TABLE;
  if (isPartialSetAll) {
    url = SET_ALL_PARTIAL_EXCEPTION_TABLE;
  }
  return axiosInstance({
    url: url,
    method: "POST",
    data: postBody,
  });
};

export const saveSetAllDataConstraints = (postBody, isPartialSetAll) => {
  let url = EXCEPTION_CREATE_SET_ALL;
  if (isPartialSetAll) {
    url = EXCEPTION_CREATE_PARTIAL_SET_ALL;
  }
  return axiosInstance({
    url: url,
    method: "POST",
    data: postBody,
  });
};

export const deleteExceptionsFromTable = (postBody) => {
  return axiosInstance({
    url: DELETE_FROM_EXCEPTION_TABLE,
    method: "POST",
    data: postBody,
  });
};

export const saveConstraintsData = (tableName) => {
  return axiosInstance({
    url: `${SAVE_EXCEPTION_TABLE}/${tableName}`,
    method: "GET",
  });
};

export const saveExceptionRuleName = (postBody) => {
  return axiosInstance({
    url: SAVE_EXCEPTION_RULE_NAME,
    method: "POST",
    data: postBody,
  });
};

export const downloadExceptionConstraints = (postBody) => async () => {
  return axiosInstance({
    url:DOWNLOAD_EXCEPTION_CONSTRAINTS,
    method:"POST",
    data:postBody,
  })
}

export const getExceptionSummary = (postBody) => {
  return axiosInstance({
    url: EXCEPTION_SUMMARY,
    method: "POST",
    data: postBody,
  });
};

export default exceptionConstraintsService.reducer;
