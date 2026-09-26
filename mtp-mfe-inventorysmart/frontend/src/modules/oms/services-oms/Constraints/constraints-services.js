import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  CONSTRAINTS_STATUS_TABLE_CONFIG,
  CONSTRAINTS_STATUS_TABLE_DATA,
  CONSTRAINTS_ORDERING_TABLE_CONFIG,
  CONSTRAINTS_ORDERING_TABLE_DATA,
  CONSTRAINTS_ORDER_POLICY_TABLE_CONFIG,
  CONSTRAINTS_ORDER_POLICY_TABLE_DATA,
  CONSTRAINTS_SAFETY_STOCK_TABLE_CONFIG,
  CONSTRAINTS_SAFETY_STOCK_VENDOR_STORE_TABLE_CONFIG,
  CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_CONFIG,
  CONSTRAINTS_DELIVERY_LEAD_TIME_VENDOR_STORE_TABLE_CONFIG,
  CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_DATA,
  CONSTRAINTS_DELIVERY_LEAD_TIME_VENDOR_STORE_TABLE_DATA,
  CONSTRAINTS_DELIVERY_QC_TIME_TABLE_CONFIG,
  CONSTRAINTS_DELIVERY_QC_TIME_TABLE_DATA,
  VENDOR_CONSTRAINTS_TABLE_CONFIG,
  VENDOR_CONSTRAINTS_TABLE_DATA,
  CONSTRAINTS_OMS_FILTER_CONFIG,
  CONSTRAINTS_OMS_FILTER_CONFIG_VENDOR_STORE,
  SAVE_CONSTRAINTS_DELIVERY_LEAD_TIME,
  SAVE_CONSTRAINTS_DELIVERY_LEAD_TIME_VENDOR_STORE,
  SAVE_CONSTRAINTS_STATUS,
  SAVE_CONSTRAINTS_DELIVERY_QC_TIME,
  SAVE_CONSTRAINTS_SAFETY_STOCK,
  SAVE_CONSTRAINTS_SAFETY_STOCK_VENDOR_STORE,
  SAVE_CONSTRAINTS_ORDERING,
  SAVE_CONSTRAINTS_ORDER_POLICY,
  SAVE_CONSTRAINTS_ORDER_POLICY_SCHEDULER,
  CONSTRAINTS_SAFETY_STOCK_TABLE_DATA,
  CONSTRAINTS_SAFETY_STOCK_TABLE_DATA_VENDOR_STORE,
  SAVE_CONSTRAINTS_PO_CONVERSION,
  CONSTRAINTS_DELIVERY_QC_TIME_DOWNLOAD_TABLE_DATA,
  CONSTRAINTS_DELIVERY_LEAD_TIME_DOWNLOAD_TABLE_DATA,
  CONSTRAINTS_STATUS_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_ORDERING_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_SAFETY_STOCK_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_SAFETY_STOCK_TABLE_VENDOR_STORE_DOWNLOAD_DATA,
  CONSTRAINTS_ORDER_POLICY_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_PO_CONVERSION_TABLE_DOWNLOAD_DATA,
  CONSTRAINTS_PO_CONVERSION_TABLE_CONFIG,
  CONSTRAINTS_PO_CONVERSION_TABLE_DATA,
  SAVE_RULES_CONSTRAINTS,
  OMS_PARTIAL_SET_ALL_FOR_RULES,
  SHIPMENT_CONSTRAINT_TABLE_CONFIG,
  SHIPMENT_CONSTRAINT_TABLE_DATA,
  SHIPMENT_CONSTRAINTS_UPDATE_CONSTRAINTS,
  CONFIGURATIONS_OMS_FILTER_CONFIG,
  CONFIGURATIONS_OMS_FILTER_CONFIG_VENDOR,
  OMS_VENDOR_CONSTRAINTS_STYLE_PACK_ID_MAPPING,
  OMS_RULES_DELETE,
  SAVE_CONSTRAINTS_ORDER_POLICY_SHIPMENT_SCHEDULER
} from "modules/oms/constants-oms/constraintsAPIConstants";
import { CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA } from "modules/oms/constants-oms/apiConstants";

