import { createSelector, createSlice } from "@reduxjs/toolkit";
import { addSnack } from "core/actions/snackbarActions";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  PLANSMART_BUDGET_PLAN_DETAILS,
  PLANSMART_BUDGETTABLE_PLANCODE_DETAILS,
  PLANSMART_PLANNING_COLUMN_CONF,
  PLANSMART_PLAN_HIERARCHIES,
  PLANSMART_PLAN_FILTER_OPTIONS,
  PLANSMART_FORECASTED_DATA,
  PLANSMART_UPDATE_BUDGET_TABLE,
  PLANSMART_SAVE_PLAN,
  PLANSMART_PLAN_METRIC_CONFIG,
  PLANSMART_PIVOT_VIEW_DATA,
  PLANSMART_PIVOT_VIEW_COL_DEF,
  PLANSMART_UPDATE_BUDGET_TABLE_MATCH_WITH,
  PLANSMART_PIVOT_VIEW_SAVE_TEMPLATE,
  PLANSMART_SKU_VIEW_DATA,
  PLANSMART_EDITABLE_METRIC_FETCH_FORMULA,
  PLANSMART_SAVE_SCENARIO_PLAN,
  PLANSMART_VERSION_LIST,
  PLANSMART_SKU_COL_DEF,
  PLANSMART_CONSTRAINT_FILTER,
  PLANSMART_UPDATE_SKUS,
  PLANSMART_MATCH_WITH_CONFIG,
  PLANSMART_EOP_VAL_API,
  PLANSMART_EDIT_PLAN_DISPLAY_NAME,
} from "../../constants-plansmart/apiConstants";
import { GET_TENANT_CONFIG } from "../../../../config/api";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { skudata } from "./skudata";
import { get } from "lodash";
import { callbackFetchFnc } from "modules/plansmart/utils-plansmart/ConstantFunctions";

export const planSmartBudgetTableLoader = createSlice({
  name: "planSmartBudgetTable",
  initialState: {
    plansmartBudgetTableLoader: false,
    planSmartBudgetFilterLoader: false,
    planSmartBudgetUpdateLoader: false,
    planSmartSavePlanLoader: false,
    planSmartSavePivotViewLoader: false,
    planSmartUpdateBudgetTableMatchLoader: false,
    planSmartBudgetTableColDefLoader: false,
    planSmartSaveScenarioNameLoader: false,
    planSmartMetricFormulaLoader: false,
    planSmartPivotLoader: false,
    planSmartMetricDataLoader: false,
    planSmartPivotViewDataLoader: false,
    planSmartPivotViewColDefLoader: false,
    planSmartMatchWithKpiListLoader: false,
    planSmartEopValLoader: false,
    editableMetricFormulas: {},
    plansmartConfigs: {},
    metricData: {},
    pivotViewData: [],
    pivotViewColDef: [],
    matchWithKpiList: [],
    eopVal: {},
    plansmartPlanDisplayNameEditLoader: false,
  },
  reducers: {
    setPlansmartBudgetTableLoader: (state, action) => {
      state.plansmartBudgetTableLoader = action.payload;
    },
    setPlansmartBudgetUpdateLoader: (state, action) => {
      state.planSmartBudgetUpdateLoader = action.payload;
    },
    setPlansmartBudgetFilterLoader: (state, action) => {
      state.planSmartBudgetFilterLoader = action.payload;
    },
    setPlanSmartSavePlanLoader: (state, action) => {
      state.planSmartSavePlanLoader = action.payload;
    },
    setPlanSmartSavePivotViewLoader: (state, action) => {
      state.planSmartSavePivotViewLoader = action.payload;
    },
    setPlanSmartUpdateBudgetTableMatchLoader: (state, action) => {
      state.planSmartUpdateBudgetTableMatchLoader = action.payload;
    },
    setPlanSmartBudgetTableColDefLoader: (state, action) => {
      state.planSmartBudgetTableColDefLoader = action.payload;
    },
    setEditableMetricsFormula: (state, action) => {
      state.editableMetricFormulas = action.payload;
    },
    setPlanSmartMetricFormulaLoader: (state, action) => {
      state.planSmartMetricFormulaLoader = action.payload;
    },
    setPlanSmartSaveScenarioNameLoader: (state, action) => {
      state.planSmartSaveScenarioNameLoader = action.payload;
    },
    setPlanSmartPivotLoader: (state, action) => {
      state.planSmartPivotLoader = action.payload;
    },
    setPlansmartConfigs: (state, action) => {
      state.plansmartConfigs = { ...state.plansmartConfigs, ...action.payload };
    },
    setPlanSmartMetricDataLoader: (state, action) => {
      state.planSmartMetricDataLoader = action.payload;
    },
    setPlanSmartMetricData: (state, action) => {
      state.metricData = action.payload;
    },
    setPlanSmartPivotViewDataLoader: (state, action) => {
      state.planSmartPivotViewDataLoader = action.payload;
    },
    setPlanSmartPivotViewColDefLoader: (state, action) => {
      state.planSmartPivotViewColDefLoader = action.payload;
    },
    setPlanSmartEopValLoader: (state, action) => {
      state.planSmartEopValLoader = action.payload;
    },
    setPlanSmartPivotViewData: (state, action) => {
      state.pivotViewData = action.payload;
    },
    setPlanSmartPivotViewColDef: (state, action) => {
      state.pivotViewColDef = action.payload;
    },
    setPlanSmartMatchWithKpiList: (state, action) => {
      state.matchWithKpiList = action.payload;
    },
    setPlanSmartMatchWithKpiListLoader: (state, action) => {
      state.planSmartMatchWithKpiListLoader = action.payload;
    },
    setPlanSmartEopVal: (state, action) => {
      state.eopVal = action.payload;
    },
    setPlansmartPlanDisplayNameEditLoader: (state, action) => {
      state.plansmartPlanDisplayNameEditLoader = action.payload;
    },
  },
});

