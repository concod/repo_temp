import { createSelector, createSlice } from "@reduxjs/toolkit";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { get } from "lodash";
import {
  PLANSMART_DOWNLOAD,
  PLANSMART_PLAN_DOWNLOAD,
} from "modules/plansmart/constants-plansmart/apiConstants";
import {
  PLAN_SMART_APPLICATION_CODE,
  PLAN_SMART_SCREEN_CONFIGURATION,
} from "modules/plansmart/constants-plansmart/stringConstants";
import axiosInstance from "core/Utils/axios";
import { getPlanHierarchies } from "../BudgetPlanTable/budget-plan-table-service";

const initialState = {
  planHierarchy: {},
  planSmartHierarchyLoader: false,
  downloadPlanLoader: false,
  screenConfigLoader: false,
  screenConfig: {},
};

export const planSmartCommonReducer = createSlice({
  name: "planSmartCommonReducer",
  initialState,
  reducers: {
    setPlanSmartHierarchyLoader: (state, action) => {
      state.planSmartHierarchyLoader = action.payload;
    },
    setPlanHierarchy: (state, action) => {
      state.planHierarchy = action.payload;
    },
    setDownloadPlanLoader: (state, action) => {
      state.downloadPlanLoader = action.payload;
    },
    setPlanSmartScreenConfigLoader: (state, action) => {
      state.screenConfigLoader = action.payload;
    },
    setPlanSmartScreenConfig: (state, action) => {
      state.screenConfig = action.payload;
    },
  },
});

export const {
  setPlanSmartHierarchyLoader,
  setPlanHierarchy,
  setDownloadPlanLoader,
  setPlanSmartScreenConfigLoader,
  setPlanSmartScreenConfig,
} = planSmartCommonReducer.actions;

export const planSmartCommonReducerSelector = createSelector(
  (state) => state,
  (state) => state.plansmartReducer.planSmartCommonReducer
);

export const planSmartPlanHierarchyLoaderSelector = createSelector(
  planSmartCommonReducerSelector,
  (state) => state.planSmartHierarchyLoader
);

export const planSmartPlanHierarchySelector = createSelector(
  planSmartCommonReducerSelector,
  (state) => state.planHierarchy
);

export const planSmartDownloadLoaderSelector = createSelector(
  planSmartCommonReducerSelector,
  (state) => state.downloadPlanLoader
);

export const planSmartScreenConfigLoaderSelector = createSelector(
  planSmartCommonReducerSelector,
  (state) => state.screenConfigLoader
);

export const planSmartScreenConfigSelector = createSelector(
  planSmartCommonReducerSelector,
  (state) => state.screenConfig
);

export const fetchPlanHierarchy = () => async (dispatch) => {
  try {
    dispatch(setPlanSmartHierarchyLoader(true));
    const response = await getPlanHierarchies()();
    if (response.data.status) {
      dispatch(setPlanHierarchy(response.data.data));
    } else {
      dispatch(setPlanHierarchy({}));
    }
  } catch (error) {
    dispatch(setPlanHierarchy({}));
  } finally {
    dispatch(setPlanSmartHierarchyLoader(false));
  }
};

export const planSmartDownloadPlan = (payload, callback) => async (
  dispatch
) => {
  try {
    dispatch(setDownloadPlanLoader(true));
    const response = await axiosInstance({
      url: PLANSMART_PLAN_DOWNLOAD,
      method: "POST",
      data: payload,
    });
    if (response.data.status) {
      dispatch(
        addSnack({
          message:
            "Download initiated, We will notify you once it is successful",
          options: {
            variant: "info",
          },
        })
      );
    } else {
      dispatch(
        addSnack({
          message: "Something went wrong",
          options: {
            variant: "error",
          },
        })
      );
    }
    if (callback) {
      callback(response.data.status);
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      })
    );
    if (callback) {
      callback(false);
    }
  } finally {
    dispatch(setDownloadPlanLoader(false));
  }
};
export const planSmartDownloadReport = (payload, report_type) => async (
  dispatch
) => {
  try {
    const response = await axiosInstance({
      url: `${PLANSMART_DOWNLOAD}/${report_type}`,
      method: "POST",
      data: payload,
    });
    if (response.data.data.status) {
      dispatch(
        addSnack({
          message:
            "Download initiated, We will notify you once it is successful",
          options: {
            variant: "info",
          },
        })
      );
    } else {
      dispatch(
        addSnack({
          message: "Report generation failed.",
          options: {
            variant: "error",
          },
        })
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      })
    );
  }
};

export const getPlanSmartScreenConfig = () => async (dispatch) => {
  try {
    dispatch(setPlanSmartScreenConfigLoader(true));
    const response = await getTenantConfigApplicationLevel(
      PLAN_SMART_APPLICATION_CODE,
      { attribute_name: PLAN_SMART_SCREEN_CONFIGURATION }
    )();
    if (response?.data?.status) {
      const data = get(response, "data.data[0].attribute_value", {});
      dispatch(setPlanSmartScreenConfig(data));
    } else {
      dispatch(setPlanSmartScreenConfig({}));
    }
  } catch (error) {
    dispatch(setPlanSmartScreenConfig({}));
  } finally {
    dispatch(setPlanSmartScreenConfigLoader(false));
  }
};

export default planSmartCommonReducer.reducer;
