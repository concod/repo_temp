import { createSelector, createSlice } from "@reduxjs/toolkit";
// import {
//   PLANSMART_EDITABLE_METRICS_TENANT_CONFIG,
//   PLANSMART_EDITABLE_METRICS_TENANT_CONFIG_SAVE,
//   PLANSMART_EDITABLE_METRIC_TENANT_CONFIG_TABLE_COL_DEF,
// } from "modules/plansmart/constants-plansmart/apiConstants";
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

// export const fetchEditableMetricConfigData = () => async (dispatch) => {
//   dispatch(setTableDataLoader(true));
//   try {
//     const { data } = await axiosInstance({
//       url: PLANSMART_EDITABLE_METRICS_TENANT_CONFIG,
//       method: "GET",
//     });
//     if (data.status) {
//       dispatch(setEditableMetricTableData(data.data));
//     } else {
//       dispatch(showSnackMessages(
//         "Error while fetching editable configuration data",
//         "error",
//         data,
//       ));
//     }
//   } catch (error) {
//     dispatch(setEditableMetricTableData({}));
//     dispatch(showSnackMessages(
//       "Error while fetching editable configuration data",
//       "error",
//       error,
//     ));
//   }
//   dispatch(setTableDataLoader(false));
// };

// export const saveEditableMetricConfig = (payload) => async (dispatch) => {
//   dispatch(setSaveDataLoader(true));
//   try {
//     const { data } = await axiosInstance({
//       url: PLANSMART_EDITABLE_METRICS_TENANT_CONFIG_SAVE,
//       method: "PUT",
//       data: payload,
//     });
//     if (data.status) {
//       dispatch(showSnackMessages(
//         "Metrics saved successfully",
//         "success",
//         data,
//       ));
//       dispatch(setSaveEditableMetric(data));
//       dispatch(fetchEditableMetricConfigData());
//     } else {
//       dispatch(showSnackMessages(
//         "Error while saving metric configuration",
//         "error",
//         data,
//       ));
//       dispatch(setSaveEditableMetric({}));
//     }
//   } catch (error) {
//     dispatch(showSnackMessages(
//       "Error while saving metric configuration",
//       "error",
//       error,
//     ));
//     dispatch(setSaveEditableMetric({}));
//   }
//   dispatch(setSaveDataLoader(false));
// };

// export const fetchEditableMetricTenantTableColDef = () => async (dispatch) => {
//   dispatch(setTableColDefLoader(true));
//   try {
//     const { data } = await axiosInstance({
//       url: PLANSMART_EDITABLE_METRIC_TENANT_CONFIG_TABLE_COL_DEF,
//       method: "GET",
//     });
//     if (data.status) {
//       dispatch(setEditableMetricTableColDef(data.data));
//     } else {
//       dispatch(showSnackMessages(
//         "Error while fetching column details",
//         "error",
//         data,
//       ));
//       dispatch(setEditableMetricTableColDef([]));
//     }
//   } catch (error) {
//     dispatch(setEditableMetricTableColDef([]));
//     dispatch(showSnackMessages(
//       "Error while fetching column details",
//       "error",
//       error,
//     ));
//   }
//   dispatch(setTableColDefLoader(false));
// };

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
