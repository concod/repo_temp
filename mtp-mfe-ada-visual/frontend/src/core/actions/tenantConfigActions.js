import axiosInstance from "../Utils/axios";
import {
  TENANT_APP_CONFIG,
  HIERARCHIES_LIST,
  GET_APP_CONFIG,
  GET_KPI_CONFIG,
  GET_EXITING_PLANNING_LEVEL,
  GET_TENANT_FILTER_CONFIG,
  POST_TENANT_FILTER_CONFIG,
  GET_APPLICATION_MASTER,
  UPDATE_TENANT_ATTRIBUTE_CONFIG,
  GET_TENANT_CONFIG,
  FETCH_KEYBOARD_SHORTCUT_CONFIG,
} from "../../config/api";
import {
  SET_HIERARCHY_LEVEL,
  SET_HELP_DESK,
  SET_SPECIFIC_SCREEN_NAME,
  SET_KEYBOARD_SHORTCUT,
  UPDATE_TAM_CACHE,
  SET_COMMENTING_CONFIG,
  SET_PRODUCT_STORE_ATTRIBUTES_LIST,
  UPDATE_TENANT_CONFIG,
  GET_PRODUCT_STORE_ATTRIBUTES_LIST,
  GET_PRODUCT_STORE_GENERIC_MAPPINGS,
  UPDATE_PRODUCT_STORE_GENERIC_MAPPINGS,
} from "./types";
import { cloneDeep } from "lodash";
import store from "store";
import { processData } from "core/Utils/functions/utils";
import {  UPDATE_MODULE_CONFIG } from "core/constants"

export const GET_DASHBOARD_FILTERS = "/assort/plan/dashboard-filters";
export const GET_STORE_ATTRIBUTES = "/plan-smart/plan/store-attributes";

export const tenantAppConfig = () => async () => {
  const { data } = await axiosInstance({
    url: `${TENANT_APP_CONFIG}`,
    method: "GET",
  });
  return data.data;
};

export const hierarchiesList = () => async () => {
  const { data } = await axiosInstance({
    url: `${HIERARCHIES_LIST}`,
    method: "GET",
  });
  return data.data;
};

export const getAppConfig = (queryStr = "") => async () => {
  const { data } = await axiosInstance({
    url: GET_APP_CONFIG + queryStr,
    method: "GET",
  });
  return data.data;
};
export const setAppConfig = (appConfig) => async (dispatch) => {
  dispatch({
    type: SET_HIERARCHY_LEVEL,
    payload: appConfig,
  });
};
export const updateAppConfig = (reqBody, queryStr = "") => async () => {
  await axiosInstance({
    url: GET_APP_CONFIG + queryStr,
    method: "PUT",
    data: reqBody,
  });
};
export const getKpiConfig = (reqBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_KPI_CONFIG,
    method: "POST",
    data: reqBody,
  });
  return data.data;
};
export const updateKpiConfig = (reqBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_KPI_CONFIG,
    method: "PUT",
    data: reqBody,
  });
  return data.data;
};
export const getExistingPlanningLevel = (reqBody) => async () => {
  const { data } = await axiosInstance({
    url: GET_EXITING_PLANNING_LEVEL,
    method: "POST",
    data: reqBody,
  });
  return data.data;
};
export const updatePlanningLevel = (level, reqBody) => async () => {
  await axiosInstance({
    url: `${GET_EXITING_PLANNING_LEVEL}?level=${level}`,
    method: "PUT",
    data: reqBody,
  });
};
export const getTenantFilterConfig = (applicationCode) => async () => {
  const { data } = await axiosInstance({
    url: `${GET_TENANT_FILTER_CONFIG}/${applicationCode}`,
    method: "GET",
  });
  return data;
};

export const saveTenantFilterConfig = (
  applicationCode,
  reqBody
) => async () => {
  const { data } = await axiosInstance({
    url: `${POST_TENANT_FILTER_CONFIG}/${applicationCode}`,
    method: "POST",
    data: reqBody,
  });
  return data;
};