export const planSmartBudgetTableSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.planBudgetTableReducer
);
export const planBudgetTableLoader = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planBudgetTableLoader
);

export const planSmartBudgetUpdateLoader = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartBudgetUpdateLoader
);

export const plansmartBudgetFilterLoader = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.plansmartBudgetFilterLoader
);

export const planSmartSavePlanLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartSavePlanLoader
);

export const planSmartSavePivotViewLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartSavePivotViewLoader
);

export const planSmartBudgetTableColDefLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartBudgetTableColDefLoader
);

export const planSmartSaveScenarioNameLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartSaveScenarioNameLoader
);

export const planSmartMetricFormulaLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartMetricFormulaLoader
);

export const planSmartPivotLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartPivotLoader
);

export const planSmartConfigSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.plansmartConfigs
);
export const planSmartPivotViewColDefLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartPivotViewColDefLoader
);

export const planSmartPivotViewDataLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartPivotViewDataLoader
);

export const planSmartPivotViewColDefSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.pivotViewColDef
);

export const planSmartPivotViewDataSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.pivotViewData
);

export const planSmartMetricDataLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartMetricDataLoader
);

export const planSmartMetricListSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.metricData
);

export const planSmartMatchWithKpiListLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.planSmartMatchWithKpiListLoader
);

export const planSmartMatchWithKpiListSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.matchWithKpiList
);

export const planSmartLastOfEopValSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.eopVal
);

export const plansmartPlanDisplayNameEditLoaderSelector = createSelector(
  planSmartBudgetTableSelector,
  (state) => state.plansmartPlanDisplayNameEditLoader
);

export const planSmartFormattedMetricListSelector = createSelector(
  planSmartMetricListSelector,
  (metricData) => {
    const result = [];
    Object.keys(metricData || {}).forEach((metricCategory) => {
      Object.keys(metricData[metricCategory]).forEach((metric) => {
        result.push({
          label: metricData[metricCategory][metric].label,
          value: metric,
        });
      });
    });
    return result;
  }
);

// Action creators are generated for each case reducer function

