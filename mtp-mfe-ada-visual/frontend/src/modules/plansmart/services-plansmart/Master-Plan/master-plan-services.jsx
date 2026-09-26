import { createSelector, createSlice } from "@reduxjs/toolkit";
import { addSnack } from "core/actions/snackbarActions";
import { isObject, get, cloneDeep } from "lodash";
import {
  getColumns,
  parseBudgetTableResponseData,
  setInputFormatForColumn,
} from "modules/plansmart/pages-plansmart/plansmart-budget-table/budget-table-functions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  PLANSMART_MASTER_PLAN_FILTER_CONFIG,
  PLANSMART_MASTER_PLAN_COLUMN_CONF,
  PLANSMART_MASTER_PLAN_TABLE_DATA,
  PLANSMART_MASTER_PLAN_LOCK_PLAN,
  PLANSMART_MASTER_PLAN_APPROVE_PLAN,
  PLANSMART_MASTER_PLAN_HISTORY_COL_DEF,
  PLANSMART_MASTER_PLAN_HISTORY_HISTORY_DATA,
} from "../../constants-plansmart/apiConstants";
import {
  fetchFormulasForEditableMetrics,
  getPlanningTableColumns,
} from "../BudgetPlanTable/budget-plan-table-service";
import { DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT, showSnackMessage } from "modules/plansmart/utils-plansmart/snackMessage";

const initialState = {
  masterPlanFilterLoader: false,
  masterPlanTableLoader: false,
  columnDefLoader: false,
  metricFormulaLoader: false,
  filteredDataLoader: false,
  approveLoader: false,
  lockLoader: false,
  dimensionUpdateLoader: false,
  approveAccess: false,
  lockAccess: false,
  approveStatus: false,
  lockStatus: false,
  tableData: [],
  columnDefData: [],
  metricFormula: {},
  filteredData: {},
  persistFilter: {},
  historyColDefLoader: false,
  historyDataLoader: false,
  historyColDef: [],
  historyData: [],
};

export const masterPlanDashboardService = createSlice({
  name: "masterPlanDashboardService",
  initialState,
  reducers: {
    setMasterPlanFilterLoader: (state, action) => {
      state.masterPlanFilterLoader = action.payload;
    },
    setMasterPlanTableLoader: (state, action) => {
      state.masterPlanTableLoader = action.payload;
    },
    setMasterPlanColumnDefLoader: (state, action) => {
      state.columnDefLoader = action.payload;
    },
    setMasterPlanMetricFormulaLoader: (state, action) => {
      state.metricFormulaLoader = action.payload;
    },
    setMasterPlanFilteredDataLoader: (state, action) => {
      state.filteredDataLoader = action.payload;
    },
    setMasterPlanApproveLoader: (state, action) => {
      state.approveLoader = action.payload;
    },
    setMasterPlanLockLoader: (state, action) => {
      state.lockLoader = action.payload;
    },
    setMasterPlanApproveAccess: (state, action) => {
      state.approveAccess = action.payload;
    },
    setMasterPlanLockAccess: (state, action) => {
      state.lockAccess = action.payload;
    },
    setMasterPlanApproveStatus: (state, action) => {
      state.approveStatus = action.payload;
    },
    setMasterPlanLockStatus: (state, action) => {
      state.lockStatus = action.payload;
    },
    setMasterPlanTableData: (state, action) => {
      state.tableData = action.payload;
    },
    setMasterPlanColumnDefData: (state, action) => {
      state.columnDefData = action.payload;
    },
    setMasterPlanMetricFormula: (state, action) => {
      state.metricFormula = action.payload;
    },
    setMasterPlanFilteredData: (state, action) => {
      state.filteredData = action.payload;
    },
    setMasterPlanPersistFilter: (state, action) => {
      state.persistFilter = action.payload;
    },
    setDimensionUpdateLoader: (state, action) => {
      state.dimensionUpdateLoader = action.payload;
    },
    setMasterPlanHistoryColDefLoader: (state, action) => {
      state.historyColDefLoader = action.payload;
    },
    setMasterPlanHistoryDataLoader: (state, action) => {
      state.historyDataLoader = action.payload;
    },
    setMasterPlanHistoryColDef: (state, action) => {
      state.historyColDef = action.payload;
    },
    setMasterPlanHistoryData: (state, action) => {
      state.historyData = action.payload;
    },
    clearMasterPlanAllData: () => initialState,
  },
});

