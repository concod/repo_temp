import { addSnack } from "actions/snackbarActions";
import { API_METHOD } from "constants/api.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import {
  PLANSMART_COPY_PLAN_API_URL,
  SUCCESS_MESSAGE,
  ERROR_MESSAGE
} from "./copyPlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";

/**
 * Executes an API call and manages success and error notifications.
 * @param {Object} payload - The data to be sent in the API request.
 * @param {function} dispatch - Dispatch function for state management.
 * @returns {Promise<Object>} The API response.
 * @description
 *   - Utilizes axiosInstanceWrapper for the API request.
 *   - Dispatches a success snack message if the request is successful.
 *   - Dispatches an error snack message if the request fails.
 */
export const requestCopyPlan = (payload, dispatch) => async () => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: PLANSMART_COPY_PLAN_API_URL,
        method: API_METHOD.POST,
        data: payload
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(
        addSnack({
          message: SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
    }

    return response;
  } catch (error) {
    dispatch(
      addSnack({
        message: ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  }
};
