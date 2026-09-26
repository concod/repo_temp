import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import { API_METHOD } from "constants/api.constant";
import {
  PLANSMART_DELETE_PLAN_API_URL,
  PLAN_DELETE_SUCCESS_MESSAGE
} from "./deletePlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { getDashboardTableData } from "../../../dashboard.api";

/**
 * Deletes a plan using provided payload and updates dashboard data for a specific screen.
 * @param {Object} payload - Data required to delete the plan.
 * @param {string} selectedScreenName - Name of the screen to update data for.
 * @returns {Function} An async function that dispatches actions.
 * @description
 *   - Utilizes axiosInstanceWrapper to perform the delete operation.
 *   - Dispatches actions for success message and dashboard data update.
 */
export const deletePlanApi = (payload, selectedScreenName) => async (
  dispatch
) => {
  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: PLANSMART_DELETE_PLAN_API_URL,
        method: API_METHOD.DELETE,
        data: payload
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(
        addSnack({
          message: PLAN_DELETE_SUCCESS_MESSAGE,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
      dispatch(getDashboardTableData(selectedScreenName));
    }
  } catch (error) {}
};
