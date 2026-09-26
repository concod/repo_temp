import { GET_FISCAL_CALENDAR } from "config/api";
import {
  ADA_DASHBOARD_CHART_DATA,
  ADA_DASHBOARD_COMPARE_FISCAL_WEEKS,
  ADA_DASHBOARD_FISCAL_WEEKS,
  ADA_DASHBOARD_GET_FISCAL_WEEKS_MONTH,
  ADA_DASHBOARD_TABLE_DATA,
  ADA_DASHBOARD_GET_DRIVER_FORECAST_DATA,
  ADA_DASHBOARD_COLUMNS,
  ADA_DASHBOARD_GET_FORECAST_MULTIPLIER_DATA,
  ADA_DASHBOARD_AGGREGATION_LEVEL_DATA,
  ADA_SAVE_DETAILED_FORECAST,
  ADA_HISTORIC_YEARS,
  ADA_SAVE_MULTIPLIER,
  ADA_SAVE_DRIVER_FORECAST,
  ADA_DASHBOARD_TENANT_FILTERS,
  DOWNLOAD_ADA_FORECAST_REPORT,
  ADA_CLIENT_CONFIG,
  ADA_USER_CONFIG,
  ADA_DASHBOARD_HISTORICAL_WEEKS,
  ADA_GET_FORECAST_AXIS_DATA,
  ADA_DASHBOARD_PRODUCT_DATA,
  ADA_GET_GRAPH_KPI_DATA,
  ADA_DEMAND_SELECTION_TABLE_DATA,
  ADA_DEMAND_SELECTION_UPDATE_MFP_DATA,
  ADA_UPLOAD_DRIVERS_FORECAST_BULK_DATA,
  FORECASTSMART_ADA_CLIENT_CONFIG,
  get_status_check_for_user_level_update,
  ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_DATA,
  FILTERED_PRODUCT_STORE_CODE,
  ADA_FORECAST_ATTRIBUTES_DATA,
  ADA_HISTORIC_FORECAST_ATTRIBUTES_DATA,
  ADA_ACTUALS_FORECAST_ATTRIBUTES_DATA,
  ADA_DASHBOARD_ALL_COLUMNS,
  ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_RANK_DATA,
  ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_CHANNEL_DETAIL_TABLE_DATA,
  ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_RANK_DATA_NEW,
  ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_AGG_LEVEL_DATA,
  COMBINED_CROSS_DIMENSIONAL_API_V3,
  ADA_DASHBOARD_AGGREGATION_LEVEL_DATA_WITH_COMPARE,
  CHECK_LENGTH_DOWNLOAD_ADA_VISUAL_TABLE,
  ADA_DB_UPDATED_STATUS,
} from "modules/ada/constants-ada/apiConstants";
import {
  addAdjustedInitialKey,
  chartDataPayload,
  columnLabelHandler,
  configureAttributeOptions,
  configureMonthAttributeOptions,
  configureWeekAttributeOptions,
  getHistoricYearLabel,
  handleCompareBtnClick,
  handleHistoricTimePeriod,
  handlePredictedTimePeriod,
  isNumber,
  updateKeyInPlace,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import axiosInstance from "core/Utils/axios";

import { createSlice } from "@reduxjs/toolkit";
import {
  COMPARE_WITH_CONSTANTS,
  DefaultProductSeasonFilters,
  FISCAL_KEY_MAPPING,
} from "modules/ada/constants-ada/stringContants";

import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import moment from "moment";
import {
  getAllFilters,
  getFiltersValues,
} from "core/actions/filterAction";
import { cloneDeep, invert } from "lodash";
import {
  actualsHandler,
  getFiscalMonthOrQuarterFromWeeks,
  getFiscalPeriodFromWeeks,
  getFiscalWeeks,
  getFiscalWeeksFromFiscalDates,
  getHistoricActualsFiscalWeeks,
  getHistoricFiscalWeeksFromPredictednWeekCount,
  getPredictedFiscalWeeks,
  getPredictedHistoricCompareWithMapping,
  visualizationActualsDataTransformer,
  visualizationHistoricDataTransformer,
  visualizationPredictedDataTransformer,
} from "modules/ada/utils-ada/formatData";

const initialState = {
  product: [],
  store: [],
  product_store: [],
  switchTimeLine: [{ value: "W", id: "W", label: "Week" }],
  fiscalDates: {
    start_date: "",
    end_date: "",
    start_fw: null,
    end_fw: null,
  },
  channel: [],
  productGroup: [],
  storeGroup: [],
  compareWith: COMPARE_WITH_CONSTANTS[0],
  compareWithSelectedDate: [],
  compareWithFiscalWeek: [],
  historicActuals: {},

  loaderComponentCount: 0,
  forecastAttributesApiResolved: false,
  fullScreenLoaderCount: 0,
  filterFullScreenLoaderCount: 0,
  compareScreenLoader: 0,
  selectedDates: {},
  fiscalCalendarDetails: [],
  exclusionFiscalWeek: [],
  exclusionFiscalMonth: [],
  inventoryAdaPayload: {},
  isRedirectedFromInventory: false,
  selectedHistoricValue: [],
  isSnapshotResponseFetched: false,
  historicalDataFiscalWeek: {},
  historicalDataFiscalWeekCompare: {},
  predictedHistoricCompareWithMapping: {},
  isCompareWithDropdown: false,
  clientConfig: {},
  userConfig: {},
  tenantFilters: {},
  tenantConfigLoader: false,
  clientConfigLoader: false,
  userConfigLoader: false,
  xAxisStaticDates: {},
  fiscalIdPayload: {}, // For saving only fiscal id data that is used as payload for other component apis
  checkConfig: [],
  xAxisStaticHistoricDates: {},
  initialIADriverForecastData: [],
  initialDriverForecastData: [],
  isEligible: true,
  // Below two keys trigger useEffect on save for the other tab i.e.
  // if user saves adjusted, api call will trigger in scenario1 vice versa
  adjusted: 0,
  scenario1: 0,
  scenario2: 0,
  historicDropDownSelectedWeeks: { label: "ada.common.oneWeek", value: 1 },
  graphKPIdata: {},
  isFiltersApplied: false,
  isFiltersValid: false,
  appliedDateFilters: {},
  productStoreGroup: {},
  compareSave: false,
  tableColumns: {},
  historicTableColumns: {},
  forecastAttributes: {},
  historicForecastAttributes: {},
  predictedFiscalWeeks: [],
  historicActualsFiscalWeeks: [],
  editHierarchyForecastSave: "idle",
  forecastMultiplierSaveStatus: "idle",
  editHierarchyDriverSignificanceData: {},
  productSeasonFilters: DefaultProductSeasonFilters,
  productSeasonFiltersYearWeek: [],
  calendarDates: {},
  commentConfig: {},
};

export const adaDashboardService = createSlice({
  name: "adaDashboardService",
  initialState,
  reducers: {
    setTableColumns: (state, action) => {
      state.tableColumns = action.payload;
    },
    setHistoricTableColumns: (state, action) => {
      state.historicTableColumns = action.payload;
    },

    setForecastAttributes: (state, action) => {
      state.forecastAttributes = action.payload;
    },
    setHistoricForecastAttributes: (state, action) => {
      state.historicForecastAttributes = action.payload;
    },
    setPredictedFiscalWeeks: (state, action) => {
      state.predictedFiscalWeeks = action.payload;
    },
    setHistoricActualsFiscalWeeks: (state, action) => {
      state.historicActualsFiscalWeeks = action.payload;
    },
    setAppliedFilters: (state, action) => {
      state.product = action.payload.product;
      state.store = action.payload.store;
      state.product_store = action.payload.product_store;
    },
    setCheckConfig: (state, action) => {
      state.checkConfig = action.payload;
    },
    setIsRedirectedFromInventory: (state, action) => {
      state.isRedirectedFromInventory = action.payload;
    },
    setXaxisStaticDates: (state, action) => {
      state.xAxisStaticDates = action.payload;
    },
    setFiscalIdPayload: (state, action) => {
      state.fiscalIdPayload = action.payload;
    },
    setXaisStaticHistoricDates: (state, action) => {
      state.xAxisStaticHistoricDates = action.payload;
    },
    setClientConfig: (state, action) => {
      state.clientConfig = action.payload;
    },
    setUserConfig: (state, action) => {
      state.userConfig = action.payload;
    },
    setTenantFilters: (state, action) => {
      state.tenantFilters = action.payload;
    },
    setClientConfigLoader: (state, action) => {
      state.clientConfigLoader = action.payload;
    },
    setUserConfigLoader: (state, action) => {
      state.userConfigLoader = action.payload;
    },
    setTenantConfigLoader: (state, action) => {
      state.tenantConfigLoader = action.payload;
    },
    setFilters: (state, action) => {
      state[action.payload.key] = action.payload.value;
    },

    setHistoricalFiscalData: (state, action) => {
      state.selectedHistoricValue = action.payload.selectedHistoricValue;
      state.historicalDataFiscalWeek = action.payload.historicalDataFiscalWeek;
      state.historicalDataFiscalWeekCompare =
        action.payload.historicalDataFiscalWeekCompare;
      state.predictedHistoricCompareWithMapping =
        action.payload.predictedHistoricCompareWithMapping;
      state.isSnapshotResponseFetched =
        action.payload.isSnapshotResponseFetched;
    },
    setInventoryAdaPayload: (state, action) => {
      const lastYear = moment(action.payload.timeline.startDate)
        .subtract(1, "year")
        .year();

      state.inventoryAdaPayload = action.payload;
      state.isRedirectedFromInventory = true;
      state.compareWithSelectedDate = [
        {
          label: lastYear,
          value: lastYear,
          id: lastYear,
        },
      ];
    },
    setSwitch: (state, action) => {
      state.switchTimeLine = [action.payload[0]];
    },
    setFiscalDates: (state, action) => {
      state.fiscalDates = action.payload;
    },
    setHistoricActuals: (state, action) => {
      state.historicActuals = action.payload;
    },

    setComponentLoaderCount: (state, action) => {
      state.loaderComponentCount = state.loaderComponentCount + action.payload;
    },
    setForecastAttributesApiResolved: (state, action) => {
      state.forecastAttributesApiResolved = action.payload;
    },
    setFullScreenLoaderCount: (state, action) => {
      state.fullScreenLoaderCount =
        state.fullScreenLoaderCount + action.payload >= 0
          ? state.fullScreenLoaderCount + action.payload
          : 0;
    },
    setFilterFullScreenLoaderCount: (state, action) => {
      state.filterFullScreenLoaderCount =
        state.filterFullScreenLoaderCount + action.payload;
    },
    setCompareScreenLoaderCount: (state, action) => {
      state.compareScreenLoader = state.compareScreenLoader + action.payload;
    },
    setSelectedDates: (state, action) => {
      state.selectedDates = action.payload;
    },
    setFiscalCalendarDetails: (state, action) => {
      state.fiscalCalendarDetails = action.payload;
    },
    setCompareWithSelectedDate: (state, action) => {
      state.compareWithSelectedDate = action.payload;
    },
    setIsCompareWithDropdown: (state, action) => {
      state.isCompareWithDropdown = action.payload;
    },
    setCompareWithFiscalWeek: (state, action) => {
      state.compareWithFiscalWeek = action.payload;
    },

    setIAInitialDriverForecastData: (state, action) => {
      state.initialIADriverForecastData = action.payload;
    },

    setInitialDriverForecastData: (state, action) => {
      state.initialDriverForecastData = action.payload;
    },

    setInventorypreAppliedFilters: (state, action) => {
      // state.fiscalDates = action.payload.fiscalDates;
      // state.historicActuals = action.payload.historicActuals;
      state.product = action.payload.product;
      state.store = action.payload.store;
      // payload.channel is pre-extracted in setInventoryPayloadInAdaReducer
      if (action.payload.channel?.length) {
        state.channel = action.payload.channel;
      }
      state.product_store = action.payload?.product_store || [];
    },
    setEligibilityFlag: (state, action) => {
      state.isEligible = action.payload;
    },
    // Below function updates counter after save to trigger useEffect on save for the other tab
    // i.e. if user saves adjusted, api call will trigger in scenario1 vice versa
    setApiTriggerAfterSave: (state, action) => {
      state[action.payload.key] = action.payload.value
        ? state[action.payload.key] + 1
        : 0;
    },
    setGraphKPIWeeks: (state, action) => {
      state.historicDropDownSelectedWeeks = action.payload;
    },
    setOnCompareSave: (state, action) => {
      state.compareSave = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setAppliedDateFilters: (state, action) => {
      state.appliedDateFilters = action.payload;
    },
    // for M&S download, we have to send Product & Store Group in the filters
    setProductStoreGroup: (state, action) => {
      state.productStoreGroup = action.payload;
    },
    setEditHierarchyForecastSave: (state, action) => {
      state.editHierarchyForecastSave = action.payload;
    },
    setForecastMultiplierSaveStatus: (state, action) => {
      state.forecastMultiplierSaveStatus = action.payload;
    },
    setEditHierarchyDriverSignificanceData: (state, action) => {
      state.editHierarchyDriverSignificanceData = action.payload;
    },
    setProductSeasonFilters: (state, action) => {
      state.productSeasonFilters = action.payload;
    },
    resetProductSeasonFilters: (state) => {
      state.productSeasonFilters = DefaultProductSeasonFilters;
    },
    setProductSeasonFiltersYearWeek: (state, action) => {
      state.productSeasonFiltersYearWeek = action.payload;
    },
    setCalendarDates: (state, action) => {
      state.calendarDates = action.payload;
    },
    setCommentConfig: (state, action) => {
      state.commentConfig =
        action.payload?.inventory_smart_comment_and_thread || {};
    },
    resetState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setTableColumns,
  setHistoricTableColumns,
  setForecastAttributes,
  setHistoricForecastAttributes,
  setPredictedFiscalWeeks,
  setHistoricActualsFiscalWeeks,
  setAppliedFilters,
  setXaxisStaticDates,
  setFiscalIdPayload,
  setCheckConfig,
  setXaisStaticHistoricDates,
  setClientConfig,
  setUserConfig,
  setTenantFilters,
  setTenantConfigLoader,
  setClientConfigLoader,
  setUserConfigLoader,
  setFilters,
  setSwitch,
  setFiscalDates,
  resetState,
  setHistoricActuals,
  setExclusion,
  setAllExclusion,
  setComponentLoaderCount,
  setSelectedDates,
  setFiscalCalendarDetails,
  setCompareWithSelectedDate,
  setCompareWithFiscalWeek,
  setInventorypreAppliedFilters,
  setForecastAttributesApiResolved,
  setFullScreenLoaderCount,
  setFilterFullScreenLoaderCount,
  setInventoryAdaPayload,
  setHistoricalFiscalData,
  setIsCompareWithDropdown,
  setIAInitialDriverForecastData,
  setInitialDriverForecastData,
  setEligibilityFlag,
  setApiTriggerAfterSave,
  setGraphKPIWeeks,
  setOnCompareSave,
  setCompareScreenLoaderCount,
  setIsFiltersValid,
  setAppliedDateFilters,
  setProductStoreGroup,
  setIsRedirectedFromInventory,
  setEditHierarchyForecastSave,
  setForecastMultiplierSaveStatus,
  setEditHierarchyDriverSignificanceData,
  setProductSeasonFilters,
  resetProductSeasonFilters,
  setProductSeasonFiltersYearWeek,
  setCalendarDates,
  setCommentConfig,
} = adaDashboardService.actions;

export default adaDashboardService.reducer;

export const getLandingPageTableColumns = async (
  start_week_id,
  end_week_id,
  aggregation_level,
  adaReducer
) => {
  const body = {
    start_week_id,
    end_week_id,
    aggregation_level,
    modules: [
      {
        module: "drivers_of_forecast",
        data_type: "float",
      },
      {
        module: "forecast_multiplier",
        data_type: "float",
      },
      ...(adaReducer?.clientConfig?.attribute_value?.mfp
        ? [
            {
              module: "mfp_choice_table",
              data_type: "float",
            },
          ]
        : []),
      {
        module: "detail_table_1",
        data_type: "float",
      },
      {
        module: "detail_table_2",
        data_type: "float",
      },
      {
        module: "detail_table_3",
        data_type: "float",
      },
    ],
    forecast_source: null,
    formatter: "",
    extra: {},
  };

  if (adaReducer?.clientConfig?.attribute_value?.aggLevelCount === 2) {
    body.modules.pop();
  }
  return axiosInstance({
    url: ADA_DASHBOARD_ALL_COLUMNS,
    method: "POST",
    data: body,
  });
};

// let payload = prepareChartDataPayload(selected);

// const response = await getChartData(payload);

export const getForecastAttributesData = async (payload) => {
  const response = await axiosInstance({
    url: ADA_FORECAST_ATTRIBUTES_DATA,
    method: "POST",
    data: payload,
  });

  return response?.data?.data;
};

export const getHistoricForecastAttributesData = async (payload) => {
  // always send mfp as false for historical apis
  payload.filters.mfp && (payload.filters.mfp = false);

  const response = await axiosInstance({
    url: ADA_HISTORIC_FORECAST_ATTRIBUTES_DATA,
    method: "POST",
    data: payload,
  });

  return response?.data?.data;
};

export const getActualsForecastAttributesData = async (payload) => {
  const response = await axiosInstance({
    url: ADA_ACTUALS_FORECAST_ATTRIBUTES_DATA,
    method: "POST",
    data: payload,
  });

  return response?.data?.data;
};

export const getDriverRankData = async (payload) => {
  const body = { filters: { ...payload.filters } };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  delete body.filters.graph;
  // delete body.filters.store_hierarchy.channel;
  return axiosInstance({
    url: ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_RANK_DATA,
    method: "POST",
    data: body,
  });
};

export const getDriverRankDataNew = async (payload) => {
  const body = { filters: { ...payload.filters } };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  delete body.filters.graph;
  // delete body.filters.store_hierarchy.channel;

  return axiosInstance({
    url: ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_RANK_DATA_NEW,
    method: "POST",
    data: body,
  });
};

export const getDriverChannelTableData = async (payload, channel) => {
  const body = { filters: { ...payload.filters } };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  delete body.filters.graph;
  body.filters.store_hierarchy.channel = [channel];
  return axiosInstance({
    url: ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_CHANNEL_DETAIL_TABLE_DATA,
    method: "POST",
    data: body,
  });
};

export const getDriverSigAggData = async (payload, channel) => {
  const body = { filters: { ...payload.filters } };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  delete body.filters.graph;
  if (channel.length > 0) body.filters.store_hierarchy.channel = channel;
  return axiosInstance({
    url: ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_AGG_LEVEL_DATA,
    method: "POST",
    data: body,
  });
};

export const getChartData = async (payload) => {
  const response = await axiosInstance({
    url: ADA_DASHBOARD_CHART_DATA,
    method: "POST",
    data: payload,
  });

  return response?.data?.data;
};

export const getProductData = async (payload) => {
  const response = await axiosInstance({
    url: ADA_DASHBOARD_PRODUCT_DATA,
    method: "POST",
    data: payload,
  });

  return response?.data?.data;
};

export const getAdaDashboardData = (postBody) => {
  return axiosInstance({
    url: ADA_DASHBOARD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

// product group || store group
export const fetchGroupData = async (endpoint) => {
  const payload = { filters: [], range: [], sort: [], search: [] };

  let queryStr = `page=${1}&page_size=10000`;

  const response = await axiosInstance({
    url: `/core/group${endpoint}?${queryStr}`,
    method: "POST",
    data: payload,
  });

  return response?.data?.data.map(({ name, sg_code }) => ({
    value: name,
    label: name,
    id: sg_code,
  }));
};

/**
 * Helper: Builds adjusted payload array from fiscal weeks
 * @param {Array} fiscalWeeks - Array of fiscal week IDs
 * @returns {Array} Adjusted payload array
 */
const buildAdjustedPayload = (fiscalWeeks) => {
  return fiscalWeeks?.map((fiscalWeek) => ({
    fiscal_timeperiod_id: fiscalWeek,
    promo_percentage: null,
    price_point: null,
    modified: [],
  }));
};

/**
 * Helper: Adds common forecast attributes to payload
 * @param {Object} payload - The payload to modify
 * @param {Array} adjustedPayload - The adjusted payload array
 * @param {Object} adaDashboardReducer - Redux state
 * @returns {Object} Modified payload
 */
const addCommonForecastAttributes = (
  payload,
  adjustedPayload,
  adaDashboardReducer
) => {
  payload.adjusted = adjustedPayload;
  payload.adjusted_price_point = [];
  payload.forecast_attributes = {
    IA: ["IA_PROMO", "ORG_IA"],
    ADJ: ["ADJ_PROMO", "ADJ_IA", "USR_IA"],
  };

  // Add MFP if enabled in client config
  if (adaDashboardReducer?.clientConfig?.attribute_value?.mfp) {
    payload.filters.mfp = true;
  }

  return payload;
};

/**
 * Helper: Builds base chart data payload
 * @param {Object} adaDashboardReducer - Redux state
 * @returns {Object} Base payload
 */
const buildBasePayload = (adaDashboardReducer) => {
  return chartDataPayload(
    adaDashboardReducer,
    null,
    null,
    null,
    null,
    adaDashboardReducer?.isEligible
  );
};

/**
 * Fetches forecast attributes data
 * @param {Object} adaDashboardReducer - Redux state
 * @returns {Promise<Object>} Forecast attributes data
 */
export const getForecastAttributes = async (adaDashboardReducer) => {
  // Build base payload
  const payload = buildBasePayload(adaDashboardReducer);
  console.log("🚀 ~ getForecastAttributes ~ payload:", payload);

  // Get predicted fiscal weeks
  const predictedFiscalWeeks = getPredictedFiscalWeeks(
    payload?.filters?.timeline?.start_week_id,
    payload?.filters?.timeline?.end_week_id,
    true,
    adaDashboardReducer,
    () => null
  );

  // Build adjusted payload from fiscal weeks
  const adjustedPayload = buildAdjustedPayload(predictedFiscalWeeks);

  // Add common forecast attributes
  addCommonForecastAttributes(payload, adjustedPayload, adaDashboardReducer);

  // Fetch forecast attributes data
  const response = await axiosInstance({
    url: ADA_FORECAST_ATTRIBUTES_DATA,
    method: "POST",
    data: payload,
  });

  // Transform and return data
  return visualizationPredictedDataTransformer(
    predictedFiscalWeeks,
    response?.data?.data,
    adaDashboardReducer,
    () => null
  );
};

/**
 * Helper: Gets current week start fiscal data
 * @param {Object} adaDashboardReducer - Redux state
 * @param {String} aggLevelSelected - Aggregation level (W/M/Q)
 * @returns {Object} Current week fiscal data
 */
const getCurrentWeekFiscalData = (adaDashboardReducer, aggLevelSelected) => {
  const currentDate = moment(moment.utc().startOf("day"));
  const weekStart = currentDate.clone().startOf("week");
  const epoch = moment(weekStart).valueOf();

  const predictedCurrentStartWeek = adaDashboardReducer?.fiscalCalendarDetails?.find(
    (elem) => elem["calendar_week_start_date"] === epoch
  );

  const fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

  return { predictedCurrentStartWeek, fiscalKey };
};

/**
 * Helper: Builds actuals range object from fiscal weeks
 * @param {Array} fiscalWeeks - Array of fiscal week IDs
 * @returns {Object} Actuals range object
 */
const buildActualsRange = (fiscalWeeks) => {
  const actualsRange = {};
  fiscalWeeks?.forEach((elem) => {
    actualsRange[elem] = {};
  });
  return actualsRange;
};

/**
 * Helper: Builds compare timeline for payload
 * @param {Array} historicalFiscalWeeks - Historical fiscal weeks
 * @param {Array} predictedFiscalWeeks - Predicted fiscal weeks
 * @param {Object} payload - The payload object
 * @returns {Array} Compare timeline array
 */
const buildCompareTimeline = (
  historicalFiscalWeeks,
  predictedFiscalWeeks,
  payload
) => {
  if (payload?.filters?.compare_timeline?.length) {
    // Update existing compare timeline
    return payload.filters.compare_timeline.map((elem) => ({
      ...elem,
      start_week_id: historicalFiscalWeeks[0] || predictedFiscalWeeks[0],
      end_week_id: predictedFiscalWeeks[predictedFiscalWeeks?.length - 1],
    }));
  } else {
    // Create new compare timeline with previous year
    const endWeekIdPrevYear =
      parseInt(
        predictedFiscalWeeks[predictedFiscalWeeks?.length - 1]
          ?.toString()
          ?.substring(0, 4)
      ) - 1;

    return [
      {
        start_week_id: historicalFiscalWeeks[0] || predictedFiscalWeeks[0],
        end_week_id: predictedFiscalWeeks[predictedFiscalWeeks?.length - 1],
        complete_year: false,
        year: endWeekIdPrevYear,
      },
    ];
  }
};

/**
 * Helper: Builds timeline object for actuals
 * @param {Array} historicalFiscalWeeks - Historical fiscal weeks
 * @param {Array} predictedFiscalWeeks - Predicted fiscal weeks
 * @returns {Object} Timeline object
 */
const buildActualsTimeline = (historicalFiscalWeeks, predictedFiscalWeeks) => {
  return {
    start_week_id: historicalFiscalWeeks?.[0] || predictedFiscalWeeks[0],
    end_week_id: predictedFiscalWeeks[predictedFiscalWeeks?.length - 1],
    future_start_week_id: predictedFiscalWeeks[0],
    future_end_week_id: predictedFiscalWeeks[predictedFiscalWeeks?.length - 1],
  };
};

/**
 * Fetches actuals quantity data
 * @param {Object} adaDashboardReducer - Redux state
 * @returns {Promise<Object>} Actuals quantity data
 */
export const getActualsQuantity = async (adaDashboardReducer) => {
  // Get aggregation level and base payload
  const aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
  const payload = cloneDeep(buildBasePayload(adaDashboardReducer));

  // Get current week fiscal data
  const { predictedCurrentStartWeek, fiscalKey } = getCurrentWeekFiscalData(
    adaDashboardReducer,
    aggLevelSelected
  );

  // Get historic dates based on selected historic value
  const historicDates = getHistoricFiscalWeeksFromPredictednWeekCount(
    predictedCurrentStartWeek?.[fiscalKey],
    adaDashboardReducer?.selectedHistoricValue?.[0]?.value,
    adaDashboardReducer
  );

  // Get predicted fiscal weeks from payload timeline
  const predictedFiscalWeeks = getFiscalWeeksFromFiscalDates(
    payload?.filters?.timeline?.start_week_id,
    payload?.filters?.timeline?.end_week_id,
    true,
    adaDashboardReducer,
    () => null,
    false
  );

  // Get fiscal month or quarters for predicted weeks
  const fiscalMonthOrQuartersPredicted = getFiscalMonthOrQuarterFromWeeks(
    predictedFiscalWeeks,
    adaDashboardReducer
  );

  // TODO: work on this - Historical fiscal weeks logic
  const historicalFiscalWeeks = [];

  // Merge historical and predicted fiscal weeks
  const mergedFiscalWeeks = [
    ...(historicalFiscalWeeks || []),
    ...predictedFiscalWeeks,
  ];

  // Build actuals range
  payload.actuals_range = buildActualsRange(mergedFiscalWeeks);

  // Build timeline for actuals
  payload.filters.timeline = buildActualsTimeline(
    historicalFiscalWeeks,
    predictedFiscalWeeks
  );

  // Build compare timeline
  payload.filters.compare_timeline = buildCompareTimeline(
    historicalFiscalWeeks,
    predictedFiscalWeeks,
    payload
  );

  // Build adjusted payload from predicted fiscal weeks
  const adjustedPayload = buildAdjustedPayload(predictedFiscalWeeks);

  // Add common forecast attributes
  addCommonForecastAttributes(payload, adjustedPayload, adaDashboardReducer);

  // Fetch actuals forecast attributes data
  const response = await axiosInstance({
    url: ADA_ACTUALS_FORECAST_ATTRIBUTES_DATA,
    method: "POST",
    data: payload,
  });

  // Transform and return actuals data for chart
  return transformActualsForChart(
    adaDashboardReducer,
    mergedFiscalWeeks,
    predictedFiscalWeeks,
    payload,
    response?.data?.data
  );
};

const transformActualsForChart = (
  adaDashboardReducer,
  mergedFiscalWeeks,
  predictedFiscalWeeks,
  payload,
  actualsForecastAttributes
) => {
  let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;

  let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

  const fiscalPeriodBasedOnAggLevel = getFiscalPeriodFromWeeks(
    mergedFiscalWeeks[0],
    mergedFiscalWeeks[mergedFiscalWeeks.length - 1],
    adaDashboardReducer
  );

  let updatedActualsData = actualsHandler(
    actualsForecastAttributes,
    fiscalPeriodBasedOnAggLevel,
    aggLevelSelected
  );

  // let actuals = updatedActualsData.actuals;
  // let actualsDiscount = updatedActualsData.actualsDiscount;
  let formattedActualsForGraph = updatedActualsData.formattedActualsForGraph;

  let pastYearActuals = [];
  let pastYears = [];
  let currYear = predictedFiscalWeeks[predictedFiscalWeeks?.length - 1];
  let currFormattedYear = String(currYear)?.slice(0, 4);

  let chartHistoricalData = [];

  payload?.filters?.compare_timeline?.forEach((elem) => {
    pastYears.push(elem.year);
  });

  let lastYearDiscountPercentage = [];

  pastYears.forEach((year, index) => {
    let historicYearMapping =
      actualsForecastAttributes.date_mapping[`fy_${year}`];
    let curryearHistoricData = {
      row: `FY ${year} Actuals`,
      forecast_multiplier: `FY ${year} Actuals`,
    };

    let currHistoricPercentage = {
      drivers: `FY ${year} Discount %`,
      row: `FY ${year} Discount %`,
    };

    let curryearHistoricDataForChart = [];

    if (
      !adaDashboardReducer?.isCompareWithDropdown &&
      currFormattedYear - 1 == year
    ) {
      curryearHistoricData.row = "Last year Actuals";
      currHistoricPercentage.row = "Last year Discount %";
      currHistoricPercentage.drivers = "Last year Discount %";
      curryearHistoricData.forecast_multiplier = "Last year Actuals";
    }
    if (
      !adaDashboardReducer?.isCompareWithDropdown &&
      currFormattedYear - 2 == year
    ) {
      curryearHistoricData.row = `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
      currHistoricPercentage.row = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
      currHistoricPercentage.drivers = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
      curryearHistoricData.forecast_multiplier = `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
    }

    let actualDataFiscalKeys = Object.keys(actualsForecastAttributes.data);

    let lastYearTotalPromoPercentageIA = 0;
    let lastYearAllProductSumIA = 0;
    let lastYearHasActualPredictions = false;

    actualDataFiscalKeys.forEach((fiscalWeek, i) => {
      // if (mergedFiscalWeeks?.includes(+fiscalWeek)) {
      let lastYearFiscalData =
        actualsForecastAttributes.data[fiscalWeek][historicYearMapping[i]];
      curryearHistoricData[fiscalWeek] = lastYearFiscalData?.["actual"];
      if (lastYearFiscalData) {
        lastYearHasActualPredictions = true;
      }
      if (lastYearFiscalData?.["avg_discount_pct_weighted"] !== null) {
        currHistoricPercentage[fiscalWeek] =
          lastYearFiscalData?.["avg_discount_pct_weighted"] * 100;
      }

      lastYearTotalPromoPercentageIA +=
        (lastYearFiscalData?.["product_count"] || 1) *
        lastYearFiscalData?.["avg_discount_pct_weighted"];

      lastYearAllProductSumIA += lastYearFiscalData?.["product_count"] || 1;

      curryearHistoricDataForChart.push({
        [fiscalKey]: historicYearMapping[i],
        actual: lastYearFiscalData?.["actual"],
        average_discount_percentage_weighted:
          lastYearFiscalData?.["avg_discount_pct_weighted"],
      });
      // }
    });

    if (lastYearHasActualPredictions) {
      currHistoricPercentage.overall_value =
        (lastYearTotalPromoPercentageIA / lastYearAllProductSumIA) * 100;
    }

    // pastYearActuals.push(curryearHistoricData);
    // lastYearDiscountPercentage.push(currHistoricPercentage);
    chartHistoricalData.push({ [year]: curryearHistoricDataForChart });
  });

  // splitHistoricPredictedFiscalMapping(
  //   historicalFiscalWeeks,
  //   fiscalMonthOrQuartersPredicted,
  //   actualsForecastAttributes?.date_mapping,
  //   dispatch,
  //   pastYears
  // );

  // dispatch(setActualsDiscount(actualsDiscount));
  // dispatch(setActuals(actuals));

  // dispatch(setHistoricActualsDiscount(lastYearDiscountPercentage));
  // dispatch(setHistoricalActualData(pastYearActuals));

  return visualizationActualsDataTransformer(
    formattedActualsForGraph,
    chartHistoricalData,
    () => null,
    true
  );
};

/**
 * Fetches combined forecast and actuals data
 * @param {Object} payload - The request payload
 * @returns {Promise<Object>} Combined forecast and actuals data
 */
export const getCombinedChartData = async (adaDashboardReducer) => {
  console.log(
    "🚀 ~ getCombinedChartData ~ adaDashboardReducer:",
    adaDashboardReducer
  );
  try {
    const [forecast, actuals] = await Promise.all([
      getForecastAttributes(adaDashboardReducer),
      getActualsQuantity(adaDashboardReducer),
    ]);
    console.log(actuals, "🚀 ~ getCombinedChartData ~ forecast:", forecast);

    return {
      ...forecast,
      ...actuals,
      // Add any additional processing or transformation here
    };
  } catch (error) {
    console.error("Error fetching combined chart data:", error);
    throw error;
  }
};

export const getCombinedChartHistoricData = async (
  adaDashboardReducer,
  historicWeekSelected,
  weekCounts,
  chartData,
  dispatch
) => {
  console.log(
    "🚀 ~ getCombinedChartData ~ adaDashboardReducer:",
    adaDashboardReducer
  );
  try {
    const [forecast, actuals] = await Promise.all([
      getHistoricChartPredictedData(
        adaDashboardReducer,
        historicWeekSelected,
        weekCounts,
        () => null
      ),
      getChartHistoricActuals(
        adaDashboardReducer,
        historicWeekSelected,
        weekCounts,
        chartData,
        () => null
      ),
    ]);
    console.log(actuals, "🚀 ~ getCombinedChartData ~ forecast:", forecast);

    return {
      ...forecast,
      ...actuals,
      // Add any additional processing or transformation here
    };
  } catch (error) {
    console.error("Error fetching combined chart data:", error);
    throw error;
  }
};

export const getHistoricChartPredictedData = (
  adaReducer,
  historicWeekSelected,
  weekCounts,
  dispatch
) => {
  // let defaultHistoricWeek =
  //   adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
  //     ?.defaultHistoricWeek;
  let columnPayload = {};
  let historicDates = getHistoricActualsFiscalWeeks(
    adaReducer,
    historicWeekSelected,
    weekCounts
  );

  columnPayload.start_week_id = historicDates?.[0];
  columnPayload.end_week_id = historicDates?.[1];

  const getHistoricForecastAttributes = async (isScenarioTab) => {
    try {
      // dispatch(setComponentLoaderCount(1));

      const payload = chartDataPayload(
        adaReducer,
        null,
        null,
        null,
        null,
        adaReducer?.isEligible
      );

      let adjustedPayload = [];

      let fiscalWeeks = getFiscalWeeksFromFiscalDates(
        columnPayload.start_week_id,
        columnPayload.end_week_id,
        false,
        adaReducer,
        dispatch,
        true
      );

      let predictedFiscalWeeks = getFiscalMonthOrQuarterFromWeeks(
        fiscalWeeks,
        adaReducer
      );

      predictedFiscalWeeks?.forEach((elem) => {
        adjustedPayload.push({
          fiscal_timeperiod_id: elem,
          promo_percentage: null,
          price_point: null,
          modified: [],
        });
      });
      payload.adjusted = adjustedPayload;
      payload.adjusted_price_point = [];
      payload.filters.snapshot = columnPayload.start_week_id;
      payload.filters.timeline = {
        start_week_id: columnPayload.start_week_id,
        end_week_id: columnPayload.end_week_id,
        future_start_week_id: predictedFiscalWeeks?.[0],
        future_end_week_id:
          predictedFiscalWeeks?.[predictedFiscalWeeks?.length - 1],
      };
      payload.forecast_attributes = {
        IA: ["IA_PROMO", "ORG_IA"],
        ADJ: ["ADJ_PROMO", "ADJ_IA", "USR_IA"],
      };
      const historicalForecastAttributes = await getHistoricForecastAttributesData(
        payload
      );

      return visualizationHistoricDataTransformer(
        predictedFiscalWeeks,
        historicalForecastAttributes,
        adaReducer,
        () => null
      );

      // dispatch(setHistoricForecastAttributes(historicalForecastAttributes));
    } catch (error) {
      console.log("🚀 ~ getHistoricForecastAttributes ~ error:", error);
    } finally {
      // dispatch(setComponentLoaderCount(-1));
    }
  };

  return getHistoricForecastAttributes();
  // }, 0);
};

const getChartHistoricActuals = (
  adaDashboardReducer,
  historicWeekSelected,
  weekCounts,
  chartData,
  dispatch,
  only_eligible
) => {
  try {
    // dispatch(setComponentLoaderCount(1));

    let columnPayload = {};
    let historicDates = getHistoricActualsFiscalWeeks(
      adaDashboardReducer,
      historicWeekSelected,
      weekCounts
    );
    columnPayload.start_week_id = historicDates?.[0];
    columnPayload.end_week_id = historicDates?.[1];

    let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;

    const payload = cloneDeep(
      chartDataPayload(
        adaDashboardReducer,
        null,
        null,
        null,
        null,
        only_eligible !== undefined
          ? only_eligible
          : adaDashboardReducer?.isEligible
      )
    );
    let historicalFiscalWeeks = getFiscalWeeks(
      historicDates?.[0],
      historicDates?.[1],
      false,
      adaDashboardReducer,
      dispatch,
      true
    );
    payload.actuals_range = {};
    historicalFiscalWeeks?.forEach((elem) => {
      payload.actuals_range[elem] = {};
    });

    let predictedFiscalWeeks = adaDashboardReducer?.predictedFiscalWeeks;

    let [
      predictedHistoricCompareWithMapping,
      past_years,
    ] = getPredictedHistoricCompareWithMapping(
      adaDashboardReducer,
      String(columnPayload.end_week_id)?.slice(0, 4),
      predictedFiscalWeeks[predictedFiscalWeeks?.length - 1]
    );

    payload.filters.timeline = {
      start_week_id: historicDates[0],
      end_week_id: historicDates?.[1],

      future_start_week_id: predictedFiscalWeeks?.[0],
      future_end_week_id:
        predictedFiscalWeeks?.[predictedFiscalWeeks?.length - 1],
    };

    let compareWithYear = null;
    let comparisonYear = adaDashboardReducer?.compareWithSelectedDate?.[0]?.id;
    let lastYear = handleCompareBtnClick(
      adaDashboardReducer?.fiscalDates?.end_fw,
      1
    );
    let lastToLastYear = handleCompareBtnClick(
      adaDashboardReducer?.fiscalDates?.end_fw,
      2
    );
    if (
      !adaDashboardReducer?.isCompareWithDropdown &&
      comparisonYear === lastYear?.value
    ) {
      compareWithYear = String(historicDates?.[1])?.slice(0, 4) - 1;
    }
    if (
      !adaDashboardReducer?.isCompareWithDropdown &&
      comparisonYear === lastToLastYear?.value
    ) {
      compareWithYear = String(historicDates?.[1])?.slice(0, 4) - 2;
    }

    let predictedCompareWithYears = cloneDeep(payload.filters.compare_timeline);

    let historicEndDateYear = String(historicDates?.[1])?.slice(0, 4);
    let isHistoricEndWeekAndPredictedEndWeekIdInSameYear = false;

    payload?.filters?.compare_timeline?.forEach((elem, i) => {
      if (elem.year == historicEndDateYear) {
        isHistoricEndWeekAndPredictedEndWeekIdInSameYear = true;
      }
    });

    let pastYears = [];

    payload?.filters?.compare_timeline?.forEach((elem, i) => {
      elem.start_week_id = historicDates[0];
      elem.end_week_id = historicDates?.[1];
      elem.year =
        compareWithYear ||
        (isHistoricEndWeekAndPredictedEndWeekIdInSameYear
          ? elem.year - 1
          : elem.year);

      pastYears.push(elem.year);
    });

    const getActuals = async () => {
      const actualsForecastAttributes = await getActualsForecastAttributesData(
        payload
      );

      let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

      let updatedActualsData = actualsHandler(
        actualsForecastAttributes,
        historicalFiscalWeeks,
        aggLevelSelected
      );

      let actuals = updatedActualsData.actuals;
      let actualsDiscount = updatedActualsData.actualsDiscount;
      let formattedActualsForGraph =
        updatedActualsData.formattedActualsForGraph;

      let pastYearActuals = [];
      // let pastYears = [];
      // let currYear = predictedFiscalWeeks[predictedFiscalWeeks?.length - 1];
      let currFormattedYear = String(historicDates?.[1] - 1)?.slice(0, 4);

      let chartHistoricalData = [];

      // payload?.filters?.compare_timeline?.forEach((elem) => {
      //   pastYears.push(elem.year);
      // });

      let allHistorical_actuals_data = cloneDeep(
        chartData.historical_actuals_data
      );

      // let oldHistoricDataForMultiplier = cloneDeep(
      //   adaForecastMultiplierReducer?.historicalActual
      // );

      // let oldHistoricDiscountPercentage = cloneDeep(
      //   adaForecastMultiplierReducer?.historicactualsDiscount
      // );

      let lastYearDiscountPercentage = [];

      const historicMapping = {
        fiscal_ids: actualsForecastAttributes?.date_mapping?.fiscal_ids,
      };

      pastYears.forEach((year, index) => {
        let historicYearMapping =
          actualsForecastAttributes.date_mapping[`fy_${year}`];

        let invertedPredictedHistoricCompareWithMapping = invert(
          cloneDeep(predictedHistoricCompareWithMapping)
        );

        let pastMappingYear = isHistoricEndWeekAndPredictedEndWeekIdInSameYear
          ? invertedPredictedHistoricCompareWithMapping[year]
          : year;

        let curryearHistoricData = {
          row: `FY ${pastMappingYear} Actuals`,
          forecast_multiplier: `FY ${pastMappingYear} Actuals`,
        };

        let currHistoricPercentage = {
          drivers: `FY ${pastMappingYear} Discount %`,
          row: `FY ${pastMappingYear} Discount %`,
        };

        let curryearHistoricDataForChart = [];
        if (
          !adaDashboardReducer?.isCompareWithDropdown &&
          currFormattedYear - 1 == year
        ) {
          curryearHistoricData.row = "Last year Actuals";
          currHistoricPercentage.row = "Last year Discount %";
          currHistoricPercentage.drivers = "Last year Discount %";
          curryearHistoricData.forecast_multiplier = "Last year Actuals";
        }
        if (
          !adaDashboardReducer?.isCompareWithDropdown &&
          currFormattedYear - 2 == year
        ) {
          curryearHistoricData.row = `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
          currHistoricPercentage.drivers = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
          currHistoricPercentage.row = `${getHistoricYearLabel(adaDashboardReducer)} Discount %`;
          curryearHistoricData.forecast_multiplier =
            `${getHistoricYearLabel(adaDashboardReducer)} Actuals`;
        }

        let lastYearTotalPromoPercentageIA = 0;
        let lastYearAllProductSumIA = 0;
        let lastYearHasActualPredictions = false;

        historicalFiscalWeeks.forEach((fiscalWeek, i) => {
          let lastYearFiscalData =
            actualsForecastAttributes.data[fiscalWeek][historicYearMapping[i]];
          curryearHistoricData[fiscalWeek] = lastYearFiscalData?.["actual"];

          if (lastYearFiscalData) {
            lastYearHasActualPredictions = true;
          }
          if (lastYearFiscalData?.["avg_discount_pct_weighted"] !== null) {
            currHistoricPercentage[fiscalWeek] =
              lastYearFiscalData?.["avg_discount_pct_weighted"] * 100;
          }

          lastYearTotalPromoPercentageIA +=
            (lastYearFiscalData?.["product_count"] || 1) *
            lastYearFiscalData?.["avg_discount_pct_weighted"];

          lastYearAllProductSumIA += lastYearFiscalData?.["product_count"] || 1;

          curryearHistoricDataForChart.push({
            [fiscalKey]: historicYearMapping[i],
            actual: lastYearFiscalData?.["actual"],
            average_discount_percentage_weighted:
              lastYearFiscalData?.["avg_discount_pct_weighted"],
          });
        });

        if (lastYearHasActualPredictions) {
          currHistoricPercentage.overall_value =
            (lastYearTotalPromoPercentageIA / lastYearAllProductSumIA) * 100;
        }

        let filteredOldHistorical_actuals_data = {};

        const yearKey = `fy_${year}`;
        const pastMappingYearKey = `fy_${pastMappingYear}`;
        const yearMapping = actualsForecastAttributes?.date_mapping?.[yearKey];

        if (yearMapping) {
          historicMapping[pastMappingYearKey] = yearMapping;
        }

        allHistorical_actuals_data?.forEach((elem) => {
          const keys = Object.keys(elem);

          for (let key of keys) {
            if (key == pastMappingYear) {
              let data = elem[key];

              let predictedHistoricFiscalWeeks =
                cloneDeep(
                  adaDashboardReducer?.xAxisStaticDates?.[
                    `fy_${pastMappingYear}`
                  ]
                ) || [];

              let currFilteredOldHistorical_actuals_data = data?.filter(
                (elem) => {
                  return predictedHistoricFiscalWeeks?.includes(
                    elem?.[fiscalKey]
                  );
                }
              );

              filteredOldHistorical_actuals_data[
                year
              ] = currFilteredOldHistorical_actuals_data;
            }
            // }
          }
        });

        // let currOldActuals = oldHistoricDataForMultiplier?.find(
        //   (elem) => elem?.row === curryearHistoricData?.row
        // );

        // let currLastYearDiscountPercentage =
        //   oldHistoricDiscountPercentage?.find(
        //     (elem) => elem?.row === currHistoricPercentage?.row
        //   ) || {};

        lastYearDiscountPercentage.push({
          // ...currLastYearDiscountPercentage,
          ...currHistoricPercentage,
        });

        pastYearActuals.push({
          // ...currOldActuals,
          ...curryearHistoricData,
        });

        let filteredOldHistoricalActualsDatForChart =
          filteredOldHistorical_actuals_data?.[year] || [];
        chartHistoricalData.push({
          [pastMappingYear]: [
            ...curryearHistoricDataForChart,
            ...filteredOldHistoricalActualsDatForChart,
          ],
        });
      });

      // dispatch(setXaisStaticHistoricDates(historicMapping));
      // dispatch(setActualsDiscount(actualsDiscount));
      // dispatch(setHistoricActualsDiscount(lastYearDiscountPercentage));
      // dispatch(setActuals(actuals));

      // dispatch(setHistoricalActualData(pastYearActuals));

      // let pastWeeksActualsData = cloneDeep(
      //   adaForecastMultiplierReducer?.historicAllChartData.actuals_data
      // );

      let mergedActuals = [
        ...formattedActualsForGraph,
        // ...pastWeeksActualsData,
      ];
      console.log(
        chartHistoricalData,
        "🚀 ~ getActuals ~ formattedActualsForGraph:",
        formattedActualsForGraph
      );

      return visualizationActualsDataTransformer(
        mergedActuals,
        chartHistoricalData,
        () => null
      );
    };

    return getActuals();
  } catch (error) {
    console.log("🚀 ~ error: historical Actuals", error);
  } finally {
    // dispatch(setComponentLoaderCount(-1));
  }
};

export const getFiscalMonth = async (payload) => {
  if (!payload || !Object.keys(payload)?.length) return [];
  const options = await axiosInstance.post(
    ADA_DASHBOARD_GET_FISCAL_WEEKS_MONTH,
    {
      ...payload,
      key: "month",
    }
  );

  return configureMonthAttributeOptions(options.data.data);
};

export const fetchFiscalWeeks = async (startDate, endDate) => {
  return axiosInstance({
    url: `${ADA_DASHBOARD_FISCAL_WEEKS}?start_date=${startDate}&end_date=${endDate}`,
    method: "GET",
  });
};

export const fetchHistoricDataWeeks = async (postBody) => {
  return axiosInstance({
    url: ADA_DASHBOARD_HISTORICAL_WEEKS,
    method: "POST",
    data: postBody,
  });
};

export const formattedTenantFilterConfig = (
  tenantFilters = {},
  aggLevelCount = 3
) => {
  let clonedTenantFilters = cloneDeep(tenantFilters);
  let keys = ["l0", "l1", "l2"];

  if (aggLevelCount === 2) {
    keys.pop();
  }
  if (aggLevelCount === 4) {
    keys.push("l3");
  }
  const filtersInTenantOrder = [];

  keys?.forEach((key) => {
    filtersInTenantOrder.push({
      ...clonedTenantFilters?.[key],
      is_clearable: true,
    });
  });

  return filtersInTenantOrder;
};

export const fetchCoreFilterConfiguration = async () => {
  const response = await getAllFilters("ada-visual-chart")();
  return response?.data?.data || [];
};

export const formattedCoreFilterConfig = (coreFilters = []) => {
  const clonedFilters = cloneDeep(coreFilters);
  const { productFilters, storeFilters } = clonedFilters.reduce(
    (acc, filter) => {
      if (filter.dimension === "product") acc.productFilters.push(filter);
      if (filter.dimension === "store") acc.storeFilters.push(filter);
      return acc;
    },
    { productFilters: [], storeFilters: [] }
  );

  return [...productFilters, ...storeFilters].map((filter) => ({
    ...filter,
    label: filter.display_name || filter.label,
    is_clearable: true,
  }));
};

export const fetchTenantFilters = async (startDate, endDate) => {
  return axiosInstance({
    url: `${ADA_DASHBOARD_TENANT_FILTERS}`,
    method: "GET",
  });
};

export const fetchCompareFiscalWeeks = async (postBody) => {
  return axiosInstance({
    url: ADA_DASHBOARD_COMPARE_FISCAL_WEEKS,
    method: "POST",
    data: postBody,
  });
};

export const fetchChannels = async () => {
  const body = {
    attribute_name: "channel",
    filter_type: "non-cascaded",
    filters: [],
  };
  const options = await getFiltersValues("store", body);
  return configureAttributeOptions(options.data.data.attribute);
};

export const getCoreFiscalCalendar = async () => {
  return axiosInstance.get(GET_FISCAL_CALENDAR);
};

export const getClientConfig = async () => {
  const currentApp = sessionStorage.getItem("currentApp");
  //Selecting client config based on current app
  if (currentApp === "forecastconfigurator")
    return axiosInstance.get(FORECASTSMART_ADA_CLIENT_CONFIG);
  return axiosInstance.get(ADA_CLIENT_CONFIG);
};

export const getDBUpdateStatus = async () => {
  return axiosInstance.get(ADA_DB_UPDATED_STATUS);
};

export const getUserConfig = async () => {
  return axiosInstance.get(ADA_USER_CONFIG);
};

// export const getFiscalWeeks = async (payload) => {
//   if (!payload || !Object.keys(payload)?.length) return [];
//   const options = await axiosInstance.post(
//     ADA_DASHBOARD_GET_FISCAL_WEEKS_MONTH,
//     {
//       ...payload,
//       key: "week",
//     }
//   );

//   return configureWeekAttributeOptions(options.data.data);
// };

export const getPromoTypeColumns = async ({ payload, extra }) => {
  const body = {
    start_week_id: payload.start_week_id,
    end_week_id: payload.end_week_id,
    module: "drivers_of_forecast",
    data_type: "list",
    forecast_source: null,
    formatter: "",
    aggregation_level: payload.aggregation_level,
    extra,
  };
  return axiosInstance({
    url: ADA_DASHBOARD_COLUMNS,
    method: "POST",
    data: body,
  });
};

export const getDriverForecastColumns = async ({
  payload,
  showIAData,
  extra,
}) => {
  const body = {
    start_week_id: payload.start_week_id,
    end_week_id: payload.end_week_id,
    formatter: payload.formatter,
    module: "drivers_of_forecast",
    data_type: "float",
    forecast_source: null,
    aggregation_level: payload.aggregation_level,
    extra,
  };
  return axiosInstance({
    url: ADA_DASHBOARD_COLUMNS,
    method: "POST",
    data: body,
  });
};

export const getDriverForecastData = async (payload) => {
  const body = { filters: { ...payload.filters } };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  body.isForecastSmart = payload.isForecastSmart;
  delete body.filters.graph;

  return axiosInstance({
    url: ADA_DASHBOARD_GET_DRIVER_FORECAST_DATA,
    method: "POST",
    data: body,
  });
};

export const getDriverSignificancetData = async (payload) => {
  const body = { filters: { ...payload.filters } };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  delete body.filters.graph;

  return axiosInstance({
    url: ADA_DASHBOARD_GET_DRIVER_SIGNIFICANCE_DATA,
    method: "POST",
    data: body,
  });
};

export const getForecastColumns = async (payload, extra) => {
  const body = {
    start_week_id: payload.start_week_id,
    end_week_id: payload.end_week_id,
    module: "forecast_multiplier",
    data_type: "float",
    forecast_source: "",
    aggregation_level: payload.aggregation_level,
    formatter: payload.formatter,

    extra,
  };
  return axiosInstance({
    url: ADA_DASHBOARD_COLUMNS,
    method: "POST",
    data: body,
  });
};

export const getStatusCheckForUserLevelUpdate = async (payload) => {
  const body = { filters: { ...payload.filters } };

  delete body.filters.graph;

  return axiosInstance({
    url: get_status_check_for_user_level_update,
    method: "POST",
    data: body,
  });
};

export const getForecastData = async (payload) => {
  const body = { filters: { ...payload.filters } };

  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;

  delete body.filters.graph;

  return axiosInstance({
    url: ADA_DASHBOARD_GET_FORECAST_MULTIPLIER_DATA,
    method: "POST",
    data: body,
  });
};

const handleFloatColumnWithSubHeader = (
  column,
  payload,
  allowEdit,
  showIAData,
  selectedCompareWith,
  adaReducer,
  isL0SiblingsUnLockedForEmptyForecast,
  compareWithEditable = false // for historic column, it should be true
) => {
  const isCompareWithInEditHierarchyEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_compare_with_in_edit_hierarchy_enabled;

  const editHierarchyForecastTableRoundOff =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;

  // const isCompareWithInEditHierarchyEnabled = true;

  if (
    column.type === "float" &&
    (!isCompareWithInEditHierarchyEnabled || showIAData)
  ) {
    column.column_name =
      column.column_name + "." + (showIAData ? "IA" : "adjusted");
    column.formatter = payload?.formatter;
  }

  if (
    column.type === "float" &&
    isCompareWithInEditHierarchyEnabled &&
    !showIAData
  ) {
    let subHeaders = [];
    let adjustedColumn = cloneDeep(column);
    let compareWithColumn = cloneDeep(column);

    adjustedColumn.column_name += ".adjusted";
    adjustedColumn.formatter = payload?.formatter;
    adjustedColumn.label = "User Forecast";

    if (isL0SiblingsUnLockedForEmptyForecast) {
      adjustedColumn.extra.showNullAsEmpty = true;
    }

    if (compareWithEditable) {
      adjustedColumn.is_editable = true;
    } else {
      adjustedColumn.is_editable = allowEdit;
    }
    adjustedColumn.is_lockable = allowEdit;

    adjustedColumn.extra = {
      ...adjustedColumn.extra,
      roundOffTo: editHierarchyForecastTableRoundOff,
      ignoreValueGetter: true,
      showNullAsEmpty: true,
    };

    // adjustedColumn.column_name += `.${selectedCompareWith.value}`;
    compareWithColumn.column_name += `.${selectedCompareWith?.value}`;
    compareWithColumn.formatter = payload?.formatter;
    compareWithColumn.label = selectedCompareWith?.label;
    compareWithColumn.is_editable = true;
    compareWithColumn.disabled = true;

    compareWithColumn.is_lockable = false;

    compareWithColumn.extra = {
      ...compareWithColumn.extra,
      roundOffTo: editHierarchyForecastTableRoundOff,
      ignoreValueGetter: true,
      showNullAsEmpty: true,
    };

    subHeaders = [adjustedColumn, compareWithColumn];
    column.sub_headers = subHeaders;
  }

  return column;
};

export const fetchEditHierarchyColumnData = async (
  {
    payload,
    editHierarchyActionMap,
    allowEdit,
    showIAData,
    timeline,
    extra,
    isCalledFromMFPDashboard,
    allowL0Edit,
  },
  l0_data_type,
  adaReducer,
  isL0SiblingsUnLockedForEmptyForecast,
  id,
  selectedCompareWith
) => {
  var table_name;
  if (isCalledFromMFPDashboard) {
    table_name = "detail_table_mfp";
  } else {
    table_name = "detail_table_1";
  }
  const body = getBody(payload, table_name, "float", showIAData, extra);

  // const { data } = await axiosInstance({
  //   url: ADA_DASHBOARD_COLUMNS,
  //   method: "POST",
  //   data: body,
  // });

  let data = cloneDeep(adaReducer?.tableColumns?.detail_table_1 || []);
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  const isWeekEndDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled && timeline === "W";

  const isWeekStartDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_start_date_label_enabled;

  let showWeekStartDateLabelEnabled =
    isWeekStartDateLabelEnabled && timeline === "W";

  data?.forEach((column, index) => {
    column.is_sortable = true;
    column.is_searchable = true; // first column is link, so, it will always be editable
    column.extra = {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    };
    column.extra.data_type = l0_data_type || "str";

    column = handleFloatColumnWithSubHeader(
      column,
      payload,
      allowEdit,
      showIAData,
      selectedCompareWith,
      adaReducer,
      isL0SiblingsUnLockedForEmptyForecast
    );

    if (l0_data_type === "int") {
      column.extra.disableCommaFormatting = true;
    }
    if (isL0SiblingsUnLockedForEmptyForecast) {
      column.extra.showNullAsEmpty = true;
    }
    if (!Number(column.label)) {
      column.is_frozen = true;
      if (column.type === "str") {
        column.is_editable = false;
      }
    }
    if (index !== 0 && column.type !== "str") {
      column.is_editable = allowEdit;
      // TBD move this logic to client config
      const clientName = localStorage.getItem("CLIENT_NAME");
      if (!allowL0Edit) {
        column.is_editable = false;
      }

      // Revert this after, Lock cell Edge case fixed
      column.is_lockable = allowEdit;
      // column.is_lockable = false;

      //Enable Comma Seperated Formats for IA Tab
      const enableCommaFormatting =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.numberFormatting?.enableCommaFormatting === true;
      if (id === "IA" && enableCommaFormatting) {
        column.is_editable = true;
        column.disabled = true;
      }

      if (isNumber(column.label)) {
        // column.label = showWeekEndDateLabelEnabled
        //   ? weekEndDateLabel(column.label, adaReducer)
        //   : `F${timeline}-${column.label}`;
        column.label = columnLabelHandler(
          column.label,
          adaReducer,
          showWeekEndDateLabelEnabled,
          [],
          false,
          showWeekStartDateLabelEnabled
        );
      }
    }
  });

  const formattedResponse = agGridColumnFormatter(
    data,
    null,
    editHierarchyActionMap(data?.[0]?.column_name)
  );

  return formattedResponse;
};

export const fetchHistoricEditHierarchyColumnData = async (
  { payload, showIAData, timeline, extra, predictedFutureFiscalWeeks },
  adaReducer,
  selectedCompareWith
) => {
  const body = getBody(payload, "detail_table_1", "float", showIAData, extra);

  // const { data } = await axiosInstance({
  //   url: ADA_DASHBOARD_COLUMNS,
  //   method: "POST",
  //   data: body,
  // });

  let data = cloneDeep(adaReducer?.historicTableColumns?.detail_table_1 || []);

  getUpdatedColumnData(
    data,
    timeline,
    predictedFutureFiscalWeeks,
    adaReducer,
    payload,
    showIAData,
    selectedCompareWith,
    true
  );

  const formattedResponse = agGridColumnFormatter(data);

  return formattedResponse;
};

export const urlAndPayloadHandlerEditHierarchy = (
  adaReducer,
  body,
  selectedCompareWith,
  payload
) => {
  const isCompareWithInEditHierarchyEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_compare_with_in_edit_hierarchy_enabled;

  // const isCompareWithInEditHierarchyEnabled = true;

  let url = ADA_DASHBOARD_AGGREGATION_LEVEL_DATA;
  if (isCompareWithInEditHierarchyEnabled) {
    url = ADA_DASHBOARD_AGGREGATION_LEVEL_DATA_WITH_COMPARE;
    body.filters.additional_baseline_metric = selectedCompareWith?.id;
    // if (selectedCompareWith?.id === "Year") {
    body.filters.additional_baseline_metric_year = {
      year:
        parseInt(
          payload?.filters?.timeline?.end_week_id.toString().substring(0, 4)
        ) - 1,
      start_week_id: payload?.filters?.timeline?.start_week_id,
      end_week_id: payload?.filters?.timeline?.end_week_id,
      complete_year: false,
    };
    // }
  }

  return url;
};

export const fetchEditHierarchyData = async (
  payload,
  adaReducer,
  selectedCompareWith
) => {
  try {
    const body = { filters: { ...payload.filters } };
    delete body.filters.graph;

    // setting agg_level as l0 irrespective of mfp flag

    // if (body.filters.mfp) {
    //   body.filters.agg_level = "mfp";
    // } else {
    body.filters.agg_level = "l0";
    // }
    body.filters.only_eligible = !!adaReducer?.isEligible;

    body.filters.agg_hierarchy = {};
    body.adjusted = payload.adjusted;
    body.adjusted_price_point = payload.adjusted_price_point;

    let { data } = await axiosInstance({
      url: urlAndPayloadHandlerEditHierarchy(
        adaReducer,
        body,
        selectedCompareWith,
        payload
      ),
      method: "POST",
      data: body,
    });
    let predictedFiscalWeeks = handleHistoricTimePeriod(adaReducer);

    let predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);
    let updatedData = data?.data;

    let useAdjustedUserForecastBase =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.use_adjusted_user_forecast_base;

    if (useAdjustedUserForecastBase) {
      updatedData = addAdjustedInitialKey(updatedData);
    }

    predictedFiscalWeeks?.forEach((fiscalWeek, i) => {
      if (predictedFutureFiscalWeeks?.includes(fiscalWeek)) {
        //Since, historic and predicted both have common week, hence updating historic key by appending H to it
        // predictedFiscalWeeks[i] = `${fiscalWeek}H`;

        //Since, historic and predicted both have common week, hence updating response fiscal week by replacing it with new key
        if (body.filters.snapshot) {
          updatedData = updateKeyInPlace(
            data?.data,
            fiscalWeek,
            `${fiscalWeek}H`
          );
        }
      }
    });

    // const data = editHierarchyRowdata;

    if (updatedData?.length > 0) {
      let formattedData = agGridRowFormatter(updatedData, null, "row");

      let updatedFormattedResponse = formattedData.map((el) => ({
        ...el,
        isEdited: false,
      }));

      return updatedFormattedResponse;
    }
    return [];
  } catch (error) {
    console.log(
      "useHistoricData.js ~ line 184 ~ fetchEditHierarchyData",
      error
    );
  }
};

export const fetchEditHierarchyChildColumnData = async (
  { payload, allowEdit, showIAData, timeline, aggLevelCount, extra },
  l1_data_type,
  adaReducer,
  isL0SiblingsUnLockedForEmptyForecast,
  id,
  selectedCompareWith
) => {
  const body = getBody(payload, "detail_table_2", "float", showIAData, extra);

  // const { data } = await axiosInstance({
  //   url: ADA_DASHBOARD_COLUMNS,
  //   method: "POST",
  //   data: body,
  // });

  let data = cloneDeep(adaReducer?.tableColumns?.detail_table_2 || []);
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;

  const isWeekEndDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled && timeline === "W";

  const isWeekStartDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_start_date_label_enabled;

  let showWeekStartDateLabelEnabled =
    isWeekStartDateLabelEnabled && timeline === "W";

  data?.forEach((column, index) => {
    column.is_sortable = true;
    column.is_searchable = true;
    column.extra = {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    };
    if (index === 0) {
      column.is_frozen = true;
      column.is_editable = false;
      column.type = l1_data_type || "str";
    }
    column = handleFloatColumnWithSubHeader(
      column,
      payload,
      allowEdit,
      showIAData,
      selectedCompareWith,
      adaReducer,
      isL0SiblingsUnLockedForEmptyForecast
    );

    if (l1_data_type === "int") {
      column.extra.disableCommaFormatting = true;
    }

    if (index !== 0 && column.type !== "str") {
      column.is_editable = allowEdit;
      // Revert this after, Lock cell Edge case fixed
      column.is_lockable = allowEdit;
      // column.is_lockable = false;

      //Enable Comma Seperated Formats for IA Tab
      const enableCommaFormatting =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.numberFormatting?.enableCommaFormatting === true;
      if (id === "IA" && enableCommaFormatting) {
        column.is_editable = true;
        column.disabled = true;
      }

      if (isNumber(column.label)) {
        // column.label = showWeekEndDateLabelEnabled
        //   ? weekEndDateLabel(column.label, adaReducer)
        //   : `F${timeline}-${column.label}`;

        column.label = columnLabelHandler(
          column.label,
          adaReducer,
          showWeekEndDateLabelEnabled,
          [],
          false,
          showWeekStartDateLabelEnabled
        );
      }
    }

    if (isL0SiblingsUnLockedForEmptyForecast) {
      column.extra.showNullAsEmpty = true;
    }
  });

  const formattedResponse = agGridColumnFormatter(data);

  // first column will always contain the level 1 details
  // hence, applying the grouping on that
  const updatedData = formattedResponse.map((column, i) => ({
    ...column,
    cellRenderer:
      i === 0 && aggLevelCount > 2
        ? "agGroupCellRenderer"
        : column.cellRenderer,
  }));
  return updatedData;
};

export const fetchHistoricEditHierarchyChildColumnData = async (
  { payload, showIAData, timeline, extra, predictedFutureFiscalWeeks },
  adaReducer,
  selectedCompareWith
) => {
  const body = getBody(payload, "detail_table_2", "float", showIAData, extra);

  // const { data } = await axiosInstance({
  //   url: ADA_DASHBOARD_COLUMNS,
  //   method: "POST",
  //   data: body,
  // });
  let data = cloneDeep(adaReducer?.historicTableColumns?.detail_table_2 || []);

  const updatedColumnData = getUpdatedColumnData(
    data,
    timeline,
    predictedFutureFiscalWeeks,
    adaReducer,
    payload,
    showIAData,
    selectedCompareWith,
    true
  );
  const formattedResponse = agGridColumnFormatter(data);

  return formattedResponse;
};

export const fetchEditChildHierarchyData = async (
  payload,
  selected,
  adaReducer,
  selectedCompareWith
) => {
  const body = { filters: { ...payload.filters } };
  delete body.filters.graph;
  body.filters.agg_level = "l1";
  body.filters.only_eligible = !!adaReducer?.isEligible;
  body.filters.agg_hierarchy = body.filters.mfp
    ? { mfp: selected }
    : { l0: selected };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;

  const { data } = await axiosInstance({
    url: urlAndPayloadHandlerEditHierarchy(
      adaReducer,
      body,
      selectedCompareWith,
      payload
    ),
    method: "POST",
    data: body,
  });

  let predictedFiscalWeeks = handleHistoricTimePeriod(adaReducer);

  let predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);
  let updatedData = data?.data;

  let useAdjustedUserForecastBase =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.use_adjusted_user_forecast_base;

  if (useAdjustedUserForecastBase) {
    updatedData = addAdjustedInitialKey(updatedData);
  }

  predictedFiscalWeeks?.forEach((fiscalWeek, i) => {
    if (predictedFutureFiscalWeeks?.includes(fiscalWeek)) {
      //Since, historic and predicted both have common week, hence updating historic key by appending H to it
      // predictedFiscalWeeks[i] = `${fiscalWeek}H`;

      //Since, historic and predicted both have common week, hence updating response fiscal week by replacing it with new key
      if (body.filters.snapshot) {
        updatedData = updateKeyInPlace(
          data?.data,
          fiscalWeek,
          `${fiscalWeek}H`
        );
      }
    }
  });

  if (updatedData?.length > 0) {
    let formattedData = agGridRowFormatter(updatedData, null, "row");

    let updatedFormattedResponse = formattedData.map((el) => ({
      ...el,
      isEdited: false,
    }));

    updatedFormattedResponse.forEach((elem) => {
      for (let key in elem) {
        if (isNumber(key) || adaReducer?.predictedFiscalWeeks?.includes(key)) {
          elem[key] = {
            ...elem[key],
            IA: elem[key].IA || 0,
            adjusted:
              elem[key].adjusted === null || elem[key].adjusted === undefined
                ? null
                : elem[key].adjusted,
          };
        }
      }
    });

    return updatedFormattedResponse;
  }
  return [];
};

export const fetchEditHierarchyGrandChildColumnData = async (
  { payload, allowEdit, showIAData, timeline, extra },
  l2_data_type,
  adaReducer,
  isL0SiblingsUnLockedForEmptyForecast,
  id,
  selectedCompareWith
) => {
  const body = getBody(payload, "detail_table_3", "float", showIAData, extra);

  // const { data } = await axiosInstance({
  //   url: ADA_DASHBOARD_COLUMNS,
  //   method: "POST",
  //   data: body,
  // });
  let data = cloneDeep(adaReducer?.tableColumns?.detail_table_3 || []);
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;

  const isWeekEndDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled && timeline === "W";

  const isWeekStartDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_start_date_label_enabled;

  let showWeekStartDateLabelEnabled =
    isWeekStartDateLabelEnabled && timeline === "W";

  data?.forEach((column, index) => {
    column.is_sortable = true;
    column.is_searchable = true;
    column.extra = {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    };
    if (index === 0) {
      column.is_frozen = true;
      column.type = l2_data_type || "str";
      if (l2_data_type === "int") {
        column.extra.disableCommaFormatting = true;
      }
      column.is_editable = false;
      // if (column.type === "str") {
      //   column.is_editable = false;
      // }
    }
    if (index !== 0 && column.type !== "str") {
      column.is_editable = allowEdit;
      // Revert this after, Lock cell Edge case fixed
      column.is_lockable = allowEdit;
      // column.is_lockable = false;

      //Enable Comma Seperated Formats for IA Tab
      const enableCommaFormatting =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.numberFormatting?.enableCommaFormatting === true;
      if (id === "IA" && enableCommaFormatting) {
        column.is_editable = true;
        column.disabled = true;
      }

      if (isNumber(column.label)) {
        // column.label = showWeekEndDateLabelEnabled
        //   ? weekEndDateLabel(column.label, adaReducer)
        //   : `F${timeline}-${column.label}`;

        column.label = columnLabelHandler(
          column.label,
          adaReducer,
          showWeekEndDateLabelEnabled,
          [],
          false,
          showWeekStartDateLabelEnabled
        );
      }
    }
    column = handleFloatColumnWithSubHeader(
      column,
      payload,
      allowEdit,
      showIAData,
      selectedCompareWith,
      adaReducer,
      isL0SiblingsUnLockedForEmptyForecast
    );

    if (isL0SiblingsUnLockedForEmptyForecast) {
      column.extra.showNullAsEmpty = true;
    }
  });

  const formattedResponse = agGridColumnFormatter(data);

  return formattedResponse;
};

export const fetchHistoricalEditHierarchyGrandChildColumnData = async (
  { payload, showIAData, timeline, extra, predictedFutureFiscalWeeks },
  adaReducer,
  selectedCompareWith
) => {
  const body = getBody(payload, "detail_table_3", "float", null, extra);
  // const { data } = await axiosInstance({
  //   url: ADA_DASHBOARD_COLUMNS,
  //   method: "POST",
  //   data: body,
  // });

  let data = cloneDeep(adaReducer?.historicTableColumns?.detail_table_3 || []);

  const updatedColumnData = getUpdatedColumnData(
    data,
    timeline,
    predictedFutureFiscalWeeks,
    adaReducer,
    payload,
    showIAData,
    selectedCompareWith,
    true
  );

  const formattedResponse = agGridColumnFormatter(data);

  return formattedResponse;
};

export const fetchEditGrandChildHierarchyData = async (
  payload,
  l0Name,
  l1Name,
  adaReducer,
  selectedCompareWith
) => {
  const body = { filters: { ...payload.filters } };
  delete body.filters.graph;
  body.filters.agg_level = "l2";
  body.filters.only_eligible = !!adaReducer?.isEligible;

  body.filters.agg_hierarchy = body.filters.mfp
    ? { mfp: l0Name, l1: l1Name }
    : { l0: l0Name, l1: l1Name };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  const { data } = await axiosInstance({
    url: urlAndPayloadHandlerEditHierarchy(
      adaReducer,
      body,
      selectedCompareWith,
      payload
    ),
    method: "POST",
    data: body,
  });

  let predictedFiscalWeeks = handleHistoricTimePeriod(adaReducer);

  let predictedFutureFiscalWeeks = handlePredictedTimePeriod(adaReducer);
  let updatedData = data?.data;

  let useAdjustedUserForecastBase =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.use_adjusted_user_forecast_base;

  if (useAdjustedUserForecastBase) {
    updatedData = addAdjustedInitialKey(updatedData);
  }

  predictedFiscalWeeks?.forEach((fiscalWeek, i) => {
    if (predictedFutureFiscalWeeks?.includes(fiscalWeek)) {
      //Since, historic and predicted both have common week, hence updating historic key by appending H to it
      // predictedFiscalWeeks[i] = `${fiscalWeek}H`;

      //Since, historic and predicted both have common week, hence updating response fiscal week by replacing it with new key
      if (body.filters.snapshot) {
        updatedData = updateKeyInPlace(
          data?.data,
          fiscalWeek,
          `${fiscalWeek}H`
        );
      }
    }
  });
  if (updatedData?.length > 0) {
    let formattedData = agGridRowFormatter(updatedData, null, "row");

    let updatedFormattedResponse = formattedData.map((el) => ({
      ...el,
      isEdited: false,
    }));

    updatedFormattedResponse.forEach((elem) => {
      for (let key in elem) {
        if (isNumber(key) || predictedFutureFiscalWeeks?.includes(key)) {
          elem[key] = {
            ...elem[key],
            IA: elem[key].IA || 0,
            adjusted: elem[key].adjusted || 0,
          };
        }
      }
    });

    return updatedFormattedResponse;
  }
  return [];
};

export const saveDetailForecast = async (payload) => {
  return axiosInstance({
    url: ADA_SAVE_DETAILED_FORECAST,
    method: "PUT",
    data: payload,
  });
};

export const saveDriverForecast = async (payload) => {
  return axiosInstance({
    url: ADA_SAVE_DRIVER_FORECAST,
    method: "PUT",
    data: payload,
  });
};

export const saveMultiplier = async (payload) => {
  return axiosInstance({
    url: ADA_SAVE_MULTIPLIER,
    method: "PUT",
    data: payload,
  });
};

export const getHistoricYears = async () => {
  const data = await axiosInstance({
    url: ADA_HISTORIC_YEARS,
    method: "GET",
  });
  return data.data.data;
};

export const getStaticForecastXaxis = async (payload) => {
  const data = await axiosInstance({
    url: ADA_GET_FORECAST_AXIS_DATA,
    method: "POST",
    data: payload,
  });
  return data.data.data;
};
export const getGraphKPIdata = async (payload) => {
  const data = await axiosInstance({
    url: ADA_GET_GRAPH_KPI_DATA,
    method: "POST",
    data: payload,
  });
  return data.data.data;
};

export const getFilteredProductStoreCode = async (payload) => {
  try {
    const data = await axiosInstance({
      url: FILTERED_PRODUCT_STORE_CODE,
      method: "POST",
      data: { filters: payload },
    });
    return data.data.data;
  } catch (error) {
    console.log(error, "czdvfdbg");
  }
};

export const downloadAdaForecastReport = async (payload) => {
  return axiosInstance({
    url: DOWNLOAD_ADA_FORECAST_REPORT,
    method: "POST",
    data: payload,
  });
};

export const checkLengthDownloadAdaVisualTable = async (payload) => {
  return axiosInstance({
    url: CHECK_LENGTH_DOWNLOAD_ADA_VISUAL_TABLE,
    method: "POST",
    data: payload,
  });
};

const getBody = (payload, module, dataType, showIAData, extra) => {
  return {
    start_week_id: payload.start_week_id,
    end_week_id: payload.end_week_id,
    formatter: payload.formatter,
    module: module,
    data_type: dataType,
    forecast_source: showIAData ? "IA" : "adjusted",
    aggregation_level: payload.aggregation_level,
    extra,
  };
};
const getUpdatedColumnData = (
  data,
  timeline,
  predictedFutureFiscalWeeks,
  adaReducer,
  payload,
  showIAData,
  selectedCompareWith,
  compareWithEditable
) => {
  const isWeekEndDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled && timeline === "W";

  const isWeekStartDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_start_date_label_enabled;

  let showWeekStartDateLabelEnabled =
    isWeekStartDateLabelEnabled && timeline === "W";

  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  return data?.slice(1).forEach((column) => {
    // if (column.type === "float") {
    //   column.column_name =
    //     column.column_name + "." + (showIAData ? "IA" : "adjusted");
    //   column.formatter = payload?.formatter;
    // }

    column = handleFloatColumnWithSubHeader(
      column,
      payload,
      false,
      showIAData,
      selectedCompareWith,
      adaReducer,
      false,
      compareWithEditable
    );

    let fiscalWeek = column.column_name;

    let fiscalWeekForecastType = "";
    if (fiscalWeek?.includes(".")) {
      fiscalWeek = column.column_name?.split(".")?.[0];
      fiscalWeekForecastType = column.column_name?.split(".")?.[1];
    }
    column.extra = {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    };
    column.disabled = true;
    column.is_lockable = false;
    column.is_sortable = true;
    column.is_searchable = true;
    // column.label = isNumber(column.label)
    //   ? showWeekEndDateLabelEnabled
    //     ? weekEndDateLabel(column.label, adaReducer)
    //     : `F${timeline}-${column.label} ${
    //         predictedFutureFiscalWeeks?.includes(+column.label) ? " (H)" : ""
    //       }`
    //   : column.label;

    if (isNumber(column.label)) {
      column.label = columnLabelHandler(
        column.label,
        adaReducer,
        showWeekEndDateLabelEnabled,
        predictedFutureFiscalWeeks,
        false,
        showWeekStartDateLabelEnabled
      );
    }
    // For Month aggregation level, some weeks of the Last Month will fall under historic forecast
    // and some of the weeks will be under predicted forecast, since keys will be same.
    // Hence, modyfying the key for Historical in response
    column.column_name = predictedFutureFiscalWeeks?.includes(+fiscalWeek)
      ? `${fiscalWeek}H.${fiscalWeekForecastType}`
      : column.column_name;
  });
};

//for Demand Selection Table Column data

export const getDemandSelectionColumns = async (payload, extra) => {
  const body = {
    start_week_id: payload.start_week_id,
    end_week_id: payload.end_week_id,
    module: "mfp_choice_table",
    data_type: "float",
    forecast_source: "",
    aggregation_level: payload.aggregation_level,
    formatter: payload.formatter,

    extra,
  };
  return axiosInstance({
    url: ADA_DASHBOARD_COLUMNS,
    method: "POST",
    data: body,
  });
};

export const getDemandSelectionTableData = async (payload) => {
  const body = { filters: { ...payload.filters } };
  body.adjusted = payload.adjusted;
  body.adjusted_price_point = payload.adjusted_price_point;
  delete body.filters.graph;

  return axiosInstance({
    url: ADA_DEMAND_SELECTION_TABLE_DATA,
    method: "POST",
    data: body,
  });
};

export const updateMFPData = async (payload) => {
  return axiosInstance({
    url: ADA_DEMAND_SELECTION_UPDATE_MFP_DATA,
    method: "POST",
    data: payload,
  });
};

export const uploadDriversBulkData = async (payload) => {
  return axiosInstance({
    url: ADA_UPLOAD_DRIVERS_FORECAST_BULK_DATA,
    method: "POST",
    data: payload,
  });
};

export const uploadForecastDeepDiveData = async (payload) => {
  return axiosInstance({
    url: ADA_UPLOAD_DRIVERS_FORECAST_BULK_DATA,
    method: "POST",
    data: payload,
  });
};

export const AdaUploadValidationData = async (report_code) => {
  return axiosInstance({
    url: `/ada-visual/uploads/${report_code}`,
    method: "GET",
  });
};

export const AdaGetKeyToLabelMapping = () => {
  return axiosInstance({
    url: "/ada-visual/upload-validation/validation-label-mapping",
    method: "GET",
  });
};

export const getCombinedCrossDimensionalDataV3 = async (payload) => {
  return axiosInstance({
    url: COMBINED_CROSS_DIMENSIONAL_API_V3,
    method: "POST",
    data: payload,
  });
};
