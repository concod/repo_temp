import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  PLANSMART_DASHBOARD_COLUMN_DATA,
  PLANSMART_DASHBOARD_TABLE_DATA,
  PLANSMART_DASHBOARD_FILTER_CONFIG,
  PLANSMART_DELETE_PLAN,
  PLANSMART_COPY_PLAN,
  PLANSMART_PLANNING_COLUMN_CONF,
  PLANSMART_RECEIPT_PLAN_TABLE_DATA,
} from "../../constants-plansmart/apiConstants";
import { get } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { callbackFetchFnc } from "modules/plansmart/utils-plansmart/ConstantFunctions";
import { getAllDropdownValues } from "modules/plansmart/pages-plansmart/plansmart-utility";
import { PLAN_SMART_FILTER_START_YEAR } from "modules/plansmart/constants-plansmart/stringConstants";

export const planSmartDashboardService = createSlice({
  name: "planSmartDashboardService",
  initialState: {
    plansmartDashboardLoader: false,
    plansmartColDefDashboardLoader: false,
    plansmartFilterLoader: false,
    plansmartCopyPlanLoader: false,
    plansmartDashboardData: [],
    plansmartColDefData: [],
    plansmartDashboardFilterConf: [],
  },
  reducers: {
    setPlansmartDashboardLoader: (state, action) => {
      state.plansmartDashboardLoader = action.payload;
    },
    setPlansmartColDefDashboardLoader: (state, action) => {
      state.plansmartColDefDashboardLoader = action.payload;
    },
    setPlansmartFilterLoader: (state, action) => {
      state.plansmartFilterLoader = action.payload;
    },
    setPlansmartCopyPlanLoader: (state, action) => {
      state.plansmartCopyPlanLoader = action.payload;
    },
    setPlansmartDashboardData: (state, action) => {
      state.plansmartDashboardData = action.payload;
    },
    setPlansmartColDefData: (state, action) => {
      state.plansmartColDefData = action.payload;
    },
    setPlansmartDashboardFilterConf: (state, action) => {
      state.plansmartDashboardFilterConf = action.payload;
    },
  },
});

// Selectors
export const planSmartDashboardSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.planDashboardReducer
);

export const planSmartCopyLoaderSelector = createSelector(
  planSmartDashboardSelector,
  (state) => state.plansmartCopyPlanLoader
);

export const plansmartFilterConfigSelector = createSelector(
  planSmartDashboardSelector,
  (state) => state.plansmartDashboardFilterConf
);

export const plansmartDashboardColDefSelector = createSelector(
  planSmartDashboardSelector,
  (state) => state.plansmartColDefData
);

export const plansmartDashboardData = createSelector(
  planSmartDashboardSelector,
  (state) => state.plansmartDashboardData
);

// Action creators are generated for each case reducer function
export const {
  setPlansmartDashboardLoader,
  setPlansmartFilterLoader,
  setPlansmartCopyPlanLoader,
  setPlansmartDashboardData,
  setPlansmartColDefDashboardLoader,
  setPlansmartColDefData,
  setPlansmartDashboardFilterConf,
} = planSmartDashboardService.actions;

export const fetchPlansmartDashboardColDef = (postBody) => async (dispatch) => {
  dispatch(setPlansmartColDefDashboardLoader(true));
  const response = await callbackFetchFnc({
    apiCall: () =>
      axiosInstance({
        url: PLANSMART_DASHBOARD_COLUMN_DATA,
        method: "GET",
        data: postBody,
      }),
    dispatch,
  });
  if (response) {
    const columns = get(response, "data", []) || [];
    columns.forEach((column) => {
      if (column.column_name === "action") {
        return Object.assign(column, { is_hidden: true });
      }
      if (column.type === "DateTimeField") {
        return Object.assign(column, { dateFormatter: "MM/DD/YYYY" });
      }
    });
    dispatch(setPlansmartColDefData(agGridColumnFormatter(columns)));
  } else {
    dispatch(setPlansmartColDefData([]));
    dispatch(
      addSnack({
        message: response.data.message,
        options: {
          variant: "error",
        },
      })
    );
  }
  dispatch(setPlansmartColDefDashboardLoader(false));
};

export const fetchPlansmartDashboardData = (filtersBody, planType) => async (
  dispatch
) => {
  dispatch(setPlansmartDashboardLoader(true));
  const response = await callbackFetchFnc({
    apiCall: () =>
      planType === 2
        ? getPlanSmartReceiptPlansData(filtersBody)()
        : axiosInstance({
            url: PLANSMART_DASHBOARD_TABLE_DATA,
            method: "POST",
            data: filtersBody,
          }),
    dispatch,
  });
  if (response) {
    const plans = get(response.data, "plans", []);
    dispatch(setPlansmartDashboardData(plans));
  } else {
    dispatch(setPlansmartDashboardData([]));
  }
  dispatch(setPlansmartDashboardLoader(false));
};

export const fetchFilterConfig = (
  planningScreenName,
  successCallback
) => async (dispatch, getStore) => {
  const store = getStore();
  dispatch(setPlansmartFilterLoader(true));
  const response = await callbackFetchFnc({
    apiCall: () =>
      axiosInstance({
        url: PLANSMART_DASHBOARD_FILTER_CONFIG,
        method: "GET",
      }),
  });
  if (response) {
    const filterData = response.data;
    filterData?.forEach((filterOption) => {
      if (filterOption.column_name === "plan_period") {
        //Hardcoding 2015 for now it may change by client
        filterOption.startYear = PLAN_SMART_FILTER_START_YEAR;
      }
    });
    const fields = getAllDropdownValues(
      filterData,
      true,
      "plansmart create plan",
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam
    );
    try {
      const finalFields = await fields;
      if (finalFields) {
        const updatedFields = finalFields.map((key) => {
          return Object.assign(
            key,
            { is_multiple_selection: true },
            { isMulti: true }
          );
        });
        dispatch(setPlansmartDashboardFilterConf(updatedFields));
        if (successCallback) {
          successCallback(updatedFields);
        }
      }
    } catch (error) {
      dispatch(
        addSnack({
          message:
            `Error fetching filters for ${planningScreenName} plans` || error,
          options: {
            variant: "error",
          },
        })
      );
      dispatch(setPlansmartDashboardFilterConf([]));
    }
  } else {
    dispatch(setPlansmartDashboardFilterConf([]));
  }
  dispatch(setPlansmartFilterLoader(false));
};

export const deletePlanSmartPlanAPI = (body) => (dispatch) => {
  return axiosInstance({
    url: PLANSMART_DELETE_PLAN,
    method: "DELETE",
    data: body,
  });
};

export const copyPlanAPI = (payload) => () => {
  return axiosInstance({
    url: `${PLANSMART_COPY_PLAN}`,
    method: "POST",
    isV3: true,
    data: payload,
  });
};
export const getPlanningTableColumns = (plancode) => async () => {
  return axiosInstance({
    url: `${PLANSMART_PLANNING_COLUMN_CONF}/${plancode}`,
    method: "GET",
  });
};

export const getPlanSmartReceiptPlansData = (postBody) => (dispatch) => {
  return axiosInstance({
    url: PLANSMART_RECEIPT_PLAN_TABLE_DATA,
    method: "POST",
    data: postBody,
    isV3: true,
  });
};

export default planSmartDashboardService.reducer;
