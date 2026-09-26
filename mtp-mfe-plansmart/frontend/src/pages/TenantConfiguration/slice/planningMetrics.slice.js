import { createSelector, createSlice } from "@reduxjs/toolkit";
import {
  PLANSMART_EDITABLE_METRICS_TENANT_CONFIG,
  PLANSMART_EDITABLE_METRICS_TENANT_CONFIG_SAVE,
  PLANSMART_EDITABLE_METRIC_TENANT_CONFIG_TABLE_COL_DEF,
  TABLE_DATA_ERROR,
  METRICS_DATA_SAVED,
  TABLE_SAVE_ERROR,
  TABLE_HEADER_ERROR
} from "../tenantConfiguration.constant";
import axiosInstance from "../../../core/Utils/axios/index";
import { SNACK_VARIANT } from "../../../constants/toast.constant";
import { addSnack } from "actions/snackbarActions";

const planningMetrics = createSlice({
  name: "editableMetricTenant",
  initialState: {
    tableDataLoader: false,
    saveDataLoader: false,
    tableColDefLoader: false,
    editableMetricTableData: [],
    saveEditableMetric: {},
    editableMetricTableColDef: []
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
    }
  }
});

export const {
  setTableDataLoader,
  setSaveDataLoader,
  setTableColDefLoader,
  setEditableMetricTableData,
  setSaveEditableMetric,
  setEditableMetricTableColDef
} = planningMetrics.actions;

export const fetchEditableMetricConfigData = (payload) => async (dispatch) => {
  dispatch(setTableDataLoader(true));
  try {
    const { data } = await axiosInstance({
      url: PLANSMART_EDITABLE_METRICS_TENANT_CONFIG,
      method: "POST",
      data: payload
    });
    if (data.status) {
      dispatch(setEditableMetricTableData(data.data));
    } else {
      addSnack({
        message: TABLE_DATA_ERROR,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      });
    }
  } catch (error) {
    dispatch(setEditableMetricTableData([]));
    addSnack({
      message: TABLE_DATA_ERROR,
      options: {
        variant: SNACK_VARIANT.ERROR
      }
    });
  }
  dispatch(setTableDataLoader(false));
};

export const saveEditableMetricConfig = (updatePayload, fetchPayload) => async (
  dispatch
) => {
  dispatch(setSaveDataLoader(true));
  try {
    const { data } = await axiosInstance({
      url: PLANSMART_EDITABLE_METRICS_TENANT_CONFIG_SAVE,
      method: "POST",
      data: updatePayload
    });
    if (data.status) {
      dispatch(
        addSnack({
          message: METRICS_DATA_SAVED,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      dispatch(setSaveEditableMetric(data));
      dispatch(fetchEditableMetricConfigData(fetchPayload));
    } else {
      dispatch(
        addSnack({
          message: TABLE_SAVE_ERROR,
          options: {
            variant: SNACK_VARIANT.ERROR
          }
        })
      );
      dispatch(setSaveEditableMetric([]));
    }
  } catch (error) {
    addSnack({
      message: TABLE_SAVE_ERROR,
      options: {
        variant: SNACK_VARIANT.ERROR
      }
    });
    dispatch(setSaveEditableMetric([]));
  }
  dispatch(setSaveDataLoader(false));
};

export const fetchEditableMetricTenantTableColDef = () => async (dispatch) => {
  dispatch(setTableColDefLoader(true));
  try {
    const { data } = await axiosInstance({
      url: PLANSMART_EDITABLE_METRIC_TENANT_CONFIG_TABLE_COL_DEF,
      method: "GET"
    });
    if (data.status) {
      dispatch(setEditableMetricTableColDef(data.data));
    } else {
      addSnack({
        message: TABLE_HEADER_ERROR,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      });
      dispatch(setEditableMetricTableColDef([]));
    }
  } catch (error) {
    dispatch(setEditableMetricTableColDef([]));
    addSnack({
      message: TABLE_HEADER_ERROR,
      options: {
        variant: SNACK_VARIANT.ERROR
      }
    });
  }
  dispatch(setTableColDefLoader(false));
};

export const planSmartTenantConfigSelector = createSelector(
  (state) => state,
  (state) => {
    state.plansmartReducer.planningMetrics;
  }
);

export const editableMetricTenantSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.planningMetrics
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
