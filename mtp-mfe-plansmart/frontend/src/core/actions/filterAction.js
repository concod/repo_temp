import axiosInstance from "../Utils/axios";
import {
  COMBINED_CROSS_DIMENSIONAL_API,
  CREATE_DIMENSION_FILTER,
  CROSS_DIMENSIONAL_API,
  GET_ALL_FILTER,
  GET_COMBINED_FILTER_OPTIONS,
  GET_FILTER_OPTIONS,
  GET_TENANT_CONFIG,
  SAVE_FILTER_DELETE,
  SAVE_FILTER_GET,
  SAVE_FILTER_POST,
  SAVE_FILTER_PUT,
  SAVE_FILTER_SELECTION,
  SET_FILTER_ELEMENTS,
} from "../../config/api";
import {
  ADD_SNACK,
  CLEAR_MODULE_CONFIG_DATA,
  GET_FILTER_KEY,
  GET_SAVED_FILTERSELECTION_LOADING,
  LOADER,
  RESET_CONFIG,
  RESET_SELECTED_FILTER_CONFIGURATION,
  SET_APPLICATION_CODES_LIST,
  SET_CONFIG_NAME,
  SET_EDIT_MODULE_CONFIG_DATA,
  SET_FILTER_MODULES,
  SET_IS_FILTER_APPLIED,
  SET_MANDATORY_FILTERS_FOR_SCREEN,
  SET_MODULE_CONFIG_DATA,
  SET_SAVED_FILTERS_LIST,
  SET_SAVED_FILTER_SELECTION,
  SET_SAVED_SELECTED_FILTERS,
  SET_SELECTED_APPLICATION,
  SET_SELECTED_FILTERS,
  SET_SELECTED_FILTER_CONFIGURATION,
  SET_SELECTED_MODULES,
  SHOW_FILTER_MODAL_LOADER,
} from "./types";
export const getFilterfields = (screen) => async (dispatch) => {
  dispatch({
    type: SHOW_FILTER_MODAL_LOADER,
    payload: true,
  });
  try {
    const { data } = await axiosInstance.get("/core/filter?screen=" + screen);
    dispatch({
      type: GET_FILTER_KEY,
      payload: data.data.filters || [],
    });
    dispatch({
      type: SET_MANDATORY_FILTERS_FOR_SCREEN,
      payload: data.data.compulsory || [],
    });
    dispatch({
      type: SHOW_FILTER_MODAL_LOADER,
      payload: false,
    });
  } catch (error) {
    dispatch({
      type: GET_FILTER_KEY,
      payload: [],
    });
    dispatch({
      type: SHOW_FILTER_MODAL_LOADER,
      payload: false,
    });
    dispatch({
      type: ADD_SNACK,
      payload: {
        message: `Failed to load fields`,
        options: {
          variant: "error",
        },
      },
    });
  }
};

export const getFilteredFields = (model, screen) => (_dispatch) => {
  return axiosInstance.get(
    "/core/filter?dimension=" + model + "&screen=" + screen
  );
};
export const setFilteredFields = (fields) => (dispatch) => {
  dispatch({
    type: GET_FILTER_KEY,
    payload: fields,
  });
};
export const setFilterElements = (filterobj) => async (dispatch) => {
  try {
    return axiosInstance({
      url: SET_FILTER_ELEMENTS,
      method: "POST",
      data: filterobj,
    });
  } catch {
    dispatch({
      type: ADD_SNACK,
      payload: {
        message: `Failed to create filter`,
        options: {
          variant: "error",
        },
      },
    });
  }
};
export const ToggleLoader = (loadStatus) => (dispatch) => {
  dispatch({
    type: LOADER,
    payload: {
      status: loadStatus,
    },
  });
};

export const getFilterDimensions = async (dispatch) => {
  //We can integrate using API here to fetch the dimensions
  try {
    return await axiosInstance({
      url: "/core/dimension",
      method: "GET",
    });
  } catch {
    dispatch({
      type: ADD_SNACK,
      payload: {
        message: `Failed to fetch dimensions`,
        options: {
          variant: "error",
        },
      },
    });
  }
  return axiosInstance.get("/core/dimension");
};

