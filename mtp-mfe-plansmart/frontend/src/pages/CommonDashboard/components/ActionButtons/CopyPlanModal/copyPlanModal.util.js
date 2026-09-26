import {
  EDIT,
  SUCCESS_MESSAGE,
  IN_SEASON,
  ERROR_MESSAGE
} from "./copyPlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { get } from "lodash";
import { setActionButtonLoader } from "../../../dashboard.slice";
import { addSnack } from "actions/snackbarActions";
import { PLANNING_SCREEN_ROUTE } from "../../../../../constants/route.constant";

/**
 * Handles the copying of a plan and redirects to the planning screen.
 * @param {Object} params - Parameters for copy plan action.
 * @param {string} params.planName - The name of the plan to copy.
 * @param {string} params.planCode - The code of the plan to copy.
 * @param {function} params.requestCopyPlan - Function to request copy of plan.
 * @param {Object} params.history - History object for navigation.
 * @param {function} params.dispatch - Dispatch function for Redux actions.
 * @param {function} params.setShowCopyPlanModal - Function to control copy plan modal visibility.
 * @returns {void} No return value.
 * @description
 *   - Shows loading indicator while the copy plan operation is in progress.
 *   - Determines route based on the current season.
 *   - Adds success or error message to a snack upon completion or failure.
 *   - Navigates to the edit page of the newly copied plan on success.
 */
export const copyPlan = async ({
  planName,
  planCode,
  requestCopyPlan,
  navigate,
  dispatch,
  setShowCopyPlanModal
}) => {
  dispatch(setActionButtonLoader(true));
  try {
    const payload = {
      plan_code: planCode,
      plan_display_name: planName?.trim()
    };

    const response = await requestCopyPlan(payload, dispatch);

    if (response?.data?.status) {
      const data = response.data;
      const successMessage = data.show_message
        ? get(data, "message")
        : SUCCESS_MESSAGE;

      const scenarioPlanCode = get(response, "data.data.new_plan", null);
      navigate(`${PLANNING_SCREEN_ROUTE}/${EDIT}/${scenarioPlanCode}`);

      addSnack({
        message: successMessage,
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      });
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setActionButtonLoader(false));
    setShowCopyPlanModal(false);
  }
};
