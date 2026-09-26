import { createSelector, createSlice } from "@reduxjs/toolkit";
import { addSnack } from "core/actions/snackbarActions";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  PLANSMART_REPORT_GET_TEMPLATE,
  PLANSMART_REPORT_KPI_COLUMN_CONF,
  PLANSMART_REPORT_KPI_TABLE_DATA,
  PLANSMART_REPORT_SAVE_TEMPLATE,
  PLANSMART_REPORT_TEMPLATE_TABLE_COL_DEF,
  PLANSMART_REPORT_FILTER_CONFIG,
} from "../../constants-plansmart/apiConstants";
import get from "lodash/get";
import { GET_TENANT_CONFIG } from "../../../../config/api";

// This is my report reducer to be added to combinedReducers for plan smart
// Plan smart reducers are inturn combined to Reducers from across products
const initialState = {
  kpiData: [],
  templateData: [],
  saveTemplateLoader: false,
  getTemplateDataLoader: false,
  getTemplateColDefLoader: false,
  reportColDefLoader: false,
  reportTableDataLoader: false,
};
export const reportServices = createSlice({
  name: "reportServices",
  initialState: {
    kpiData: [],
    templateData: [],
    saveTemplateLoader: false,
    getTemplateDataLoader: false,
    getTemplateColDefLoader: false,
    reportFilterLoader: false,
    reportColDefLoader: false,
    reportTableDataLoader: false,
    reportTypesFilterLoader: false,
  },
  reducers: {
    setReportKpiData: (state, action) => {
      state.kpiData = action.payload;
    },
    setSaveTemplateLoader: (state, action) => {
      state.saveTemplateLoader = action.payload;
    },
    setGetTemplateDataLoader: (state, action) => {
      state.getTemplateDataLoader = action.payload;
    },
    setGetTemplateColDefLoader: (state, action) => {
      state.getTemplateColDefLoader = action.payload;
    },
    setTemplateData: (state, action) => {
      state.templateData = action.payload;
    },
    setReportFilterLoader: (state, action) => {
      state.reportFilterLoader = action.payload;
    },
    setReportTypesFilterLoader: (state, action) => {
      state.reportTypesFilterLoader = action.payload;
    },
    setReportColDefLoader: (state, action) => {
      state.reportColDefLoader = action.payload;
    },
    setReportTableDataLoader: (state, action) => {
      state.reportTableDataLoader = action.payload;
    },
    clearReportAllData: () => initialState,
  },
});

//Selectors
export const reportServiceSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.reportReducer
);

export const saveTemplateLoaderSelector = createSelector(
  reportServiceSelector,
  (state) => state.saveTemplateLoader
);

export const getTemplateDataLoaderSelector = createSelector(
  reportServiceSelector,
  (state) => state.getTemplateDataLoader
);

export const getTemplateColDefLoaderSelector = createSelector(
  reportServiceSelector,
  (state) => state.getTemplateColDefLoader
);

export const getTemplateDataSelector = createSelector(
  reportServiceSelector,
  (state) => state.templateData
);

// Action creators are generated for each case reducer function
export const {
  setReportKpiData,
  setSaveTemplateLoader,
  setGetTemplateDataLoader,
  setGetTemplateColDefLoader,
  setTemplateData,
  clearReportAllData,
  setReportFilterLoader,
  setReportColDefLoader,
  setReportTableDataLoader,
  setReportTypesFilterLoader,
} = reportServices.actions;
export const fetchReportKpiColumnConf = (postBody) => async () => {
  return axiosInstance({
    url: PLANSMART_REPORT_KPI_COLUMN_CONF,
    method: "POST",
    data: postBody,
  });
};
export const fetchReportKpiTableData = (postBody) => async () => {
  return axiosInstance({
    url: PLANSMART_REPORT_KPI_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const saveReportTemplate = (postBody) => async () => {
  return axiosInstance({
    url: PLANSMART_REPORT_SAVE_TEMPLATE,
    method: "POST",
    data: postBody,
  });
};

export const getReportTemplate = () => async (dispatch) => {
  try {
    dispatch(setGetTemplateDataLoader(true));
    dispatch(setTemplateData([]));
    const response = await axiosInstance({
      url: PLANSMART_REPORT_GET_TEMPLATE,
      method: "GET",
    });
    const data = get(response, "data.data", []);
    dispatch(setTemplateData(data));
  } catch (error) {
    dispatch(
      addSnack({
        message: "Error while fetching template data",
        options: {
          variant: "error",
        },
      })
    );
  }
  dispatch(setGetTemplateDataLoader(false));
  return axiosInstance({
    url: PLANSMART_REPORT_GET_TEMPLATE,
    method: "GET",
  });
};

export const getReportTemplateColDef = () => async () => {
  return axiosInstance({
    url: PLANSMART_REPORT_TEMPLATE_TABLE_COL_DEF,
    method: "GET",
  });
};

export const getReportFilterConfiguration = (filterConfig) => () => {
  return axiosInstance({
    url: `${PLANSMART_REPORT_FILTER_CONFIG}/${filterConfig}`,
    method: "GET",
  });
};

export const getValueFromAttributeMaster = async (
  applicationCode = 4,
  config_url
) => {
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${`?attribute_name=${config_url}`}`,
    method: "GET",
  });
  return data.data[0].attribute_value;
};

export default reportServices.reducer;
