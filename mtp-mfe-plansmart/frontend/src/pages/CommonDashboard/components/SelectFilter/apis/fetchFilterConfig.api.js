import { get } from "lodash";
import { setFilterLoader, setformFields } from "../../../dashboard.slice";
import { transformFilterConfig } from "../selectFilters.util";
import { POST_API_METHOD, GET_API_METHOD } from "../selectFilters.constant";
import { fetchFormFieldDataApi } from "./fetchFormFieldData.api";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import { DASHBOARD_PAGES } from "../../../dashboard.constant";

/**
 * Fetches and sets up filter configurations.
 * @param {string} planningScreenName - Name of the planning screen.
 * @param {string} filterConfigUrl - The URL to fetch filter configurations from.
 * @param {Object} filterConfigPayload - Payload used when fetching filter configurations.
 * @returns {Function} An asynchronous dispatch function.
 * @description
 *   - Uses the post method if the planningScreenName is "TARGET_PLAN", otherwise uses the get method.
 *   - Transforms filterData into form fields.
 *   - Fetches department options if the planning screen is not "TARGET_PLAN".
 */
export const fetchFilterConfig = (
  planningScreenName,
  filterConfigUrl,
  filterConfigPayload
) => async (dispatch) => {
  try {
    dispatch(setFilterLoader(true));

    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: filterConfigUrl,
        method:
          planningScreenName === DASHBOARD_PAGES.TARGET_PLAN
            ? POST_API_METHOD
            : GET_API_METHOD,
        data: filterConfigPayload
      },
      dispatch: dispatch
    });
    const filterData = get(response, "data.data", []);
    const formFields = transformFilterConfig(filterData);

    dispatch(setformFields(formFields));
    return formFields;
  } catch (error) {
    dispatch(
      addSnack({
        message: `Error in fetching filters for ${planningScreenName} plans`,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setFilterLoader(false));
  }
};