export const getFilterConfiguration = async (fc_code) => {
  return axiosInstance.get(
    `core/configuration/filter-config/screen?screen_code=${fc_code}`
  );
};

export const getFilterModules = (dimensions) => () => {
  //API to fetch the screens based on dimensions
  return axiosInstance.get("/core/screen?dimension=" + dimensions);
};

export const getScreenList = (screenCode) => () => {
  //API to fetch the screensList based on application code
  return axiosInstance.get("/core/screen/list/" + screenCode);
};

export const setFilterModules = (modules) => (dispatch) => {
  dispatch({
    type: SET_FILTER_MODULES,
    payload: modules,
  });
};

export const setSelModules = (modules) => (dispatch) => {
  dispatch({
    type: SET_SELECTED_MODULES,
    payload: modules,
  });
};

export const setSelectedApplication = (application) => (dispatch) => {
  dispatch({
    type: SET_SELECTED_APPLICATION,
    payload: application,
  });
};

export const setModuleConfigData = (moduleConfig, dimension) => (dispatch) => {
  dispatch({
    type: SET_MODULE_CONFIG_DATA,
    payload: { moduleConfig: moduleConfig, dimension: dimension },
  });
};

export const clearModuleConfigData = () => (dispatch) => {
  dispatch({
    type: CLEAR_MODULE_CONFIG_DATA,
  });
};

export const setEditConfigData = (moduleConfig, dimension) => (dispatch) => {
  dispatch({
    type: SET_EDIT_MODULE_CONFIG_DATA,
    payload: { moduleConfig: moduleConfig, dimension: dimension },
  });
};

export const setModuleConfigName = (configName) => (dispatch) => {
  dispatch({
    type: SET_CONFIG_NAME,
    payload: configName,
  });
};

export const createNewFilterConfig = (_id, reqbody) => () => {
  return axiosInstance({
    url: "/core/filter-configuration",
    method: "POST",
    data: reqbody,
  });
};

export const saveFilterConfig = (fc_code, reqbody) => () => {
  return axiosInstance({
    url: `/core/configuration/filter-config/${fc_code}/save`,
    method: "POST",
    data: reqbody,
  });
};

export const getFilterConfigsTableData = (
  body,
  pageIndex = 0,
  _pageSize = 10
) => (dispatch) => {
  return axiosInstance({
    url: `/core/filter-configurations?page=${pageIndex + 1}`,
    method: "POST",
    data: body,
  });
};
export const resetFilterConfigSelections = () => (dispatch) => {
  dispatch({
    type: RESET_CONFIG,
  });
};
export const updateFilterConfig = (_tabId, configId, reqbody) => () => {
  return axiosInstance({
    url: `/core/filter-configuration/${configId}`,
    method: "PUT",
    data: reqbody,
  });
};

export const getFilterConfigById = (id) => () => {
  return axiosInstance({
    url: `/core/filter-configuration/${id}`,
    method: "GET",
  });
};
export const getAllFilters = (screen) => async () => {
  return axiosInstance({
    url: `${GET_ALL_FILTER}/${screen}`,
    method: "GET",
  });
};

export const getAppSpecificFilters = (screen, application) => async () => {
  return axiosInstance({
    url: `${GET_ALL_FILTER}/${screen}/application/${application}`,
    method: "GET",
  });
};
export const getFiltersValues = (screen, postBody) => async () => {
  return axiosInstance({
    url: `${GET_FILTER_OPTIONS}/${screen}`,
    method: "POST",
    data: postBody,
  });
};
export const getCombinedFiltersValues = (postBody) => async () => {
  return axiosInstance({
    url: `${GET_COMBINED_FILTER_OPTIONS}`,
    method: "POST",
    data: postBody,
  });
};
export const setSelectedFilters = (data) => (dispatch) => {
  dispatch({
    type: SET_SELECTED_FILTERS,
    payload: data,
  });
};

