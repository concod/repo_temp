import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index.js";

import {
  PO_REBALANCE_TABLE_FIELDS,
  PO_REBALANCE_TABLE_DATA,
  PO_REBALANCE_SIZE_CHOICE_TABLE_FIELDS,
  PO_REBALANCE_SIZE_CHOICE_TABLE_DATA,
  PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_FIELDS,
  PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_DATA,
  SAVE_DRAFT_PAYLOAD,
  PO_BASE_UNIT_KPI_DATA,
  DROPDOWN_DATA_FOR_PO,
  PO_REBALANCE_PROJECTED_BOP_DATA,
  OMS_WEEK_LEVEL_SAVETYPE_API,
  OMS_FISCAL_WEEKS,
} from "modules/oms/constants-oms/apiConstants.js";

export const poRebalanceService = createSlice({
  name: "poRebalanceService",
  initialState: {
    poRebalanceFilterConfigs: [],
    poRebalanceTableDataLoader: false,
    poRebalanceSubClassTableDataLoader: false,
    poRebalanceTableFieldsLoader: false,
    poRebalanceFilterDependency: [],
    selectedFilters: [],
    isFiltersValid: false,
    filterElements: [],
    dateFilters: [],
    backButtonClicked: false,
    redirectDetails: null,
    tableData: null,
    tableColumns: [],
    poRebalanceData: [],
    choiceChannelTranferData: [],
    dropdownDataForPO: [],
    xAxisStaticDates: {},
  },
  reducers: {
    setPoRebalanceFilterConfig: (state, action) => {
      state.poRebalanceFilterConfigs = action.payload;
    },
    setPoRebalanceDataLoader: (state, action) => {
      state.poRebalanceTableDataLoader = action.payload;
    },
    setPoRebalanceTableFieldsLoader: (state, action) => {
      state.poRebalanceTableFieldsLoader = action.payload;
    },
    setPoRebalanceSubClassTableDataLoader: (state, action) => {
      state.poRebalanceSubClassTableDataLoader = action.payload;
    },
    setPoRebalanceFilterDependency: (state, action) => {
      state.poRebalanceFilterDependency = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setFilterElements: (state, action) => {
      state.filterElements = action.payload;
    },
    setDateFilters: (state, action) => {
      state.dateFilters = action.payload;
    },
    setBackButtonClicked: (state, action) => {
      state.backButtonClicked = action.payload;
    },
    setRedirectDetails: (state, action) => {
      state.redirectDetails = action.payload;
    },
    setTableData: (state, action) => {
      state.tableData = action.payload;
    },
    setPoRebalanceData: (state, action) => {
      state.poRebalanceData = action.payload;
    },
    setTableColumns: (state, action) => {
      state.tableColumns = action.payload;
    },
    setChoiceChannelTranferData: (state, action) => {
      state.choiceChannelTranferData = action.payload;
    },
    setDropdownDataForPO: (state, action) => {
      state.dropdownDataForPO = action.payload;
    },
    setXaxisStaticDates: (state, action) => {
      state.xAxisStaticDates = action.payload;
    },
    resetPoRebalanceState: (state) => {
      state.poRebalanceFilterConfigs = [];
      state.poRebalanceTableDataLoader = false;
      state.poRebalanceTableFieldsLoader = false;
      state.poRebalanceSubClassTableDataLoader = false;
      state.poRebalanceFilterDependency = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.filterElements = [];
      state.dateFilters = [];
      state.backButtonClicked = false;
      state.redirectDetails = null;
      state.tableData = null;
      state.tableColumns = [];
      state.poRebalanceData = [];
      state.choiceChannelTranferData = [];
      state.dropdownDataForPO = [];
      state.xAxisStaticDates = {};
    },
  },
});

export const {
  setPoRebalanceFilterConfig,
  setPoRebalanceDataLoader,
  setPoRebalanceSubClassTableDataLoader,
  setPoRebalanceTableFieldsLoader,
  setPoRebalanceFilterDependency,
  setSelectedFilters,
  setIsFiltersValid,
  setFilterElements,
  setDateFilters,
  setBackButtonClicked,
  setRedirectDetails,
  setTableData,
  setTableColumns,
  resetPoRebalanceState,
  setPoRebalanceData,
  setChoiceChannelTranferData,
  setDropdownDataForPO,
  setXaxisStaticDates,
} = poRebalanceService.actions;

// API Service Functions

export const fetchPORebalanceTableFields = (payload) => () => {
  return axiosInstance({
    url: PO_REBALANCE_TABLE_FIELDS,
    method: "POST",
    data: payload,
  });
};

export const fetchPORebalanceTableData = (payload) => () => {
  return axiosInstance({
    url: PO_REBALANCE_TABLE_DATA,
    method: "POST",
    data: payload,
  });
};

export const fetchFiscalWeeks = (startDate, endDate) => () => {
  return axiosInstance({
    url: `${OMS_FISCAL_WEEKS}?start_date=${startDate}&end_date=${endDate}`,
    method: "GET",
  });
};

export const fetchPORebalanceSizeChoiceTableFields = (payload) => () => {
  return axiosInstance({
    url: PO_REBALANCE_SIZE_CHOICE_TABLE_FIELDS,
    method: "POST",
    data: payload,
  });
};

export const fetchPORebalanceSizeChoiceTableData = (payload) => () => {
  return axiosInstance({
    url: PO_REBALANCE_SIZE_CHOICE_TABLE_DATA,
    method: "POST",
    data: payload,
  });
};

export const fetchPORebalanceReviewRecommendationTableFields = (
  payload
) => () => {
  return axiosInstance({
    url: PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_FIELDS,
    method: "GET",
    data: payload,
  });
};

export const fetchPORebalanceReviewRecommendationTableData = (
  payload
) => () => {
  return axiosInstance({
    url: PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_DATA,
    method: "POST",
    data: payload,
  });
};

export const saveDraftPayload = (payload) => () => {
  return axiosInstance({
    url: SAVE_DRAFT_PAYLOAD,
    method: "POST",
    data: payload,
  });
};

export const fetchPOBaseUnitKPIData = (payload) => () => {
  return axiosInstance({
    url: PO_BASE_UNIT_KPI_DATA,
    method: "POST",
    data: payload,
  });
};

export const fetchDropdownDataForPO = (payload) => () => {
  return axiosInstance({
    url: DROPDOWN_DATA_FOR_PO,
    method: "POST",
    data: payload,
  });
};

export const fetchPorjectedBopRebalance = (payload) => () => {
  return axiosInstance({
    url: PO_REBALANCE_PROJECTED_BOP_DATA,
    method: "POST",
    data: payload,
  });
};

export const fetchWeekLevelSaveTypeData = (payload) => () => {
  return axiosInstance({
    url: OMS_WEEK_LEVEL_SAVETYPE_API,
    method: "POST",
    data: payload,
  });
};

export default poRebalanceService.reducer;
