import { get } from "lodash";
import { API_METHOD } from "constants/api.constant";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import {
  planDetailsSelector,
  setCheckBohSyncRequiredLoader,
  setEohBohSyncValInPlanDetails,
  setIsBohSyncRequired,
  setOpenEohBohConfirmModal,
  setSyncEohBohLoader,
  setUpdateEohBohSyncLoader
} from "../slice/planningScreen.slice";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import {
  IS_BOH_SYNC_REQUIRED_API,
  MODEL_API_URL,
  SYNC_EOH_BOH_API,
  UPDATE_EOH_BOH_SYNC_VALUE
} from "../../../constants/modalApi.constant";

/**
 * Updates the EO/BOH synchronization value for the plan
 * @param {function} dispatch - The dispatch function to trigger actions in the redux store.
 * @param {function} getStore - The function to retrieve the current state from the redux store.
 * @returns {Promise<void>} A promise that resolves when the synchronization is complete.
 * @description
 *   - Sets a loading state before initiating the request.
 *   - Uses an axios wrapper function to handle the API request.
 *   - Updates the plan details with the new EO/BOH synchronization value if the request is successful.
 *   - Resets the loading state after the request completes, regardless of success.
 */
export const updateEohBohSync = (newEohBohSyncVal) => async (
  dispatch,
  getStore
) => {
  try {
    dispatch(setUpdateEohBohSyncLoader(true));

    const store = getStore();
    const planDetails = planDetailsSelector(store);

    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: MODEL_API_URL,
        method: API_METHOD.POST,
        data: {
          id: UPDATE_EOH_BOH_SYNC_VALUE,
          parameters: {
            plan_code: planDetails?.plan_code,
            eoh_boh_sync: newEohBohSyncVal
          }
        }
      },
      dispatch: dispatch
    });

    if (response?.status === 200) {
      dispatch(setEohBohSyncValInPlanDetails(newEohBohSyncVal));
      if (newEohBohSyncVal) {
        dispatch(checkBohSyncRequired());
      }
    }
  } catch (error) {
  } finally {
    dispatch(setUpdateEohBohSyncLoader(false));
  }
};

/**
 * Syncs End of Hours (EOH) and Beginning of Hours (BOH) data with the API.
 * @param {Function} dispatch - The dispatch function for Redux actions.
 * @param {Function} getStore - Function to get the current state from the store.
 * @returns {Promise<void>} Returns a promise that resolves when the synchronization process is complete.
 * @description
 *   - Triggers a loader before starting the sync process and stops it after the process.
 *   - Handles success and error notifications based on the API response.
 *   - Updates the synchronization status and UI elements like modals after the sync operation.
 */
export const syncEohBoh = () => async (dispatch, getStore) => {
  try {
    dispatch(setSyncEohBohLoader(true));
    const store = getStore();
    const planDetails = planDetailsSelector(store);
    const payload = {
      plan_code: planDetails.plan_code
    };
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: SYNC_EOH_BOH_API,
        method: API_METHOD.PUT,
        isV3: true,
        data: payload
      }
    });
    if (response?.data?.status) {
      dispatch(
        addSnack({
          message: response?.data?.message,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      dispatch(setIsBohSyncRequired(false));
    } else {
      dispatch(
        addSnack({
          message: SOMETHING_WENT_WRONG_MSG,
          options: {
            variant: SNACK_VARIANT.ERROR
          }
        })
      );
    }
    dispatch(setOpenEohBohConfirmModal(false));
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
    dispatch(setSyncEohBohLoader(false));
  }
};

/**
 * Handles BOH Sync requirement check and updates state accordingly.
 * @param {Function} dispatch - Function to dispatch actions to the store.
 * @param {Function} getStore - Function to retrieve current state from the store.
 * @returns {Promise<void>} No return value, updates are made through dispatch actions.
 * @description
 *   - Sends a POST request to check if BOH sync is required based on plan code.
 *   - Updates loading state during the async operation.
 *   - Sets modal visibility and BOH sync requirement state based on API response.
 *   - Handles errors and sets default state if the check fails.
 */
export const checkBohSyncRequired = () => async (dispatch, getStore) => {
  try {
    const store = getStore();
    const planDetails = planDetailsSelector(store);
    dispatch(setCheckBohSyncRequiredLoader(true));
    const payload = {
      plan_code: planDetails.plan_code
    };
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: IS_BOH_SYNC_REQUIRED_API,
        method: API_METHOD.POST,
        isV3: true,
        data: payload
      }
    });
    const value = get(response, "data.data[0]", false);
    if (value) {
      dispatch(setOpenEohBohConfirmModal(true));
    } else {
      dispatch(setOpenEohBohConfirmModal(false));
    }
    dispatch(setIsBohSyncRequired(value));
  } catch (error) {
    dispatch(setIsBohSyncRequired(false));
  } finally {
    dispatch(setCheckBohSyncRequiredLoader(false));
  }
};
