import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  ORDER_ALERTS_TABLE_CONFIG,
  ORDER_ALERTS_TABLE_DATA,
  RECOMMENDED_ALERTS_TABLE_DATA,
  RECOMMENDED_POPUP_ALERTS_TABLE_DATA,
  UPDATE_RESOLVED_DATA,
  UPDATE_OFFCYCLE_EXPEDITE_ORDERS_ALERTS,
  DECISION_DASHBOARD_ORDER_KPI_DATA,
  DECISION_DASHBOARD_ORDER_ALERT_DATA,
  OFF_CYCLE_ORDER_ALERT_DATA,
  ORDER_MANAGEMENT_DC_LIST_API,
} from "modules/oms/constants-oms/apiConstants";

export const omsOrderingAlertsService = createSlice({
  name: "omsOrderingAlertsService",
  initialState: {
    orderAlertsTableConfigLoader: false,
    orderAlertsTableDataLoader: false,
    orderAlertsPopUpTableConfigLoader: false,
    orderAlertsPopUpTableDataLoader: false,
    orderVendorDCAlertCount: {},
    orderVendorStoreAlertCount: {},
    orderKPIConfigLoader: false,
    orderKPIDataLoader: false,
    orderAlertCount: {},
    offCycleOrderAlertCount: {},
    offCycleOrderAlertDataLoader: false,
  },
  reducers: {
    setOrderAlertsTableConfigLoader: (state, action) => {
      state.orderAlertsTableConfigLoader = action.payload;
    },
    setOrderAlertsTableDataLoader: (state, action) => {
      state.orderAlertsTableDataLoader = action.payload;
    },
    setOrderAlertsPopUpTableConfigLoader: (state, action) => {
      state.orderAlertsPopUpTableConfigLoader = action.payload;
    },
    setOrderAlertsPopUpTableDataLoader: (state, action) => {
      state.orderAlertsPopUpTableDataLoader = action.payload;
    },
    setOrderVendorDCAlertCount: (state, action) => {
      state.orderVendorDCAlertCount = action.payload;
    },
    setOrderVendorStoreAlertCount: (state, action) => {
      state.orderVendorStoreAlertCount = action.payload;
    },
    setOrderKPIConfigLoader: (state, action) => {
      state.orderKPIConfigLoader = action.payload;
    },
    setOrderKPIDataLoader: (state, action) => {
      state.orderKPIDataLoader = action.payload;
    },
    setOrderAlertCount: (state, action) => {
      state.orderAlertCount[action.payload.key] = action.payload.data;
    },
    setOffCycleOrderAlertCount: (state, action) => {
      state.offCycleOrderAlertCount = action.payload;
    },
    setOffCycleOrderAlertDataLoader: (state, action) => {
      state.offCycleOrderAlertDataLoader = action.payload;
    },
    resetOrderingAlertsData: (state) => {
      state.orderAlertsTableConfigLoader = false;
      state.orderAlertsTableDataLoader = false;
      state.orderAlertsPopUpTableConfigLoader = false;
      state.orderAlertsPopUpTableDataLoader = false;
      state.orderVendorDCAlertCount = {};
      state.orderVendorStoreAlertCount = {};
      state.orderKPIConfigLoader = false;
      state.orderKPIDataLoader = false;
      state.orderAlertCount = {};
      state.offCycleOrderAlertCount = {};
      state.offCycleOrderAlertDataLoader = false;
    },
  },
});

export const {
  setOrderAlertsTableConfigLoader,
  setOrderAlertsTableDataLoader,
  setOrderAlertsPopUpTableConfigLoader,
  setOrderAlertsPopUpTableDataLoader,
  setOrderVendorDCAlertCount,
  setOrderVendorStoreAlertCount,
  setOrderKPIConfigLoader,
  setOrderKPIDataLoader,
  setOrderAlertCount,
  setOffCycleOrderAlertCount,
  setOffCycleOrderAlertDataLoader,
  resetOrderingAlertsData,
} = omsOrderingAlertsService.actions;

/** Optional axios/body flags for Vendor-DC CH variants; defaults keep legacy v2. */
const normalizeDashboardApiFlags = (apiFlags = {}) => ({
  useV3Api: Boolean(apiFlags?.useV3Api),
  isV3Schema: Boolean(apiFlags?.isV3Schema),
});

const withDashboardApiBody = (postBody, apiFlags) => {
  const { useV3Api, isV3Schema } = normalizeDashboardApiFlags(apiFlags);
  if (!useV3Api) {
    return postBody;
  }
  if (
    postBody == null ||
    typeof postBody !== "object" ||
    Array.isArray(postBody)
  ) {
    return postBody;
  }
  return {
    ...postBody,
    is_v3: Boolean(isV3Schema),
  };
};

const withDashboardAxiosConfig = (config, apiFlags) => {
  const { useV3Api } = normalizeDashboardApiFlags(apiFlags);
  if (!useV3Api) {
    return config;
  }
  return {
    ...config,
    isV3: true,
  };
};

