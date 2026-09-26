import { createSelector, createSlice } from "@reduxjs/toolkit";
import { addSnack } from "core/actions/snackbarActions";
import { generateSnackMessages } from "modules/plansmart/pages-plansmart/CommonDashboard/functionsForPlansmartDashboard";
import {
  PLANSMART_EDITABLE_METRICS_TENANT_CONFIG,
  PLANSMART_EDITABLE_METRICS_TENANT_CONFIG_SAVE,
  PLANSMART_EDITABLE_METRIC_TENANT_CONFIG_TABLE_COL_DEF,
} from "modules/plansmart/constants-plansmart/apiConstants";
import axiosInstance from "../../Utils/axios/index";

const planningMetrics = createSlice({
  name: "editableMetricTenant",
  initialState: {
    tableDataLoader: false,
    saveDataLoader: false,
    tableColDefLoader: false,
    editableMetricTableData: {},
    saveEditableMetric: {},
    editableMetricTableColDef: [],
  },
  reducers: {
    setTableDataLoader: (state, action) => {
      state.tableDataLoader = action.payload;
    },
    setSaveDataLoader: (state, action) => {
      state.saveDataLoader = action.payload;
    },
    setTableColDefLoader: (state, action) => {
      state.tableColDefLoader = action.payload;
    },
    setEditableMetricTableData: (state, action) => {
      state.editableMetricTableData = action.payload;
    },
    setSaveEditableMetric: (state, action) => {
      state.saveEditableMetric = action.payload;
    },
    setEditableMetricTableColDef: (state, action) => {
      state.editableMetricTableColDef = action.payload;
    },
  },
});

export const {
  setTableDataLoader,
  setSaveDataLoader,
  setTableColDefLoader,
  setEditableMetricTableData,
  setSaveEditableMetric,
  setEditableMetricTableColDef,
} = planningMetrics.actions;

export const fetchEditableMetricConfigData = () => async (dispatch) => {
  const snackBarWithDispatch = (config) => dispatch(addSnack(config));
  dispatch(setTableDataLoader(true));
  try {
    const { data } = await axiosInstance({
      url: PLANSMART_EDITABLE_METRICS_TENANT_CONFIG,
      method: "GET",
    });
    if (data.status) {
      dispatch(setEditableMetricTableData(data.data));
    } else {
      generateSnackMessages(
        "Error while fetching editable configuration data",
        "error",
        snackBarWithDispatch
      );
    }
  } catch (error) {
    dispatch(setEditableMetricTableData({}));
    generateSnackMessages(
      "Error while fetching editable configuration data",
      "error",
      snackBarWithDispatch
    );
  }
  dispatch(setTableDataLoader(false));
};

export const saveEditableMetricConfig = (payload) => async (dispatch) => {
  const snackBarWithDispatch = (config) => dispatch(addSnack(config));

  dispatch(setSaveDataLoader(true));
  try {
    const { data } = await axiosInstance({
      url: PLANSMART_EDITABLE_METRICS_TENANT_CONFIG_SAVE,
      method: "PUT",
      data: payload,
    });
    if (data.status) {
      generateSnackMessages(
        "Metrics saved successfully",
        "success",
        snackBarWithDispatch
      );
      dispatch(setSaveEditableMetric(data));
      dispatch(fetchEditableMetricConfigData());
    } else {
      generateSnackMessages(
        "Error while saving metric configuration",
        "error",
        snackBarWithDispatch
      );
      dispatch(setSaveEditableMetric({}));
    }
  } catch (error) {
    generateSnackMessages(
      "Error while saving metric configuration",
      "error",
      snackBarWithDispatch
    );
    dispatch(setSaveEditableMetric({}));
  }
  dispatch(setSaveDataLoader(false));
};

export const fetchEditableMetricTenantTableColDef = () => async (dispatch) => {
  const snackBarWithDispatch = (config) => dispatch(addSnack(config));
  dispatch(setTableColDefLoader(true));
  try {
    const { data } = await axiosInstance({
      url: PLANSMART_EDITABLE_METRIC_TENANT_CONFIG_TABLE_COL_DEF,
      method: "GET",
    });
    if (data.status) {
      dispatch(setEditableMetricTableColDef(data.data));
    } else {
      generateSnackMessages(
        "Error while fetching column details",
        "error",
        snackBarWithDispatch
      );
      dispatch(setEditableMetricTableColDef([]));
    }
  } catch (error) {
    dispatch(setEditableMetricTableColDef([]));
    generateSnackMessages(
      "Error while fetching column details",
      "error",
      snackBarWithDispatch
    );
  }
  dispatch(setTableColDefLoader(false));
};

// Selectors

export const planSmartTenantConfigSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.tenantConfigs
);

export const editableMetricTenantSelector = createSelector(
  planSmartTenantConfigSelector,
  (state) => state.planningMetrics
);

export const editableMetricTenantTableDataSelector = createSelector(
  editableMetricTenantSelector,
  (state) => state.editableMetricTableData
);
export const editableMetricTenantTableColDefDataSelector = createSelector(
  editableMetricTenantSelector,
  (state) => state.editableMetricTableColDef
);

export const editableMetricTenantTableLoader = createSelector(
  editableMetricTenantSelector,
  (state) => state.tableDataLoader
);

export const editableMetricTenantSaveLoader = createSelector(
  editableMetricTenantSelector,
  (state) => state.saveDataLoader
);

export const editableMetricTenantTableColDefLoader = createSelector(
  editableMetricTenantSelector,
  (state) => state.tableColDefLoader
);

export default planningMetrics.reducer;
