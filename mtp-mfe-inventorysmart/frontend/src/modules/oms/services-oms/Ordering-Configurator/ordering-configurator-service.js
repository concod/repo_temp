import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index.js";
import {
  GET_ORDERING_MODULE_CONFIGURATOR, //fetch the modules of Ordering
  GET_ORDERING_MODULE_PRODUCT_FILTERS, //fetch Product Attri filters
  SAVE_ORDERING_MODULE_CONFIGURATION,
  GET_KPI_DATA,
  SAVE_KPI_DATA,
} from "modules/oms/constants-oms/apiConstants";

export const orderModuleConfiguratorService = createSlice({
  name: "orderModuleConfiguratorService",
  initialState: {
    poRebalanceFilterConfigs: [],
    poRebalanceTableDataLoader: false,
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
  },
  reducers: {
    setPoRebalanceFilterConfig: (state, action) => {
      state.poRebalanceFilterConfigs = action.payload;
    },
    setPoRebalanceDataLoader: (state, action) => {
      state.poRebalanceTableDataLoader = action.payload;
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
    resetPoRebalanceState: (state) => {
      state.poRebalanceFilterConfigs = [];
      state.poRebalanceTableDataLoader = false;
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
    },
  },
});

export const {
  setPoRebalanceFilterConfig,
  setPoRebalanceDataLoader,
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
} = orderModuleConfiguratorService.actions;

// API Service Functions

export const fetchOrderingModuleConfiguratorData = () => () => {
  return axiosInstance({
    url: GET_ORDERING_MODULE_CONFIGURATOR,
    method: "GET",
  });
};

export const fetchproductFilterData = () => () => {
  return axiosInstance({
    url: GET_ORDERING_MODULE_PRODUCT_FILTERS,
    method: "GET",
  });
};

export const fetchTableConfigData = (tableName) => () => {
  return axiosInstance({
    url: `core/table-fields?table_name=${tableName}`,
    method: "GET",
  });
};

export const saveScreenConfiguration = (payload) => () => {
  return axiosInstance({
    url: SAVE_ORDERING_MODULE_CONFIGURATION,
    method: "POST",
    data: payload,
  });
};

export const fetchKPIData = (queryParams) => () => {
  return axiosInstance({
    url: GET_KPI_DATA,
    method: "GET",
    params: queryParams,
  });
};

export const saveKPIData = (payload) => () => {
  return axiosInstance({
    url: SAVE_KPI_DATA,
    method: "POST",
    data: payload,
  });
};

// export const fetchFiscalWeeks = (startDate, endDate) => () => {
//   return axiosInstance({
//     url: `${OMS_FISCAL_WEEKS}?start_date=${startDate}&end_date=${endDate}`,
//     method: "GET",
//   });
// };

// export const fetchPORebalanceSizeChoiceTableFields = (payload) => () => {
//   return axiosInstance({
//     url: PO_REBALANCE_SIZE_CHOICE_TABLE_FIELDS,
//     method: "POST",
//     data: payload
//   });
// };

// export const fetchPORebalanceSizeChoiceTableData = (payload) => () => {
//   return axiosInstance({
//     url: PO_REBALANCE_SIZE_CHOICE_TABLE_DATA,
//     method: "POST",
//     data: payload
//   });
// };

// export const fetchPORebalanceReviewRecommendationTableFields = (payload) => () => {
//   return axiosInstance({
//     url: PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_FIELDS,
//     method: "GET",
//     data: payload
//   });
// };

// export const fetchPORebalanceReviewRecommendationTableData = (payload) => () => {
//   return axiosInstance({
//     url: PO_REBALANCE_REVIEW_RECOMMENDATION_TABLE_DATA,
//     method: "POST",
//     data: payload
//   });
// };

// export const saveDraftPayload = (payload) => () => {
//   return axiosInstance({
//     url: SAVE_DRAFT_PAYLOAD,
//     method: "POST",
//     data: payload
//   });
// };

// export const fetchPOBaseUnitKPIData = (payload) => () => {
//   return axiosInstance({
//     url: PO_BASE_UNIT_KPI_DATA,
//     method: "POST",
//     data: payload
//   });
// };

// export const fetchDropdownDataForPO = (payload) => () => {
//   return axiosInstance({
//     url: DROPDOWN_DATA_FOR_PO,
//     method: "POST",
//     data: payload
//   });
// };

// export const fetchPorjectedBopRebalance = (payload) => () => {
//   return axiosInstance({
//     url: PO_REBALANCE_PROJECTED_BOP_DATA,
//     method: "POST",
//     data: payload
//   });
// };

// export const fetchWeekLevelSaveTypeData = (payload) => () => {
//   return axiosInstance({
//     url: OMS_WEEK_LEVEL_SAVETYPE_API,
//     method: "POST",
//     data: payload
//   });
// };

export default orderModuleConfiguratorService.reducer;