export const orderingConstraintsService = createSlice({
  name: "orderingConstraintsService",
  initialState: {
    constraintsLoader: false,
    constraintsOmsLoader: false,
    constraintsTableConfigLoader: false,
    constraintsStatusTableDataLoader: false,
    constraintsStatusTableConfigLoader: false,
    constraintsOrderingTableDataLoader: false,
    constraintsOrderingTableConfigLoader: false,
    constraintsOrderPolicyTableDataLoader: false,
    constraintsVendorDCPolicyTableDataLoader: false,
    constraintsOrderPolicyTableConfigLoader: false,
    constraintsVendorDCPolicyTableConfigLoader: false,
    constraintsSafetyStockTableDataLoader: false,
    constraintsSafetyStockTableConfigLoader: false,
    constraintsDeleiveryLeadTimeTableDataLoader: false,
    constraintsDeleiveryLeadTimeTableConfigLoader: false,
    constraintsDeleiveryQcTimeTableDataLoader: false,
    constraintsDeleiveryQcTimeTableConfigLoader: false,
    constraintsPoConversionTableConfigLoader: false,
    constraintsPoConversionTableDataLoader: false,
    vendorConstraintsTableDataLoader: false,
    vendorConstraintsTableConfigLoader: false,
    vendorConstraintsPackOrderIds: [],
    constraintsTableConfig: [],
    constraintsTableData: [],
    constraintsOmsTableData: [],
    selectedConstraintArticles: [],
    selectedFilters: [],
    selectedOmsFilters: [],
    constraintsOmsFilterDependency: [],
    constraintsOmsFilterElements: [],
    constraintsEditSuccess: false,
    constraintsEditFailed: false,
    constraintsSetAllSuccess: false,
    constraintsSetAllFailed: false,
    isFilterOmsValid: false,
    selectedRules: [],
    omsConstraintsScreenConfig: null,
  },
  reducers: {
    setConstraintsLoader: (state, action) => {
      state.constraintsLoader = action.payload;
    },
    setConstraintsOmsLoader: (state, action) => {
      state.constraintsOmsLoader = action.payload;
    },
    setConstraintsTableConfigLoader: (state, action) => {
      state.constraintsTableConfigLoader = action.payload;
    },
    setConstraintsSafetyStockTableDataLoader: (state, action) => {
      state.constraintsSafetyStockTableDataLoader = action.payload;
    },
    setConstraintsSafetyStockTableConfigLoader: (state, action) => {
      state.constraintsSafetyStockTableConfigLoader = action.payload;
    },
    setConstraintsStatusTableDataLoader: (state, action) => {
      state.constraintsStatusTableDataLoader = action.payload;
    },
    setConstraintsStatusTableConfigLoader: (state, action) => {
      state.constraintsStatusTableConfigLoader = action.payload;
    },
    setConstraintsOrderingTableDataLoader: (state, action) => {
      state.constraintsOrderingTableDataLoader = action.payload;
    },
    setConstraintsOrderingTableConfigLoader: (state, action) => {
      state.constraintsOrderingTableConfigLoader = action.payload;
    },
    setConstraintsOrderPolicyTableDataLoader: (state, action) => {
      state.constraintsOrderPolicyTableDataLoader = action.payload;
    },
    setConstraintsVendorDCPolicyTableDataLoader: (state, action) => {
      state.constraintsVendorDCPolicyTableDataLoader = action.payload;
    },
    setConstraintsOrderPolicyTableConfigLoader: (state, action) => {
      state.constraintsOrderPolicyTableConfigLoader = action.payload;
    },
    setConstraintsVendorDCPolicyTableConfigLoader: (state, action) => {
      state.constraintsVendorDCPolicyTableConfigLoader = action.payload;
    },
    setConstraintsDeleiveryLeadTimeTableDataLoader: (state, action) => {
      state.constraintsDeleiveryLeadTimeTableDataLoader = action.payload;
    },
    setConstraintsDeleiveryLeadTimeTableConfigLoader: (state, action) => {
      state.constraintsDeleiveryLeadTimeTableConfigLoader = action.payload;
    },
    setConstraintsDeleiveryQcTimeTableDataLoader: (state, action) => {
      state.constraintsDeleiveryQcTimeTableDataLoader = action.payload;
    },
    setConstraintsDeleiveryQcTimeTableConfigLoader: (state, action) => {
      state.constraintsDeleiveryQcTimeTableConfigLoader = action.payload;
    },
    setConstraintsPoConversionTableConfigLoader: (state, action) => {
      state.constraintsPoConversionTableConfigLoader = action.payload;
    },
    setConstraintsPoConversionTableDataLoader: (state, action) => {
      state.constraintsPoConversionTableDataLoader = action.payload;
    },
    setVendorConstraintsTableDataLoader: (state, action) => {
      state.vendorConstraintsTableDataLoader = action.payload;
    },
    setVendorConstraintsTableConfigLoader: (state, action) => {
      state.vendorConstraintsTableConfigLoader = action.payload;
    },
    setVendorConstraintsPackOrderIds: (state, action) => {
      state.vendorConstraintsPackOrderIds = action.payload;
    },
    setConstraintsArticles: (state, action) => {
      state.selectedConstraintArticles = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setSelectedOmsFilters: (state, action) => {
      state.selectedOmsFilters = action.payload;
    },
    resetSelectedOmsFilters: (state, action) => {
      state.selectedOmsFilters = [];
    },

    setConstraintsOmsFilterDependency: (state, action) => {
      state.constraintsOmsFilterDependency = action.payload;
    },
    setConstraintsOmsFilterElements: (state, action) => {
      state.constraintsOmsFilterElements = action.payload;
    },
    setConstraintsEditSuccess: (state, action) => {
      state.constraintsOmsFilterElements = action.payload;
    },
    setConstraintsEditFailed: (state, action) => {
      state.constraintsOmsFilterElements = action.payload;
    },
    setConstraintsSetAllSuccess: (state, action) => {
      state.constraintsOmsFilterElements = action.payload;
    },
    setConstraintsSetAllFailed: (state, action) => {
      state.constraintsOmsFilterElements = action.payload;
    },
    setIsFilterOmsValid: (state, action) => {
      state.isFilterOmsValid = action.payload;
    },
    setOMSSelectedRulesList: (state, action) => {
      state.selectedRules = action.payload;
    },
    setOmsConstraintsScreenConfig: (state, action) => {
      state.omsConstraintsScreenConfig = action.payload;
    },
    resetConstraintsState: (state) => {
      state.constraintsLoader = false;
      state.constraintsOmsLoader = false;
      state.constraintsTableConfigLoader = false;
      state.constraintsStatusTableDataLoader = false;
      state.constraintsStatusTableConfigLoader = false;
      state.constraintsOrderingTableDataLoader = false;
      state.constraintsOrderingTableConfigLoader = false;
      state.constraintsOrderPolicyTableDataLoader = false;
      state.constraintsVendorDCPolicyTableDataLoader = false;
      state.constraintsOrderPolicyTableConfigLoader = false;
      state.constraintsVendorDCPolicyTableConfigLoader = false;
      state.constraintsSafetyStockTableDataLoader = false;
      state.constraintsSafetyStockTableConfigLoader = false;
      state.constraintsDeleiveryLeadTimeTableDataLoader = false;
      state.constraintsDeleiveryLeadTimeTableConfigLoader = false;
      state.constraintsDeleiveryQcTimeTableDataLoader = false;
      state.constraintsDeleiveryQcTimeTableConfigLoader = false;
      state.constraintsPoConversionTableConfigLoader = false;
      state.constraintsPoConversionTableDataLoader = false;
      state.vendorConstraintsTableDataLoader = false;
      state.vendorConstraintsTableConfigLoader = false;
      state.vendorConstraintsPackOrderIds = [];
      state.constraintsTableConfig = [];
      state.constraintsTableData = [];
      state.selectedConstraintArticles = [];
      state.selectedFilters = [];
      state.selectedOmsFilters = [];
      state.constraintsOmsFilterDependency = [];
      state.constraintsOmsFilterElements = [];
      state.constraintsOmsTableData = [];
      state.constraintsEditFailed = false;
      state.constraintsEditSuccess = false;
      state.constraintsSetAllFailed = false;
      state.constraintsSetAllSuccess = false;
      state.isFilterOmsValid = false;
      state.selectedRules = [];
    },
  },
});

export const {
  setConstraintsLoader,
  setConstraintsOmsLoader,
  setConstraintsTableConfigLoader,
  setConstraintsArticles,

  setSelectedFilters,
  setSelectedOmsFilters,
  resetSelectedOmsFilters,
  setConstraintsOmsFilterElements,
  setConstraintsOmsFilterDependency,
  resetConstraintsState,
  setConstraintsStatusTableDataLoader,
  setConstraintsStatusTableConfigLoader,
  setConstraintsOrderingTableDataLoader,
  setConstraintsOrderingTableConfigLoader,
  setConstraintsOrderPolicyTableDataLoader,
  setConstraintsVendorDCPolicyTableDataLoader,
  setConstraintsOrderPolicyTableConfigLoader,
  setConstraintsVendorDCPolicyTableConfigLoader,
  setConstraintsSafetyStockTableDataLoader,
  setConstraintsSafetyStockTableConfigLoader,
  setConstraintsDeleiveryLeadTimeTableDataLoader,
  setConstraintsDeleiveryLeadTimeTableConfigLoader,
  setConstraintsDeleiveryQcTimeTableDataLoader,
  setConstraintsDeleiveryQcTimeTableConfigLoader,
  setConstraintsPoConversionTableDataLoader,
  setConstraintsPoConversionTableConfigLoader,
  setVendorConstraintsTableDataLoader,
  setVendorConstraintsTableConfigLoader,
  setVendorConstraintsPackOrderIds,
  setConstraintsEditFailed,
  setConstraintsEditSuccess,
  setConstraintsSetAllFailed,
  setConstraintsSetAllSuccess,
  setIsFilterOmsValid,
  setOMSSelectedRulesList,
  setOmsConstraintsScreenConfig,
} = orderingConstraintsService.actions;

export const getConstraintOmsFilterConfiguration = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_OMS_FILTER_CONFIG,
    method: "GET",
  });
};

