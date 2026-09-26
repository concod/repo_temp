import {
  GET_PLAN_DETAIL_MODAL_NO,
  MODEL_API_URL,
  GET_FORMULA_MODEL_NO,
  BUDGET_TABLE_SHOW_HIDE_API,
  WRITTEN_TWO_DELIVER_API
} from "constants/modalApi.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { get } from "lodash";
import {
  planDetailsSelector,
  productHierarchySelector,
  setBudgetTableLoader,
  setBudgetTableResp,
  setPlanKpiConfigLoader,
  setPlanDetails,
  setPlanDetailsLoader,
  setPlanKpiConfig,
  setUpdatePlanLoader,
  trackBudgetTableChangesSelector,
  setFormulaLoader,
  setFormula,
  setShowHideMetricLoader,
  setBudgetShowHideMetricsData,
  resetBudgetTableResp,
  resetLockedCells,
  resetTrackBudgetTableChanges,
  setTableViewSetting,
  setPlanKpiConfigV2,
  setPlanKpiConfigV2Loader,
  setDeliveryData,
  setWrittenDeliveryLoader,
  setBudgetTableRowData,
  setPlanActualizedWeeksLoader,
  setPlanActualizedWeeks,
  calculationUUIDSelector,
  setCalculationUUID,
  setIsEditActionsEnabled,
  setIsWrittenKpiEdited,
  isSnackDispatchedSelector
} from "../slice/planningScreen.slice";

import { getFormattedData } from "../planningScreen.util";

import {
  sample_column_config,
  sample_plan_config,
  sample_row_data,
  showHideData
} from "./budgetTable.data";
import { API_METHOD } from "../../../constants/api.constant";
import {
  BUDGET_LIST_API,
  KPI_CONFIG_API,
  PLAN_UPDATE_SUCCESS_MSG,
  UPDATE_PLAN_API,
  TARGET_PLAN_BUDGET_LIST_API,
  KPI_CONFIG_API_V2,
  PLAN_ACTUALIZED_WEEKS,
  calcOnServer,
  UPDATE_PLAN_API_V5,
  TARGET_PLAN_STATUS_CODES
} from "../planningScreen.constant";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import flattenColDefFunc from "../../../utils/getPlanningScreenFlattenColDef";

/**
 * Handles dispatching actions for budget table loading, API calls, and processing responses.
 * @param {function} dispatch - Function to dispatch actions to the Redux store.
 * @param {function} getStore - Function to get the current state of the Redux store.
 * @returns {Promise<void>} Resolves when dispatching actions and API calls are complete.
 * @description
 * - Uses different API endpoints based on URL path.
 * - Reducers handle loading state, setting budget table data, and showing error messages.
 * - Differentiates processing based on whether data is being updated or newly fetched.
 */
export const getBudgetTableData = (useMock = false, params) => async (
  dispatch,
  getStore
) => {
  dispatch(setBudgetTableLoader(true));
  const store = getStore();
  const planDetails = planDetailsSelector(store);
  const productHierarchyList = productHierarchySelector(store);
  const isSnackDispatched = isSnackDispatchedSelector(store);

  const { isUpdate, setShowViewsList } = params || {};
  try {
    const productHierarchyLevels = productHierarchyList.reduce((acc, level) => {
      return {
        ...acc,
        [level]: planDetails[level]
      };
    }, {});

    const budgetListUrl = TARGET_PLAN_STATUS_CODES.includes(planDetails?.status)
      ? TARGET_PLAN_BUDGET_LIST_API
      : BUDGET_LIST_API;

    if (useMock) {
      dispatch(
        setBudgetTableResp({
          data_row: sample_row_data,
          column_config: sample_column_config
        })
      );
      dispatch(setPlanKpiConfig(sample_plan_config));
    } else {
      Object.keys(productHierarchyLevels).forEach((key) => {
        // If the value is null, assign an empty array
        if (productHierarchyLevels[key] === null) {
          productHierarchyLevels[key] = [];
        }
      });

      const response = await axiosInstanceWrapper({
        axiosProps: {
          url: budgetListUrl,
          method: API_METHOD.POST,
          data: {
            plan_code: planDetails?.plan_code,
            level: productHierarchyLevels,
            session_id: null
          },
          isV3: true
        },
        dispatch: dispatch,
        isSnackDispatched: isSnackDispatched
      });

      const calculationUUID = get(response, `data.data.session_id`, null);
      dispatch(setCalculationUUID(calculationUUID));

      const responseData = get(response, "data.data", {
        data_row: [],
        column_config: [],
        viewsettings: [],
        levels: 0
      });

      if (!isUpdate) {
        dispatch(
          setBudgetTableResp({
            ...responseData,
            column_config: flattenColDefFunc(
              responseData.column_config,
              responseData.levels
            )
          })
        );
        dispatch(setTableViewSetting(responseData.viewsettings));
      } else {
        dispatch(setBudgetTableRowData(responseData.data_row));
      }

      if (response.status && setShowViewsList) {
        setShowViewsList(true);
      }
    }
  } catch (error) {
    if (!isSnackDispatched) {
      dispatch(
        addSnack({
          message: SOMETHING_WENT_WRONG_MSG,
          options: {
            variant: SNACK_VARIANT.ERROR
          }
        })
      );
    }
  } finally {
    dispatch(setBudgetTableLoader(false));
  }
};