export const getFilterConfiguration = () => () => {
  return axiosInstance({
    url: GET_DASHBOARD_FILTERS,
    method: "GET",
  });
};

export const getDropdownValues = (
  applicationCode = 1,
  queryParam = {}
) => async () => {
  return tenantConfigApiCache(applicationCode, queryParam)();
};

export const getStoreDropdownValues = (postBody) => async () => {
  return axiosInstance({
    url: GET_STORE_ATTRIBUTES,
    method: "POST",
    data: postBody,
  });
};

export const getApplicationMaster = (postBody) => async () => {
  return axiosInstance({
    url: GET_APPLICATION_MASTER,
    method: "GET",
    data: postBody,
  });
};

export const updateTenantAttributeConfig = (
  attributeLevel,
  reqBody
) => async () => {
  const { data } = await axiosInstance({
    url: `${UPDATE_TENANT_ATTRIBUTE_CONFIG}/${attributeLevel}`,
    method: "POST",
    data: reqBody,
  });
  return data;
};

export const setHelpDesk = (data) => async (dispatch) => {
  dispatch({
    type: SET_HELP_DESK,
    payload: data,
  });
};

export const getSpecificScreenName = (
  applicationCode = 1,
  queryParam = {}
) => async (dispatch) => {
  const state = store.getState();
  const tenantCache = cloneDeep(state?.tenantConfigReducer?.tamAPICache);
  const screenCache = tenantCache?.[applicationCode]?.attributeData;

  // If cached data is found, process it
  if (screenCache) {
    const coreScreenCache = processData(screenCache, queryParam);
    const coreScreenData = coreScreenCache?.data?.data[0];
    localStorage.setItem("coreScreenNames", JSON.stringify(coreScreenData));
    dispatch({
      type: SET_SPECIFIC_SCREEN_NAME,
      payload: coreScreenData,
    });
    return;
  }

  // If cached data is not found, make the API call
  const { data } = await tenantConfigApiCache(applicationCode, queryParam)();
  localStorage.setItem("coreScreenNames", JSON.stringify(data?.data?.[0]));
  dispatch({
    type: SET_SPECIFIC_SCREEN_NAME,
    payload: data?.data?.[0],
  });
};

//queryParam -> attribute name
//ex: -> /tenant-config/1?attribute_name=default_store_groups
export const getTenantConfigApplicationLevel = (
  applicationCode = 1,
  queryParam = {}
) => async () => {
  const resp = await tenantConfigApiCache(applicationCode, queryParam)();
  return resp;
};