export const {
  setPlansmartBudgetFilterLoader,
  setPlansmartBudgetTableLoader,
  setPlansmartBudgetUpdateLoader,
  setPlanSmartSavePlanLoader,
  setPlanSmartSavePivotViewLoader,
  setPlanSmartUpdateBudgetTableMatchLoader,
  setPlanSmartBudgetTableColDefLoader,
  setEditableMetricsFormula,
  setPlanSmartSaveScenarioNameLoader,
  setPlanSmartMetricFormulaLoader,
  setPlanSmartPivotLoader,
  setPlansmartConfigs,
  setPlanSmartMetricDataLoader,
  setPlanSmartMetricData,
  setDownloadPlanLoader,
  setPlanSmartPivotViewDataLoader,
  setPlanSmartPivotViewColDefLoader,
  setPlanSmartPivotViewData,
  setPlanSmartPivotViewColDef,
  setPlanSmartMatchWithKpiList,
  setPlanSmartMatchWithKpiListLoader,
  setPlanSmartEopVal,
  setPlanSmartEopValLoader,
  setPlansmartPlanDisplayNameEditLoader,
} = planSmartBudgetTableLoader.actions;

// Actions
export const getPlanSmartConfig = (applicationCode = 4, config_url) => async (
  dispatch
) => {
  let { data } = await axiosInstance({
    url: `${GET_TENANT_CONFIG}/${applicationCode}${`?attribute_name=${config_url}`}`,
    method: "GET",
  });
  dispatch(setPlansmartConfigs(data.data[0].attribute_value));
  return data.data[0].attribute_value;
};
export const getPlanSmartPlanDetails = (plancode) => async () => {
  return axiosInstance({
    url: `${PLANSMART_BUDGET_PLAN_DETAILS}/${plancode}`,
    method: "GET",
  });
};
export const getPlanningTableColumns = (plancode, action) => async () => {
  if (action === "view") {
    return axiosInstance({
      url: `${PLANSMART_PLANNING_COLUMN_CONF}/view/${plancode}`,
      method: "GET",
    });
  } else {
    return axiosInstance({
      url: `${PLANSMART_PLANNING_COLUMN_CONF}/${plancode}`,
      method: "GET",
    });
  }
};
export const getPlanHierarchies = () => async () => {
  return axiosInstance({
    url: `${PLANSMART_PLAN_HIERARCHIES}`,
    method: "GET",
  });
};
export const getMetricsConfig = () => async () => {
  return axiosInstance({
    url: `${PLANSMART_PLAN_METRIC_CONFIG}`,
    method: "GET",
  });
};
export const fetchPlanBudgetDetails = (postBody) => async () => {
  return axiosInstance({
    url: PLANSMART_BUDGETTABLE_PLANCODE_DETAILS,
    method: "POST",
    data: postBody,
    isV3: true,
  });
};
export const getPlanFilterDropdownOptions = (id, postBody) => async () => {
  return axiosInstance({
    url: `${PLANSMART_PLAN_FILTER_OPTIONS}${id}`,
    method: "POST",
    data: postBody,
  });
};
export const updateForecastedData = (planCode, postBody) => async () => {
  return axiosInstance({
    url: `${PLANSMART_FORECASTED_DATA}${planCode}`,
    method: "GET",
    isV3: true,
  });
};

export const updateConstraintFilter = (planCode, postBody) => async () => {
  return axiosInstance({
    url: `${PLANSMART_CONSTRAINT_FILTER}/${planCode}`,
    method: "POST",
    data: postBody,
    isV3: true,
  });
};

export const updateBudgetTableData = (postBody) => async () => {
  return axiosInstance({
    url: `${PLANSMART_UPDATE_BUDGET_TABLE}`,
    method: "PUT",
    data: postBody,
    isV3: true,
  });
};

export const savePlanAPI = (planCode) => async () => {
  return axiosInstance({
    url: `${PLANSMART_SAVE_PLAN}/${planCode}`,
    method: "GET",
    isV3: true,
  });
};

export const getPivotDataAPI = (payload) => async () => {
  return axiosInstance({
    url: PLANSMART_PIVOT_VIEW_DATA,
    method: "POST",
    data: payload,
  });
};

export const getPivotColDefAPI = (payload) => async () => {
  return axiosInstance({
    url: PLANSMART_PIVOT_VIEW_COL_DEF,
    method: "POST",
    data: payload,
  });
};

export const updateBudgetTableDataMatchWith = (postBody) => async (
  dispatch
) => {
  try {
    const response = await axiosInstance({
      url: `${PLANSMART_UPDATE_BUDGET_TABLE_MATCH_WITH}`,
      method: "PUT",
      data: postBody,
      isV3: true,
    });
    if (response.data.status) {
      dispatch(
        addSnack({
          message: "Budget table updated successfully",
          options: {
            variant: "success",
          },
        })
      );
    } else {
      dispatch(
        addSnack({
          message: response.data.message || "Error while updating budget table",
          options: {
            variant: "error",
          },
        })
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong please try again later",
        options: {
          variant: "error",
        },
      })
    );
  }
};