/**
 * Makes an asynchronous request to fetch plan details and handles the loading state.
 * @param {Function} dispatch - Function to dispatch actions to the Redux store.
 * @returns {void} Does not return any value.
 * @description
 *   - Sets the loading state before and after the request.
 *   - Dispatches plan details to the store on success.
 *   - Calls a success callback if provided and response is successful.
 *   - Dispatches an empty object in case of an error.
 */
export const getPlanDetails = (plaCode, successCallBack) => async (
  dispatch
) => {
  try {
    dispatch(setPlanDetailsLoader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: MODEL_API_URL,
        method: API_METHOD.POST,
        data: {
          id: GET_PLAN_DETAIL_MODAL_NO,
          parameters: {
            plan_code: plaCode
          }
        }
      },
      dispatch: dispatch
    });

    const planDetails = get(response, "data.data[0]", {});
    // If the plan code in the URL is updated but the corresponding plan does not exist.
    planDetails.plan_code = plaCode;
    dispatch(setPlanDetails(planDetails));
    if (response?.data?.status === 200) {
      if (successCallBack) {
        successCallBack(planDetails);
      }
    }
  } catch (error) {
    dispatch(setPlanDetails({}));
  } finally {
    dispatch(setPlanDetailsLoader(false));
  }
};

/**
 * Updates the plan with new payload and handles the API response.
 * @param {function} dispatch - Dispatch function to update the store.
 * @param {function} getStore - Function to get the current store state.
 * @returns {Promise<void>} Returns nothing.
 * @description
 *   - Sends a PUT request to update the plan with the provided payload.
 *   - Displays a success snack message upon successful update.
 *   - Resets specific state values following a successful API response.
 *   - Displays an error snack message in case of a failure.
 */
export const executePlanUpdate = (calculationUUIDRef) => async (
  dispatch,
  getStore
) => {
  try {
    const store = getStore();
    const updatePlanPayload = trackBudgetTableChangesSelector(store);
    const planDetails = planDetailsSelector(store);
    const calculationUUID = calculationUUIDSelector(store);
    let payload = {
      plan_code: planDetails?.plan_code,
      updates: updatePlanPayload
    };

    if (calcOnServer()) {
      payload = {
        plan_code: planDetails?.plan_code,
        session_id: calculationUUID
      };
    }
    dispatch(setUpdatePlanLoader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: calcOnServer() ? UPDATE_PLAN_API_V5 : UPDATE_PLAN_API,
        method: API_METHOD.PUT,
        data: payload,
        isV3: true
      },
      dispatch: dispatch
    });
    if (response.status) {
      dispatch(setCalculationUUID(null));
      calcOnServer && dispatch(setIsEditActionsEnabled(false));
      calculationUUIDRef.current = null;
      dispatch(
        addSnack({
          message: PLAN_UPDATE_SUCCESS_MSG,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      /**
       * Need to reset the below state once api call is successful
       *  UNDO
       *  LOCK CELL
       *  Update Plan payload
       *  BudgetTable response
       */
      dispatch(resetTrackBudgetTableChanges());
      dispatch(getBudgetTableData(false, { isUpdate: true }));
      dispatch(setIsWrittenKpiEdited(false));
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setUpdatePlanLoader(false));
  }
};

/**
 * Fetches and dispatches KPI configuration data for a given plan code.
 * @param {function} dispatch - The dispatch function to send actions to the store.
 * @returns {Promise<void>} Resolves when all actions are dispatched.
 * @description
 *   - Initiates loader before making the API call.
 *   - Handles both successful and unsuccessful API responses.
 *   - Disables loader after the API call completes or errors out.
 */
export const getKpiConfig = (plaCode) => async (dispatch) => {
  try {
    dispatch(setPlanKpiConfigLoader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: KPI_CONFIG_API,
        method: API_METHOD.POST,
        data: {
          plan_code: plaCode,
          season_type: null
        },
        isV3: true
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(setPlanKpiConfig(response.data.data));
    } else {
      dispatch(setPlanKpiConfig({}));
    }
  } catch (error) {
    dispatch(setPlanKpiConfig({}));
  } finally {
    dispatch(setPlanKpiConfigLoader(false));
  }
};

/**
 * Dispatches the KPI configuration asynchronously.
 * @async
 * @function
 * @param {function} dispatch - The dispatch function for Redux actions.
 * @returns {Promise<void>} Returns a promise that resolves when the operation is complete.
 * @description
 *   - Handles setting and unsetting loader states.
 *   - Sends a POST request to the KPI_CONFIG_API_V2 endpoint.
 *   - Populates the Redux state with the fetched KPI configuration data or an empty object upon failure.
 *   - Uses axiosInstanceWrapper for API requests with a specified plan code and null season type.
 */
export const getKpiConfigV2 = (plaCode) => async (dispatch) => {
  try {
    dispatch(setPlanKpiConfigV2Loader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: KPI_CONFIG_API_V2,
        method: API_METHOD.POST,
        data: {
          plan_code: plaCode,
          season_type: null
        },
        isV3: true
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(setPlanKpiConfigV2(response.data.data));
    } else {
      dispatch(setPlanKpiConfigV2({}));
    }
  } catch (error) {
    dispatch(setPlanKpiConfigV2({}));
  } finally {
    dispatch(setPlanKpiConfigV2Loader(false));
  }
};

/**
 * Dispatches API request to get formula and updates state based on response.
 * @param {function} dispatch - Redux dispatch function to update state.
 * @returns {Promise<void>} No return value.
 * @description
 *   - Toggles loader state before and after API call.
 *   - Retrieves formula from response and updates state.
 *   - Handles errors by setting the formula to an empty object.
 */
export const getFormula = (seasonType) => async (dispatch) => {
  try {
    dispatch(setFormulaLoader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: MODEL_API_URL,
        method: API_METHOD.POST,
        data: {
          id: GET_FORMULA_MODEL_NO,
          parameters: {
            module: seasonType
          }
        }
      },
      dispatch: dispatch
    });

    const formula = get(response, "data.data[0].data", {});
    dispatch(setFormula(formula));
  } catch (error) {
    dispatch(setFormula({}));
  } finally {
    dispatch(setFormulaLoader(false));
  }
};