// Action creators are generated for each case reducer function
export const {
  setMasterPlanFilterLoader,
  setMasterPlanTableLoader,
  setMasterPlanColumnDefLoader,
  setMasterPlanMetricFormulaLoader,
  setMasterPlanFilteredDataLoader,
  setMasterPlanApproveLoader,
  setMasterPlanLockLoader,
  setDimensionUpdateLoader,
  setMasterPlanApproveAccess,
  setMasterPlanLockAccess,
  setMasterPlanApproveStatus,
  setMasterPlanLockStatus,
  setMasterPlanTableData,
  setMasterPlanColumnDefData,
  setMasterPlanMetricFormula,
  setMasterPlanFilteredData,
  clearMasterPlanAllData,
  setMasterPlanPersistFilter,
  setMasterPlanHistoryColDefLoader,
  setMasterPlanHistoryDataLoader,
  setMasterPlanHistoryColDef,
  setMasterPlanHistoryData,
} = masterPlanDashboardService.actions;

export const getMasterPlanFilterConfiguration = () => () => {
  return axiosInstance({
    url: PLANSMART_MASTER_PLAN_FILTER_CONFIG,
    method: "GET",
  });
};

export const fetchMasterPlanTableData = (postBody) => async () => {
  return axiosInstance({
    url: PLANSMART_MASTER_PLAN_TABLE_DATA,
    method: "POST",
    data: postBody,
    isV3: true,
  });
};

export const fetchMasterPlanFormula = () => async (dispatch) => {
  dispatch(setMasterPlanMetricFormulaLoader(true));
  try {
    const response = await fetchFormulasForEditableMetrics()();
    if (response.data.status) {
      dispatch(setMasterPlanMetricFormula(response.data.data));
    } else {
      dispatch(setMasterPlanMetricFormula({}));
    }
  } catch (error) {
    dispatch(setMasterPlanMetricFormula({}));
  } finally {
    dispatch(setMasterPlanMetricFormulaLoader(false));
  }
};

//TODO: need to remove after report screen
export const fetchMasterPlanTableColumnsDef = (
  metrics_with_formatter,
  planCode
) => async (dispatch, getStore) => {
  const store = getStore();
  dispatch(setMasterPlanColumnDefLoader(true));
  try {
    const response = await getPlanningTableColumns(planCode, "view")();
    if (response.data.status) {
      const metricFormula = masterPlanMetricFormulaSelector(store);
      const colDefData = (response.data.data || []).map((item) => {
        item.width = 90;
        if (item.column_name === "total") {
          item.Cell = (cellProps) => {
            let inputAttribute = setInputFormatForColumn(
              metrics_with_formatter,
              cellProps,
              true
            );
            if (cellProps.value) {
              return inputAttribute === "%"
                ? `${Math.round(cellProps.value * 100) / 100} ${inputAttribute}`
                : `${inputAttribute} ${
                    Math.round(cellProps.value * 100) / 100
                  }`;
            } else if (cellProps.value === 0) {
              return inputAttribute === "%"
                ? `${cellProps.value} ${inputAttribute}`
                : `${cellProps.value}`;
            } else {
              return " ";
            }
          };
        }
        return item;
      });
      const withTotalCal = getColumns({
        planBudgetColumn: colDefData,
        weekAggregationFormula: metricFormula,
        isMasterPlanColumns: true,
      });
      dispatch(setMasterPlanColumnDefData(withTotalCal));
    } else {
      dispatch(showSnackMessage(response.message || DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, response));
      dispatch(setMasterPlanColumnDefData([]));
      dispatch(setMasterPlanTableData([]));
    }
  } catch (error) {
    dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, error?.response));
    dispatch(setMasterPlanColumnDefData([]));
    dispatch(setMasterPlanTableData([]));
  } finally {
    dispatch(setMasterPlanColumnDefLoader(false));
  }
};

