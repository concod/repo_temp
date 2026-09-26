import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../Utils/axios/index";
import { planSmartTenantConfigSelector } from "./planningMetrics";
import { GET_COLUMNS, GET_TENANT_CONFIG } from "config/api";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { get } from "lodash";

const initialState = {
  colDefLoader: false,
  savedDataLoader: false,
  metricsListLoader: false,
  planSmartScreenConfigLoader: false,
  colDef: [],
  savedData: [],
  metricList: [],
  planSmartScreenConfigs: {},
};
const conditionalFormatting = createSlice({
  name: "conditionalFormatting",
  initialState,
  reducers: {
    setConForColDefLoader: (state, action) => {
      state.colDefLoader = action.payload;
    },
    setConForSavedDataLoader: (state, action) => {
      state.savedDataLoader = action.payload;
    },
    setConForMetricsListLoader: (state, action) => {
      state.metricsListLoader = action.payload;
    },
    setPlanSmartScreenConfigLoader: (state, action) => {
      state.planSmartScreenConfigLoader = action.payload;
    },
    setConForColDef: (state, action) => {
      state.colDef = action.payload;
    },
    setConForSavedData: (state, action) => {
      state.savedData = action.payload;
    },
    setColForMetricList: (state, action) => {
      state.metricList = action.payload;
    },
    resetColFor: (state) => {
      state = initialState;
    },
    setPlanSmartScreenConfigs: (state, action) => {
      state.planSmartScreenConfigs = action.payload
    }
  },
});

export const {
  setConForColDefLoader,
  setConForSavedDataLoader,
  setConForMetricsListLoader,
  setPlanSmartScreenConfigLoader,
  setConForColDef,
  setConForSavedData,
  setColForMetricList,
  resetColFor,
  setPlanSmartScreenConfigs
} = conditionalFormatting.actions;

export const fetchConForColDef = () => async (dispatch) => {
  try {
    dispatch(setConForColDefLoader(true));
    const { default: agGridColumnFormatter } = await import("core/Utils/agGrid/column-formatter");
    const { data } = await axiosInstance({
      url: `${GET_COLUMNS}?table_name=plan_smart_conditional_formatting`,
      method: "GET",
    });
    dispatch(setConForColDef(agGridColumnFormatter(data.data)));
    dispatch(setConForColDefLoader(false));
  } catch (error) {
    const { default: agGridColumnFormatter } = await import("core/Utils/agGrid/column-formatter");
    dispatch(setConForColDef(agGridColumnFormatter(columnDef)));
    dispatch(setConForColDefLoader(false));
  }
};

export const fetchConForSavedData = () => async (dispatch) => {
  try {
    dispatch(setConForSavedDataLoader(true));
    const { data } = await axiosInstance({
      url: `${GET_TENANT_CONFIG}/4?attribute_name=plan_smart_cond_frmt`,
      method: "GET",
    });
    const metricsInfoDictionary = data.data[0].attribute_value.value;
    const metricsInfoList = Object.keys(metricsInfoDictionary);
    const list = metricsInfoList.map((m) => {
      return {
        metric: metricsInfoDictionary[m].value,
        min_val: metricsInfoDictionary[m].min_val,
        max_val: metricsInfoDictionary[m].max_val,
        min_color: metricsInfoDictionary[m].min_color,
        max_color: metricsInfoDictionary[m].max_color,
        label: m,
      };
    });
    dispatch(setConForSavedDataLoader(false));
    return list;
  } catch (error) {
    dispatch(setConForSavedData(list));
    dispatch(setConForSavedDataLoader(false));
  }
};

export const fetchColForMetricList = () => async (dispatch) => {
  try {
    setConForMetricsListLoader(true);
    const { data } = await axiosInstance({
      url: `${GET_TENANT_CONFIG}/4?attribute_name=plan_smart_selected_metrics`,
      method: "GET",
    });
    dispatch(setColForMetricList(data.data[0].attribute_value.value));
    setConForMetricsListLoader(false);
  } catch (error) {
    dispatch(setColForMetricList(metricList));
    setConForMetricsListLoader(false);
  }
};

export const getPlanSmartScreenConfig = () => async (dispatch) => {
  try {
    dispatch(setPlanSmartScreenConfigLoader(true));
    const response = await getTenantConfigApplicationLevel(4, {
      attribute_name: "plan_smart_screen_configuration",
    })();
    if (response?.data?.status) {
      const data = get(response, "data.data[0].attribute_value", {});
      dispatch(setPlanSmartScreenConfigs(data));
    } else {
      dispatch(setPlanSmartScreenConfigs({}));
    }
  } catch (error) {
    dispatch(setPlanSmartScreenConfigs({}));
  } finally {
    dispatch(setPlanSmartScreenConfigLoader(false));
  }
};