export const getConstraintOmsFilterConfigurationVendorStore = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_OMS_FILTER_CONFIG_VENDOR_STORE,
    method: "GET",
  });
};

export const getConfigurationsOmsFilterConfiguration = () => () => {
  return axiosInstance({
    url: CONFIGURATIONS_OMS_FILTER_CONFIG,
    method: "GET",
  });
};

export const getConfigurationsOmsVendorFilterConfiguration = () => () => {
  return axiosInstance({
    url: CONFIGURATIONS_OMS_FILTER_CONFIG_VENDOR,
    method: "GET",
  });
};

export const getOmsRulesConstraintsFilterConfiguration = (
  filterConfig = "Inventorysmart Oms Constraints"
) => () => {
  return axiosInstance({
    url: `core/filter-configuration/screen/${filterConfig}`,
    method: "GET",
  });
};

export const getConstraintsStatusTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_STATUS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsStatusTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_STATUS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsStatusDownloadTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_STATUS_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsOrderingTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDERING_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsOrderingTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDERING_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsOrderingTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDERING_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsOrderPolicyTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsVendorDCPolicyTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_CONFIG,
    method: "GET",
  });
  // return column;
};

export const getConstraintsOrderPolicyTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsVendorDCPolicyTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
  // return data;
};

export const getConstraintsOrderPolicyTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsVendorDCPolicyTableDownloadData = (
  postBody
) => () => {
  return axiosInstance({
    url: CONSTRAINTS_ORDER_POLICY_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsSafetyStockVendorStoreTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_VENDOR_STORE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsSafetyStockTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockTableDataVendorStore = (
  postBody
) => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_DATA_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockTableDownloadDataVendorStore = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_SAFETY_STOCK_TABLE_VENDOR_STORE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryLeadTimeTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsDeleiveryLeadTimeVendorStoreTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_VENDOR_STORE_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsDeleiveryLeadTimeTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryLeadTimeVendorStoreTableData = (
  postBody
) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_VENDOR_STORE_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryLeadTimeDownlaodTableData = (
  postBody
) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_LEAD_TIME_DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryQcTimeTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_QC_TIME_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsDeleiveryQcTimeTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_QC_TIME_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsDeleiveryQcTimeDownloadTableData = (
  postBody
) => () => {
  return axiosInstance({
    url: CONSTRAINTS_DELIVERY_QC_TIME_DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsPoConversionTableConfig = () => () => {
  return axiosInstance({
    url: CONSTRAINTS_PO_CONVERSION_TABLE_CONFIG,
    method: "GET",
  });
};

export const getConstraintsPoConversionTableData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_PO_CONVERSION_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsPoConversionTableDownloadData = (postBody) => () => {
  return axiosInstance({
    url: CONSTRAINTS_PO_CONVERSION_TABLE_DOWNLOAD_DATA,
    method: "POST",
    data: postBody,
  });
};

// Edit Api

export const setConstraintsStatusData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_STATUS,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsDeliveryLeadTimeData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_DELIVERY_LEAD_TIME,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsDeliveryLeadTimeDataVendorStore = (
  postBody
) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_DELIVERY_LEAD_TIME_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsDeliveryQcTimeData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_DELIVERY_QC_TIME,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsOrderingData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_ORDERING,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsOrderPolicyData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_ORDER_POLICY,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsVendorDCPolicyData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_ORDER_POLICY,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsVendorDCPolicySchedulerData = () => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_ORDER_POLICY_SCHEDULER,
    method: "GET",
  });
};

export const getConstraintsSafetyStockData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_SAFETY_STOCK,
    method: "POST",
    data: postBody,
  });
};