export const getDashboardOrderKPIData = (postBody, apiFlags) => () => {
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: DECISION_DASHBOARD_ORDER_KPI_DATA,
        method: "POST",
        data: withDashboardApiBody(postBody, apiFlags),
      },
      apiFlags
    )
  );
};

export const getDashboardOrderAlertData = (postBody, apiFlags) => () => {
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: DECISION_DASHBOARD_ORDER_ALERT_DATA,
        method: "POST",
        data: withDashboardApiBody(postBody, apiFlags),
      },
      apiFlags
    )
  );
};

export const getOrderAlertsTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_ALERTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getVendorStoreAlertsTableConfiguration = () => () => {
  return axiosInstance({
    url: ORDER_ALERTS_TABLE_CONFIG,
    method: "GET",
  });
};

export const getOrderAlertsTableData = (postBody, apiFlags) => () => {
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: ORDER_ALERTS_TABLE_DATA,
        method: "POST",
        data: withDashboardApiBody(postBody, apiFlags),
      },
      apiFlags
    )
  );
};

export const getRecommendedOrderAlertsTableData = (
  postBody,
  apiFlags
) => () => {
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: `${RECOMMENDED_ALERTS_TABLE_DATA}${postBody.tableDataApi}`,
        method: "POST",
        data: withDashboardApiBody(postBody.data, apiFlags),
      },
      apiFlags
    )
  );
};

/** Maps details path to count path: .../details-x → .../count/details-x */
export const buildRecommendedAlertsCountApiPath = (tableDataApi) => {
  if (!tableDataApi || typeof tableDataApi !== "string") return null;
  if (tableDataApi.includes("/oms/oms_decision_dashboard/count/details-")) {
    return tableDataApi;
  }
  return tableDataApi.replace(
    "/oms/oms_decision_dashboard/details-",
    "/oms/oms_decision_dashboard/count/details-"
  );
};

export const getRecommendedOrderAlertsTableCount = (
  postBody,
  apiFlags
) => () => {
  const path = buildRecommendedAlertsCountApiPath(postBody.tableDataApi);
  if (!path) {
    return Promise.reject(new Error("Invalid tableDataApi for count"));
  }
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: `${RECOMMENDED_ALERTS_TABLE_DATA}${path}`,
        method: "POST",
        data: withDashboardApiBody(postBody.data, apiFlags),
      },
      apiFlags
    )
  );
};

/**
 * Reads total row count from the OMS alert count API axios response.
 * Typical shape: { data: { total_count }, status } on the response body.
 */
export const readAlertCountApiTotal = (axiosResponse) => {
  const responseBody = axiosResponse?.data;
  const innerPayload = responseBody?.data;
  const rawTotal =
    innerPayload?.total_count ??
    innerPayload?.totalCount ??
    responseBody?.total_count ??
    responseBody?.totalCount;
  if (rawTotal == null || rawTotal === "") {
    return null;
  }
  const numericTotal = Number(rawTotal);
  return Number.isFinite(numericTotal) ? numericTotal : null;
};

export const getRecommendedOrderPopUpTableData = (postBody, apiFlags) => () => {
  const hasFilters =
    postBody?.filters !== undefined && postBody?.filters !== null;

  if (hasFilters) {
    return axiosInstance(
      withDashboardAxiosConfig(
        {
          url: `${RECOMMENDED_POPUP_ALERTS_TABLE_DATA}${postBody.tableDataApi}`,
          method: "POST",
          data: withDashboardApiBody(
            {
              filters: postBody.filters,
              meta: postBody?.meta,
              ...postBody?.row_keys,
            },
            apiFlags
          ),
        },
        apiFlags
      )
    );
  }

  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: `${RECOMMENDED_POPUP_ALERTS_TABLE_DATA}${postBody.tableDataApi}`,
        method: "GET",
      },
      apiFlags
    )
  );
};

export const updateResolvedData = (postBody, apiFlags) => () => {
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: UPDATE_RESOLVED_DATA,
        method: "POST",
        data: withDashboardApiBody(postBody, apiFlags),
      },
      apiFlags
    )
  );
};

export const updateOffcycleExpediteOrdersAlerts = (
  postBody,
  apiFlags
) => () => {
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: UPDATE_OFFCYCLE_EXPEDITE_ORDERS_ALERTS,
        method: "POST",
        data: withDashboardApiBody(postBody, apiFlags),
      },
      apiFlags
    )
  );
};

export const getOffCycleOrderAlertData = (postBody) => () => {
  return axiosInstance({
    url: OFF_CYCLE_ORDER_ALERT_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getOrderingDecisionDashboardDistributionCentres = (
  postBody,
  apiFlags
) => () => {
  return axiosInstance(
    withDashboardAxiosConfig(
      {
        url: ORDER_MANAGEMENT_DC_LIST_API,
        method: "POST",
        data: withDashboardApiBody(postBody, apiFlags),
      },
      apiFlags
    )
  );
};

export default omsOrderingAlertsService.reducer;