export const fetchMasterPlanFilteredData = (
  metrics_with_formatter,
  defaultMetrics,
  defaultBucket,
  weekAggregationFormula,
  totalBucketAggregrationFormulas,
  firstLastBucketTotalColumn,
  body,
  filterObj
) => async (dispatch, getStore) => {
  const store = getStore();

  dispatch(setMasterPlanFilteredDataLoader(true));

  try {
    const response = await fetchMasterPlanTableData(body)();
    if (response.data.status) {
      dispatch(
        setMasterPlanPersistFilter({ formattedFilter: body, filter: filterObj })
      );
      const responseData = get(response, "data.data", {});

      let isMonthView = false;
      const showMonthView = get(
        store,
        "plansmartReducer.planBudgetTableReducer.plansmartConfigs.showMonthView"
      );
      const plansmartConfigs = get(
        store,
        "plansmartReducer.planBudgetTableReducer.plansmartConfigs",
        {}
      );

      if (showMonthView) {
        Object.keys(showMonthView).map((id) => {
          if (responseData[id] === showMonthView[id]) {
            isMonthView = true;
          }
        });
      }
      const columnDef = get(responseData, "column", []);
      dispatch(setMasterPlanFilteredData(responseData));
      const parsedTableData = parseBudgetTableResponseData(
        defaultMetrics,
        defaultBucket,
        responseData,
        {},
        []
      );
      dispatch(setMasterPlanTableData(parsedTableData));
      dispatch(setMasterPlanApproveAccess(responseData.approve_access));
      dispatch(setMasterPlanLockAccess(responseData.lock_access));
      dispatch(setMasterPlanApproveStatus(responseData.approve_status));
      dispatch(setMasterPlanLockStatus(responseData.lock_status));

      // Column configuration
      //TODO: need to create common function for both budget table and master plan table
      const metricFormula = masterPlanMetricFormulaSelector(store);
      const colDefData = cloneDeep(columnDef || []).map((item) => {
        item.width = 90;
        if (item.column_name === "total") {
          item.Cell = (cellProps) => {
            let inputAttribute = setInputFormatForColumn(
              metrics_with_formatter,
              cellProps,
              true
            );
            if (cellProps.value) {
              return inputAttribute === "%"
                ? `${Math.round(cellProps.value * 100) / 100} ${inputAttribute}`
                : `${inputAttribute} ${
                    Math.round(cellProps.value * 100) / 100
                  }`;
            } else if (cellProps.value === 0) {
              return inputAttribute === "%"
                ? `${cellProps.value} ${inputAttribute}`
                : `${cellProps.value}`;
            } else {
              return " ";
            }
          };
        }
        return item;
      });
      const withTotalCal = getColumns({
        weekAggregationFormula: weekAggregationFormula,
        totalBucketAggregrationFormulas: totalBucketAggregrationFormulas,
        firstLastBucketTotalColumn: firstLastBucketTotalColumn,
        planBudgetColumn: colDefData,
        metricFormula: metricFormula,
        isMonthView: isMonthView,
        bucket_keys: responseData.buckets_v1,
        isMasterPlanColumns: true,
        plansmartConfigs: plansmartConfigs,
      });
      dispatch(setMasterPlanColumnDefData(withTotalCal));
    } else {
      dispatch(setMasterPlanTableData([]));
      dispatch(setMasterPlanColumnDefData([]));
      dispatch(setMasterPlanApproveAccess(false));
      dispatch(setMasterPlanLockAccess(false));
      dispatch(setMasterPlanApproveStatus(false));
      dispatch(setMasterPlanLockStatus(false));
      dispatch(setMasterPlanPersistFilter({}));
      dispatch(showSnackMessage(response.message || DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, response));
    }
  } catch (error) {
    dispatch(setMasterPlanTableData([]));
    dispatch(setMasterPlanColumnDefData([]));
    dispatch(setMasterPlanApproveAccess(false));
    dispatch(setMasterPlanLockAccess(false));
    dispatch(setMasterPlanApproveStatus(false));
    dispatch(setMasterPlanLockStatus(false));
    dispatch(setMasterPlanPersistFilter({}));
    dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, error?.response));
  } finally {
    dispatch(setMasterPlanFilteredDataLoader(false));
  }
};

export const masterPlanLockApi = (seasonType) => async (dispatch, getStore) => {
  const store = getStore();
  const lockStatus = masterPlanLockStatusSelector(store);
  const approveAccess = masterPlanApproveAccessSelector(store);
  const persistFilter = masterPlanPersistFilterSelector(store);

  dispatch(setMasterPlanLockLoader(true));

  try {
    const response = await axiosInstance({
      url: PLANSMART_MASTER_PLAN_LOCK_PLAN,
      method: "POST",
      data: {
        lock_status: !lockStatus,
        season_type: seasonType,
        ...(persistFilter?.formattedFilter || {}),
      },
    });
    if (response.data.status) {
      dispatch(setMasterPlanLockStatus(response.data?.data?.lock_status));
      if (approveAccess) {
        dispatch(
          setMasterPlanApproveStatus(response.data?.data?.approve_status)
        );
      }
      dispatch(showSnackMessage(response.data.message, SNACK_VARIANT.SUCCESS, response));
    } else {
      dispatch(showSnackMessage(
          response.data.message || DEFAULT_SNACK_ERROR_MESSAGE,
          SNACK_VARIANT.FAILURE,
          response
      ));
    }
  } catch (error) {
    dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, error?.response));
  } finally {
    dispatch(setMasterPlanLockLoader(false));
  }
};