// Selectors
export const conditionalFormattingSelector = createSelector(
  planSmartTenantConfigSelector,
  (state) => state.conditionalFormatting
);

export const conForColDefLoaderSelector = createSelector(
  conditionalFormattingSelector,
  (state) => state.colDefLoader
);

export const conForSavedDataLoaderSelector = createSelector(
  conditionalFormattingSelector,
  (state) => state.savedDataLoader
);

export const conForMetricListLoaderSelector = createSelector(
  conditionalFormattingSelector,
  (state) => state.metricsListLoader
);

export const conForColDefSelector = createSelector(
  conditionalFormattingSelector,
  (state) => state.colDef
);

export const conForSavedDataSelector = createSelector(
  conditionalFormattingSelector,
  (state) => state.savedData
);

export const conForMetricListSelector = createSelector(
  conditionalFormattingSelector,
  (state) => state.metricList
);

export const planSmartScreenConfigLoaderSelector = createSelector(
  conditionalFormattingSelector,
  state => state.planSmartScreenConfigLoader
)

export const planSmartScreenConfigsSelector = createSelector(
  conditionalFormattingSelector,
  state => state.planSmartScreenConfigs
)

export default conditionalFormatting.reducer;

const list = [
  {
    metric: "qty",
    min: 10,
    max: 20,
  },
  {
    metric: "aur",
    min: 13,
    max: 25,
  },
];

const columnDef = [
  {
    sub_headers: [],
    tc_code: 69,
    column_name: "metric",
    type: "list",
    label: "Metric",
    is_frozen: false,
    is_hidden: false,
    is_editable: true,
    is_aggregated: false,
    order_of_display: 1,
    dimension: "Plan",
    is_required: true,
    tc_mapping_code: 1808,
    aggregate: "",
    formatter: "",
    is_row_span: false,
    footer: "",
    is_searchable: false,
    extra: {},
    is_sortable: false,
    disableSortBy: true,
  },
  {
    column_name: "Range",
    label: "Range",
    is_frozen: false,
    is_hidden: false,
    is_editable: true,
    is_aggregated: false,
    type: "dollar",
    order_of_display: 2,
    footer: "",
    is_row_span: false,
    formatter: "roundOff",
    is_searchable: false,
    enableColumnExpand: true,
    sub_headers: [
      {
        column_name: "min",
        label: "Min",
        is_frozen: false,
        is_hidden: false,
        is_editable: true,
        is_aggregated: false,
        type: "int",
        order_of_display: 1,
        footer: "",
        is_row_span: false,
        formatter: "roundOff",
        is_searchable: false,
        enableColumnExpand: false,
        sub_headers: [],
        disableSortBy: true,
        is_lockable: false,
      },
      {
        column_name: "max",
        label: "Max",
        is_frozen: false,
        is_hidden: false,
        is_editable: true,
        is_aggregated: false,
        type: "int",
        order_of_display: 2,
        footer: "",
        is_row_span: false,
        formatter: "roundOff",
        is_searchable: false,
        enableColumnExpand: false,
        sub_headers: [],
        disableSortBy: true,
        is_lockable: false,
      },
    ],
    disableSortBy: true,
  },
  {
    sub_headers: [],
    tc_code: 69,
    column_name: "action",
    type: "delete_icon",
    label: "",
    is_frozen: false,
    is_hidden: false,
    is_editable: true,
    is_aggregated: false,
    order_of_display: 3,
    dimension: "other",
    is_required: true,
    tc_mapping_code: 1808,
    aggregate: "",
    formatter: "",
    is_row_span: false,
    footer: "",
    is_searchable: false,
    extra: {},
    is_sortable: false,
    disableSortBy: true,
    suppressMenu: true,
    lockPosition: "right",
  },
];

const metricList = [
  {
    value: "qty",
    label: "Sales Units",
  },
  {
    value: "aur",
    label: "AUR",
  },
  {
    value: "auc",
    label: "AUC",
  },
  {
    value: "bop_auc",
    label: "BOP AUC",
  },
  {
    value: "margin_per",
    label: "Gross Margin %",
  },
  {
    value: "rcpt_units",
    label: "Receipt Units",
  },
];
