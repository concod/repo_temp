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
} from "./types";

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
  return axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}`,
    params: queryParam,
    method: "GET",
  });
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
  const { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}`,
    params: queryParam,
    method: "GET",
  });
  localStorage.setItem("coreScreenNames", JSON.stringify(data?.data?.[0]))
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
) => () => {
  return axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}`,
    params: queryParam,
    method: "GET",
  });
};

export const getTenantTimeConfig = async (applicationCode = 3) => {
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${"?attribute_name=tenant_time_config"}`,
    method: "GET",
  });

  return data.data;
};
export const getFilterExclusionValues = async (applicationCode = 1) => {
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}?${"attribute_name=filter_attribute_exclusion_values"}`,
    method: "GET",
  });
  return data.data;
};

export const getTicketingConfig = async (applicationCode = 3) => {
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${"?attribute_name=ticketing_module_config"}`,
    method: "GET",
  });
  return data.data;
};

export const getUamConfig = async (applicationCode = 3) => {
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${"?attribute_name=ui_uam_config"}`,
    method: "GET",
  });
  return data.data;
};

export const getGroupingConfig = async (applicationCode = 1, attributeName) => {
  try {
    let { data } = await axiosInstance({
      url: `${GET_TENANT_CONFIG}/${applicationCode}?attribute_name=${attributeName}`,
      method: "GET",
    });
    return data.data;
  }
  catch(error) {
    console.error("getGroupingConfig error", error);
  }
};

export const getModuleConfiguratorConfig = async (applicationCode = 3) => {
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${"?attribute_name=show_module_configurator"}`,
    method: "GET",
  });
  return data.data;
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