export const masterPlanApproveApi = () => async (dispatch, getStore) => {
  dispatch(setMasterPlanApproveLoader(true));

  const store = getStore();
  const persistFilter = masterPlanPersistFilterSelector(store);
  const lockAccess = masterPlanLockAccessSelector(store);

  try {
    const response = await axiosInstance({
      url: PLANSMART_MASTER_PLAN_APPROVE_PLAN,
      method: "POST",
      data: persistFilter?.formattedFilter || {},
      isV3: true,
    });
    if (response.data.status) {
      dispatch(setMasterPlanApproveStatus(response.data?.data?.approve_status));
      if (lockAccess) {
        dispatch(setMasterPlanLockStatus(response.data?.data?.lock_status));
      }
      dispatch(showSnackMessage("Plan Approved successfully", SNACK_VARIANT.SUCCESS, response));
    } else {
      dispatch(showSnackMessage("Error while approving a plan", SNACK_VARIANT.ERROR, response));
    }
  } catch (error) {
    dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, error?.response));
  } finally {
    dispatch(setMasterPlanApproveLoader(false));
  }
};

export const fetchMasterPlanHistoryColDef = () => async (dispatch) => {
  dispatch(setMasterPlanHistoryColDef([]));

  try {
    dispatch(setMasterPlanHistoryColDefLoader(true));
    const response = await axiosInstance({
      url: PLANSMART_MASTER_PLAN_HISTORY_COL_DEF,
    });
    if (response.data.status) {
      dispatch(
        setMasterPlanHistoryColDef(agGridColumnFormatter(response.data.data))
      );
    } else {
      dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, response));
    }
  } catch (error) {
    dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, error?.response));
  } finally {
    dispatch(setMasterPlanHistoryColDefLoader(false));
  }
};

export const fetchMasterPlanHistoryData = () => async (dispatch) => {
  dispatch(setMasterPlanHistoryData([]));

  try {
    dispatch(setMasterPlanHistoryDataLoader(true));
    const response = await axiosInstance({
      url: PLANSMART_MASTER_PLAN_HISTORY_HISTORY_DATA,
    });
    if (response.data.status) {
      dispatch(setMasterPlanHistoryData(response.data.data));
    } else {
      dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, response));
    }
  } catch (error) {
    dispatch(showSnackMessage(DEFAULT_SNACK_ERROR_MESSAGE, SNACK_VARIANT.ERROR, error?.response));
  } finally {
    dispatch(setMasterPlanHistoryDataLoader(false));
  }
};

export const masterPlanSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.masterPlanReducer
);

export const masterPlanFilterLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanFilterLoader", false)
);

export const masterPlanTableLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "masterPlanTableLoader", false)
);

export const masterPlanColDefLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "columnDefLoader", false)
);
export const masterPlanMetricFormulaLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "metricFormulaLoader", false)
);
export const masterPlanFilteredDataLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "filteredDataLoader", false)
);

export const masterPlanApproveLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "approveLoader", false)
);

export const masterPlanLockLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "lockLoader", false)
);

export const dimensionUpdateLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "dimensionUpdateLoader", false)
);

export const masterPlanApproveAccessSelector = createSelector(
  masterPlanSelector,
  (state) => state.approveAccess
);

export const masterPlanLockAccessSelector = createSelector(
  masterPlanSelector,
  (state) => state.lockAccess
);

export const masterPlanApproveStatusSelector = createSelector(
  masterPlanSelector,
  (state) => state.approveStatus
);

export const masterPlanLockStatusSelector = createSelector(
  masterPlanSelector,
  (state) => state.lockStatus
);

export const masterPlanTableDataSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "tableData", [])
);

export const masterPlanColumnDefDataSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "columnDefData", [])
);

export const masterPlanMetricFormulaSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "metricFormula", [])
);

export const masterPlanFilteredDataSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "filteredData", {})
);

export const masterPlanPersistFilterSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "persistFilter", [])
);

export const masterPlanHistoryColDefLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyColDefLoader", false)
);

export const masterPlanHistoryDataLoaderSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyDataLoader", false)
);

export const masterPlanHistoryColDefSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyColDef", [])
);

export const masterPlanHistoryDataSelector = createSelector(
  masterPlanSelector,
  (state) => get(state, "historyData", [])
);

export default masterPlanDashboardService.reducer;