/**
 * Toggles metric loader visibility and sets budget show/hide metrics data.
 * @param {function} dispatch - Function to dispatch actions.
 * @returns {Promise<void>} Resolves when the operation is complete.
 * @description
 *   - Uses mock data if `isMock` is true.
 *   - Fetches data from an API if `isMock` is false.
 *   - Dispatches an error snack message if an error occurs.
 *   - Toggles the metric loader visibility before and after the operation.
 */
export const fetchShowHideData = (planCode, isMock = false) => async (
  dispatch,
  getStore
) => {
  const store = getStore();
  const isSnackDispatched = isSnackDispatchedSelector(store);

  dispatch(setShowHideMetricLoader(true));
  try {
    let formattedData;
    if (isMock) {
      formattedData = showHideData;
    } else {
      const response = await axiosInstanceWrapper({
        axiosProps: {
          isV3: true,
          url: `${BUDGET_TABLE_SHOW_HIDE_API}${planCode}`,
          method: API_METHOD.GET
        },
        dispatch: dispatch,
        isSnackDispatched: isSnackDispatched
      });
      formattedData = getFormattedData(get(response, "data.data", []));
    }

    dispatch(setBudgetShowHideMetricsData(formattedData));
  } catch (error) {
    if (!isSnackDispatched) {
      dispatch(
        addSnack({
          message: SOMETHING_WENT_WRONG_MSG,
          options: {
            variant: SNACK_VARIANT.ERROR
          }
        })
      );
    }
  } finally {
    dispatch(setShowHideMetricLoader(false));
  }
};

/**
 * Initiates a delivery request and processes the response.
 * @param {Function} dispatch - Function to dispatch actions to the store.
 * @param {Function} getStore - Function to get the current state from the store.
 * @returns {Promise<void>} Resolves when the operation is complete.
 * @description
 *   - It sets a loading state before initiating a request.
 *   - It constructs `productHierarchyLevels` using current store data.
 *   - It makes a POST request to fetch delivery data.
 *   - It handles success and error responses by dispatching appropriate actions.
 */
export const getWrittenTwoDeliveryDetails = () => async (
  dispatch,
  getStore
) => {
  try {
    dispatch(setWrittenDeliveryLoader(true));
    const store = getStore();
    const planDetails = planDetailsSelector(store);
    const productHierarchyList = productHierarchySelector(store);
    const productHierarchyLevels = productHierarchyList.reduce((acc, level) => {
      return {
        ...acc,
        [level]: planDetails[level]
      };
    }, {});
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: WRITTEN_TWO_DELIVER_API,
        method: API_METHOD.POST,
        data: {
          plan_code: planDetails?.plan_code,
          level: productHierarchyLevels
        },
        isV3: true
      },
      dispatch: dispatch
    });

    dispatch(setDeliveryData(response.data?.data || {}));
  } catch (error) {
    dispatch(setDeliveryData(error));
  } finally {
    dispatch(setWrittenDeliveryLoader(false));
  }
};

export const getPlanActualizedWeeks = (planCode) => async (
  dispatch,
  getStore
) => {
  try {
    dispatch(setPlanActualizedWeeksLoader(true));
    const store = getStore();
    const isSnackDispatched = isSnackDispatchedSelector(store);

    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: PLAN_ACTUALIZED_WEEKS,
        method: API_METHOD.POST,
        data: {
          plan_code: planCode
        },
        isV3: true
      },
      dispatch: dispatch,
      isSnackDispatched: isSnackDispatched
    });

    if (response.status) {
      dispatch(setPlanActualizedWeeks(response.data.data));
    } else {
      dispatch(setPlanActualizedWeeks({}));
    }
  } catch (error) {
    dispatch(setPlanActualizedWeeks({}));
  } finally {
    dispatch(setPlanActualizedWeeksLoader(false));
  }
};