export const savePivotView = (planCode, reqBody) => async (dispatch) => {
  dispatch(setPlanSmartSavePivotViewLoader(true));
  try {
    const response = await axiosInstance({
      url: `${PLANSMART_PIVOT_VIEW_SAVE_TEMPLATE}/${planCode}`,
      method: "POST",
      data: reqBody,
    });
    if (response.data.status) {
      dispatch(
        addSnack({
          message: "Pivot view saved successfully",
          options: {
            variant: "success",
          },
        })
      );
    } else {
      dispatch(
        addSnack({
          message: response.data.message || "Error while saving pivot view",
          options: {
            variant: "error",
          },
        })
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong please try again later",
        options: {
          variant: "error",
        },
      })
    );
  }
  dispatch(setPlanSmartSavePivotViewLoader(false));
};

export const saveScenarioNameApi = (
  reqBody,
  planCode,
  callBackSuccessFn
) => async (dispatch) => {
  dispatch(setPlanSmartSaveScenarioNameLoader(true));
  try {
    const response = await axiosInstance({
      url: `${PLANSMART_SAVE_SCENARIO_PLAN}/${planCode}`,
      method: "POST",
      data: reqBody,
    });
    if (response.data?.status) {
      dispatch(
        addSnack({
          message: "Saved scenario name successfully",
          options: {
            variant: "success",
          },
        })
      );
      callBackSuccessFn();
    } else {
      dispatch(
        addSnack({
          message: "Error while saving scenario name",
          options: {
            variant: "error",
          },
        })
      );
    }
    dispatch(setPlanSmartSaveScenarioNameLoader(false));
  } catch (error) {
    dispatch(
      addSnack({
        message: "Error while saving scenario name",
        options: {
          variant: "error",
        },
      })
    );
    dispatch(setPlanSmartSaveScenarioNameLoader(false));
  }
};

export const getStyleColDef = (
  plancode,
  selectHierarchyActionMap
) => async () => {
  const columns = await axiosInstance({
    url: `${PLANSMART_SKU_COL_DEF}/${plancode}?config=style`,
    method: "GET",
    isV3: true,
  });

  const formattedColumns = agGridColumnFormatter(
    columns.data.data.config,
    null,
    selectHierarchyActionMap(columns.data.data.config?.[0]?.column_name)
  );
  return { columns: formattedColumns, metricList: columns.data.data.kpi };
};

export const getStyleColorColDef = (
  plancode,
  selectHierarchyActionMap
) => async () => {
  const columns = await axiosInstance({
    url: `${PLANSMART_SKU_COL_DEF}/${plancode}?config=style-color`,
    method: "GET",
    isV3: true,
  });

  const formattedColumns = agGridColumnFormatter(
    columns.data.data.config,
    null,
    selectHierarchyActionMap(columns.data.data.config?.[0]?.column_name)
  );
  return formattedColumns;
};

export const getSkuColDef = (plancode) => async () => {
  const columns = await axiosInstance({
    url: `${PLANSMART_SKU_COL_DEF}/${plancode}?config=sku`,
    method: "GET",
    isV3: true,
  });

  const formattedColumns = agGridColumnFormatter(columns.data.data.config);
  return formattedColumns;
};

export const fetchPlanBudgetSkuDetails = (postBody) => async () => {
  const data = await axiosInstance({
    url: PLANSMART_SKU_VIEW_DATA,
    method: "POST",
    data: postBody,
    isV3: true,
  });
  return data.data;
};

export const fetchFormulasForEditableMetrics = () => async () => {
  return axiosInstance({
    url: PLANSMART_EDITABLE_METRIC_FETCH_FORMULA,
    method: "GET",
  });
};

export const fetchCompatibleVersions = (planCode) => async () => {
  return axiosInstance({
    url: `${PLANSMART_VERSION_LIST}/${planCode}`,
    method: "GET",
  });
};

export const updateSkuKpis = (payload) => async () => {
  await axiosInstance({
    url: `${PLANSMART_UPDATE_SKUS}`,
    method: "PUT",
    data: payload,
    isV3: true,
  });
};

