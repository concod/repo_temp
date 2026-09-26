import { get } from "lodash";
import {
  PLAN_DELETE_SUCCESS_MESSAGE,
  PLAN_DELETE_ERROR_MESSAGE
} from "./deletePlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { addSnack } from "actions/snackbarActions";
import { setActionButtonLoader } from "../../../dashboard.slice";

/**
 * Handles the deletion of selected plans
 * @param {Object} params - The parameters for the function.
 * @param {Array} params.selectedRows - Rows selected for deletion.
 * @param {Function} params.deletePlanApi - API function to delete plans.
 * @param {Object} params.history - Browser history object.
 * @param {Function} params.dispatch - Redux dispatch function.
 * @param {string} params.selectedScreenName - Name of the selected screen.
 * @param {Function} params.setShowDeletePlanDialogue - Function to toggle delete dialogue visibility.
 * @returns {Promise<void>} No return value.
 * @description
 *   - Sets a loader while deleting plans.
 *   - Constructs payload from selected rows and calls delete API.
 *   - Displays success or error snack message based on the API response.
 *   - Always resets the loader and dialogue visibility after operation completion.
 */
export const onDeletePlan = async ({
  selectedRows,
  deletePlanApi,
  dispatch,
  selectedScreenName,
  setShowDeletePlanDialogue
}) => {
  dispatch(setActionButtonLoader(true));
  try {
    const planCodes = selectedRows?.map((rowData) => rowData?.data?.plan_code);

    const payload = {
      plan_codes: planCodes
    };

    const response = await deletePlanApi(payload, selectedScreenName, dispatch);

    if (response?.data?.status) {
      const { data } = response;
      const successMessage = data.show_message
        ? get(data, "message")
        : PLAN_DELETE_SUCCESS_MESSAGE;
      dispatch(
        addSnack({
          message: successMessage,
          options: {
            variant: SNACK_VARIANT.SUCCESS
          }
        })
      );
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: PLAN_DELETE_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setActionButtonLoader(false));
    setShowDeletePlanDialogue(false);
  }
};