export const refreshTenantConfigs = async (applicationCode = 1) => {
  const resp = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}`,
    params: {},
    method: "GET",
  });
  store.dispatch({
    type: UPDATE_TAM_CACHE,
    payload: {
      [applicationCode]: { attributeData: resp },
    },
  });
  return resp;
};

export const tenantConfigApiCache = (
  applicationCode = 1,
  queryParam = {}
) => async () => {
  const state = store.getState();
  const cache = cloneDeep(state?.tenantConfigReducer?.tamAPICache);
  const cachedDataForApp = cache?.[applicationCode]?.attributeData;
  if (cachedDataForApp) {
    const processedCachedData = processData(cachedDataForApp, queryParam);
    return processedCachedData; // Return specific data from the cached response
  } else {
    // Make the API call if no cache exists for this applicationCode
    const resp = await axiosInstance({
        url: `${GET_TENANT_CONFIG}/${applicationCode}`,
        params: {},
        method: "GET",
    });
        // Store the response in Redux, indexed by applicationCode
        store.dispatch({
          type: UPDATE_TAM_CACHE,
          payload: {
            [applicationCode]: { attributeData: resp },
          },
        });
    const apiFilteredData = processData(resp, queryParam);
    return apiFilteredData;
  }
};

export const  getCustomHeader = async (applicationCode = 3) => {
    let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "show_custom_header",
  })();
  return data?.data;
}
export const getTenantTimeConfig = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "tenant_time_config",
  })();
  return data?.data;
};
export const getFilterExclusionValues = async (applicationCode = 1) => {
  let { data } = await getTenantConfigApplicationLevel(applicationCode, {
    attribute_name: "filter_attribute_exclusion_values",
  })();
  return data?.data;
};
export const getPSMItineraryConfig = async (applicationCode = 1) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "psm_itinerary_config",
  })();
  return data?.data;
};

export const getTicketingConfig = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "ticketing_module_config",
  })();
  return data?.data;
};

export const getUamConfig = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "ui_uam_config",
  })();
  return data?.data;
};
export const getCommentingConfig = async (applicationCode = 1) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "commenting_configuration",
  })();
  return data?.data;
};
export const getCrossFilterVersionConfig = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "cross_filter_version",
  })();
  return data?.data?.[0]
};
export const updateModuleConfig = (reqBody) => async () => {
  const { data } = await axiosInstance({
    url: UPDATE_MODULE_CONFIG,
    method: "POST",
    data: reqBody,
  });
  return data;
};

export const getCustomAppRedirectConfig = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "app_redirects",
  })();
  return data?.data?.[0]
};

export const getGroupingConfig = async (applicationCode = 1, attributeName) => {
  try {
    let { data } = await tenantConfigApiCache(applicationCode, {
      attribute_name: attributeName,
    })();
    return data?.data;
  } catch (error) {
    console.error("getGroupingConfig error", error);
  }
};

export const getModuleConfiguratorConfig = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "show_module_configurator",
  })();
  return data?.data;
};

export const getMappingConfig = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "fuc_mapping_config_type",
  })();
  return data?.data;
};

export const getFiltersHierarchyOrder = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "filters_hierarchy_order",
  })();
  return data?.data;
};

export const getKeyboardShortcut = async (
  payload = {
    meta: {
      limit: {
        limit: -1,
        page: 0,
        offset: 0,
      },
    },
  }
) => {
  try {
    let { data } = await axiosInstance({
      url: FETCH_KEYBOARD_SHORTCUT_CONFIG,
      data: payload,
      method: "POST",
    });

    return data?.data;
  } catch (error) {
    console.error("Failed to fetch keyboard shortcut configuration:", error);
  }
};

export const setKeyboardShortcut = (data) => ({
  type: SET_KEYBOARD_SHORTCUT,
  payload: data,
});

export const setCommentingConfig = (data) => ({
  type: SET_COMMENTING_CONFIG,
  payload: data,
});

export const updateTenantConfig = (reqBody) => async () => {
  const { data } = await axiosInstance({
    url: UPDATE_TENANT_CONFIG,
    method: "PUT",
    data: reqBody,
  });
  return data;
};

export const updateProductStoreGenericMappings = (payload) => async () => {
  const { data } = await axiosInstance({
    url: UPDATE_PRODUCT_STORE_GENERIC_MAPPINGS,
    method: "POST",
    data: payload,
  });
  return data;
};

export const getProductStoreGenericMappings = () => async () => {
  const { data } = await axiosInstance({
    url: GET_PRODUCT_STORE_GENERIC_MAPPINGS,
    method: "GET",
  });
  return data?.data;
};

export const getProductStoreAttributesList = () => async () => {
  const state = store.getState();
  const cached = state?.tenantConfigReducer?.productStoreList;
  if (cached) return cached;

  const { data } = await axiosInstance({
    url: GET_PRODUCT_STORE_ATTRIBUTES_LIST,
    method: "GET",
  });
  store.dispatch({
    type: SET_PRODUCT_STORE_ATTRIBUTES_LIST,
    payload: data?.data,
  });
  return data?.data;
};


export const getNotificationsVersion = async (applicationCode = 3) => {
  let { data } = await tenantConfigApiCache(applicationCode, {
    attribute_name: "notifications_version",
  })();
  return data?.data?.[0]?.attribute_value?.value;
};