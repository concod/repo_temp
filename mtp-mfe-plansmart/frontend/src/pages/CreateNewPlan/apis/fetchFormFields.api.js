import { get } from "lodash";
import axiosInstance from "core/Utils/axios";
import { setFormFields, setLoader } from "../createNewPlan.slice";
import {
  transformFilterConfig,
  getFilterUrl,
  getMockDataforFilters
} from "../createNewPlan.util";
import { API_METHOD } from "constants/api.constant";
import { ERROR_MESSAGE } from "../createNewPlan.constant";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
/**
 * Dispatches actions to handle API request and response
 * @param {function} dispatch - Redux dispatch function.
 * @returns {Promise<void>} - Resolves when API call and subsequent actions are complete.
 * @description
 *   - Sets loader state before and after the API call.
 *   - Parses API response data and transforms it into form fields.
 *   - Handles errors by dispatching a snack notification.
 *   - FYI: Use getMockDataforFilters function for mocking filters and config data from peterMillarCreatePlanValidation file
 */
export const fetchFormFieldsApi = (selectedScreenName) => async (dispatch) => {
  try {
    dispatch(setLoader(true));

    const apiRequest = await axiosInstance({
      url: getFilterUrl(selectedScreenName),
      method: API_METHOD.GET
    });
    const apiResponse = get(apiRequest, "data.data", []);

    const formFields = transformFilterConfig(apiResponse);
    dispatch(setFormFields(formFields));
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
    dispatch(setLoader(false));
  }
};