export const setSavedSelectedFilter = (data) => (dispatch) => {
  dispatch({
    type: SET_SAVED_SELECTED_FILTERS,
    payload: data,
  });
};

export const setFilterConfiguration = (data) => (dispatch) => {
  dispatch({
    type: SET_SELECTED_FILTER_CONFIGURATION,
    payload: data,
  });
};
export const resetFilterConfiguration = (data) => (dispatch) => {
  dispatch({
    type: RESET_SELECTED_FILTER_CONFIGURATION,
    payload: data,
  });
};
export const setApplicationCodesList = (data) => (dispatch) => {
  dispatch({
    type: SET_APPLICATION_CODES_LIST,
    payload: data,
  });
};
export const setSavedFiltersList = (data) => (dispatch) => {
  dispatch({
    type: SET_SAVED_FILTERS_LIST,
    payload: data,
  });
};
export const setIsFilterApplied = (data) => (dispatch) => {
  dispatch({
    type: SET_IS_FILTER_APPLIED,
    payload: data,
  });
};
export const getCreateDimensionFilters = (screen) => {
  return axiosInstance({
    url: `${CREATE_DIMENSION_FILTER}${screen}`,
    method: "GET",
  });
};

export const getPlanningHierarchy = (
  applicationCode = 1,
  queryParam = {}
) => async () => {
  return axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}`,
    params: queryParam,
    method: "GET",
  });
};

export const setMandatoryFieldsInScreen = (mandatoryFields) => (dispatch) => {
  dispatch({
    type: SET_MANDATORY_FILTERS_FOR_SCREEN,
    payload: mandatoryFields || [],
  });
};

/**
 *
 * @param {dependency for cascading filters} postBody
 * @returns Updates individual dropdown values for the dependency selection
 * This API will have cross dimensionality effect between store and product,
 * i.e if any dropdown related store is selected, product dropdown values also gets filtered
 * based on store dropdown value and vice versa
 */
export const getCrossDimensionFiltersData = (postBody) => async () => {
  return axiosInstance({
    url: CROSS_DIMENSIONAL_API,
    method: "POST",
    data: postBody,
  });
};

export const getCombinedCrossDimensionFiltersData = (postBody) => async () => {
  return axiosInstance({
    url: COMBINED_CROSS_DIMENSIONAL_API,
    method: "POST",
    data: postBody,
  });
};

export const setSavedFilterData = (data) => (dispatch) => {
  dispatch({
    type: SET_SAVED_FILTER_SELECTION,
    payload: data,
  });
};

export const getFilterUserConfiguration = async (screenName) => {
  const { data } = await axiosInstance({
    url: `${SAVE_FILTER_GET}/${screenName}`,
    method: "GET",
  });
  return data.data;
};

export const saveFilterUserConfiguration = async (postBody) => {
  const { data } = await axiosInstance({
    url: `${SAVE_FILTER_POST}`,
    method: "POST",
    data: postBody,
  });
  return data.data;
};

export const updateFilterUserConfiguration = async (filterCode, postBody) => {
  const { data } = await axiosInstance({
    url: `${SAVE_FILTER_PUT}/${filterCode}`,
    method: "PUT",
    data: postBody,
  });
  return data.data;
};

export const deleteFilterUserConfiguration = async (filterCode) => {
  const { data } = await axiosInstance({
    url: `${SAVE_FILTER_DELETE}/${filterCode}`,
    method: "DELETE",
  });
  return data.data;
};

export const setSavedFilterSelection = (postBody) => async () => {
  return axiosInstance({
    url: `${SAVE_FILTER_SELECTION}`,
    method: "PUT",
    data: postBody,
  });
};

export const setSavedFilterSelectionLoading = () => (dispatch) => {
  dispatch({
    type: GET_SAVED_FILTERSELECTION_LOADING,
    payload: false,
  });
};

export const deleteFilterConfigById = (Id) => async () => {
  return axiosInstance({
    url: `/core/filter-configuration/${Id}`,
    method: "DELETE",
  });
};