export const getPlanSmartMetricData = (successCallbackFn) => async (
  dispatch
) => {
  try {
    dispatch(setPlanSmartMetricDataLoader(true));
    const response = await getMetricsConfig()();
    if (response.data.status) {
      dispatch(setPlanSmartMetricData(response.data.data));
      if (successCallbackFn) {
        successCallbackFn();
      }
    } else {
      dispatch(setPlanSmartMetricData({}));
    }
  } catch (error) {
    dispatch(setPlanSmartMetricData({}));
  } finally {
    dispatch(setPlanSmartMetricDataLoader(false));
  }
};

export const fetchPivotViewColDef = (payload) => async (dispatch) => {
  try {
    dispatch(setPlanSmartPivotViewColDefLoader(true));
    const response = await getPivotColDefAPI(payload)();
    if (response.data.status) {
      dispatch(setPlanSmartPivotViewColDef(response.data.data));
    } else {
      dispatch(setPlanSmartPivotViewColDef([]));
    }
  } catch (error) {
    dispatch(setPlanSmartPivotViewColDef([]));
  } finally {
    dispatch(setPlanSmartPivotViewColDefLoader(false));
  }
};

export const fetchPivotViewData = (payload) => async (dispatch) => {
  try {
    dispatch(setPlanSmartPivotViewDataLoader(true));
    const response = await getPivotDataAPI(payload)();
    if (response.data.status) {
      dispatch(setPlanSmartPivotViewData(response.data.data));
    } else {
      dispatch(setPlanSmartPivotViewData([]));
    }
  } catch (error) {
    dispatch(setPlanSmartPivotViewData([]));
  } finally {
    dispatch(setPlanSmartPivotViewDataLoader(false));
  }
};

export const fetchMatchWithKpiList = (season, version) => async (dispatch) => {
  try {
    dispatch(setPlanSmartMatchWithKpiListLoader(true));
    const response = await axiosInstance({
      url: `${PLANSMART_MATCH_WITH_CONFIG}/${season}/${version}`,
      method: "GET",
    });
    if (response.data.status) {
      const list = get(response.data, "data[0].match_with_master_info", []).map(
        (dataObj) => {
          const categoryKey = Object.keys(dataObj)[0];
          return {
            category_name: categoryKey,
            kpis: dataObj[categoryKey],
          };
        }
      );
      dispatch(setPlanSmartMatchWithKpiList(list));
    } else {
      dispatch(setPlanSmartMatchWithKpiList([]));
      dispatch(
        addSnack({
          message: response.data.message || "Something went wrong",
          options: {
            variant: "error",
          },
        })
      );
    }
  } catch (error) {
    dispatch(setPlanSmartMatchWithKpiList([]));
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      })
    );
  } finally {
    dispatch(setPlanSmartMatchWithKpiListLoader(false));
  }
};

export const editPlanDisplayName = (postBody) => async (dispatch) => {
  try {
    dispatch(setPlansmartPlanDisplayNameEditLoader(true));
    const response = await axiosInstance({
      url: PLANSMART_EDIT_PLAN_DISPLAY_NAME,
      method: "POST",
      data: postBody,
    });
    if (response.data.status) {
      dispatch(
        addSnack({
          message: response?.data?.message,
          options: {
            variant: "success",
          },
        })
      );
      return response.data;
    } else {
      dispatch(
        addSnack({
          message: response?.data?.message || "Something went wrong",
          options: {
            variant: "error",
          },
        })
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: error?.response?.data?.message || "Something went wrong",
        options: {
          variant: "error",
        },
      })
    );
  } finally {
    dispatch(setPlansmartPlanDisplayNameEditLoader(false));
  }
};
export const fetchEopVal = (body, successCallback) => async (dispatch) => {
  dispatch(setPlanSmartEopValLoader(true));
  const response = await callbackFetchFnc({
    apiCall: () =>
      axiosInstance({
        url: PLANSMART_EOP_VAL_API,
        method: "POST",
        data: body,
        isV3: true,
      }),
    dispatch,
    successCallback: successCallback,
  });
  dispatch(setPlanSmartEopVal(response?.data || {}));
  dispatch(setPlanSmartEopValLoader(false));
};

export default planSmartBudgetTableLoader.reducer;
