import { get } from "lodash";
import { addSnack } from "actions/snackbarActions";
import {
  getCreatePlanRequestPayload,
  getPlanningScreenRedirectUrl,
  getConfigFile
} from "../createNewPlan.util";
import {
  CREATE_PLAN_API_URL,
  PLAN_CREATE_SUCCESS_MESSAGE,
  CLIENT
} from "../createNewPlan.constant";
import { API_METHOD } from "constants/api.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { setLoader } from "./../createNewPlan.slice";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";

/**
 * Asynchronously processes and dispatches plan creation based on the provided payload.
 * @param {Function} dispatch - The dispatch function to trigger Redux actions.
 * @returns {Promise<void>} Navigates to the planning screen on success and shows a success message.
 * @description
 *   - Handles loading state through setLoader dispatches.
 *   - Constructs request payload from provided fields and default values.
 *   - Handles API call to create plan and navigates based on the received response.
 *   - Catches and logs errors, ensuring the loader state is reset in all cases.
 */
export const createPlanApi = (payload) => async (dispatch) => {
  try {
    dispatch(setLoader(true));

    const {
      fields,
      fieldsDefaultValues,
      navigate,
      location,
      selectedScreenName
    } = payload;
    const url = location.pathname;
    const requestPayload = getCreatePlanRequestPayload({
      fields,
      fieldsDefaultValues,
      dispatch,
      selectedScreenName
    });

    if (!requestPayload) {
      return;
    }
    const apiRequest = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: CREATE_PLAN_API_URL,
        method: API_METHOD.POST,
        data: requestPayload
      },
      dispatch: dispatch
    });

    const planCode = get(
      apiRequest,
      "data.data[0].plan_smart_create_plan",
      null
    );

    if (apiRequest.status) {
      navigate(getPlanningScreenRedirectUrl(url, planCode));
      dispatch(
        addSnack({
          message: PLAN_CREATE_SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
    }
  } catch (error) {
    console.error(error);
  } finally {
    dispatch(setLoader(false));
  }
};