export const getConstraintsSafetyStockDataVendorStore = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_SAFETY_STOCK_VENDOR_STORE,
    method: "POST",
    data: postBody,
  });
};

export const setConstraintsPoConveersionData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_PO_CONVERSION,
    method: "POST",
    data: postBody,
  });
};

// OMS Vendor Constraints
export const getVendorConstraintsTableConfig = () => () => {
  return axiosInstance({
    url: VENDOR_CONSTRAINTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getVendorConstraintsTableData = (postBody) => () => {
  return axiosInstance({
    url: VENDOR_CONSTRAINTS_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const setRulesConstraintsData = (postBody) => () => {
  return axiosInstance({
    url: SAVE_RULES_CONSTRAINTS,
    method: "POST",
    data: postBody,
  });
};

export const setRulesConstraintsDataPartial = (postBody) => () => {
  return axiosInstance({
    url: OMS_PARTIAL_SET_ALL_FOR_RULES,
    method: "POST",
    data: postBody,
  });
};

// OMS Vendor Constraints - Pack Ordering
export const getVendorConstraintsStylePackIdMapping = (postBody) => () => {
  return axiosInstance({
    url: OMS_VENDOR_CONSTRAINTS_STYLE_PACK_ID_MAPPING,
    method: "POST",
    data: postBody,
  });
};

export const deleteOrderingRules = (postBody) => {
  const url = OMS_RULES_DELETE;

  return axiosInstance({
    url,
    method: "POST",
    data: postBody,
  });
};

export const getCreateScenarioSafetyStockTableData = (postBody) => () => {
  return axiosInstance({
    url: CREATE_SCENARIO_SAFETY_STOCK_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

//SHIPMENT CONSTRAINTS
export const getShipmentConstraintsTableConfig = () => () => {
  return axiosInstance({
    url: SHIPMENT_CONSTRAINT_TABLE_CONFIG,
    method: "GET",
  });
};

export const getShipmentConstraintsTableData = (payload) => () => {
  return axiosInstance({
    url: SHIPMENT_CONSTRAINT_TABLE_DATA,
    method: "POST",
    data: payload,
  });
};

export const updateShipmentConstraints = (payload) => () => {
  return axiosInstance({
    url: SHIPMENT_CONSTRAINTS_UPDATE_CONSTRAINTS,
    method: "POST",
    data: payload,
  });
};

export const getConstraintsVendorDCPolicyShipmentSchedulerData = () => () => {
  return axiosInstance({
    url: SAVE_CONSTRAINTS_ORDER_POLICY_SHIPMENT_SCHEDULER,
    method: "GET",
  });
};

export default orderingConstraintsService.reducer;
