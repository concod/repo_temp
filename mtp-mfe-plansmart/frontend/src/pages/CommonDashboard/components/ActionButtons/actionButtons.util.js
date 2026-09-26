//createNewPlan button function
import {
  CREATE_NEW_PLAN,
  REVIEW_IN_SEASON
} from "../SelectFilter/selectFilters.constant";
import { DASHBOARD_PAGES, FORM_FIELDS } from "../../dashboard.constant";

/**
 * Determines the review or plan action based on the selected screen name.
 * @param {string} selectedScreenName - The name of the selected screen.
 * @returns {string} Returns a specific action string based on the selected screen.
 * @description
 *   - Returns 'REVIEW_IN_SEASON' if the selected screen is 'IN_SEASON'.
 *   - Returns 'CREATE_NEW_PLAN' for any other selected screen.
 */
export const getButtonName = (selectedScreenName) => {
  return selectedScreenName === DASHBOARD_PAGES.IN_SEASON
    ? REVIEW_IN_SEASON
    : CREATE_NEW_PLAN;
};

/**
 * Extracts and formats data from selectedRows to create a payload object.
 * @param {Array} selectedRows - Array of objects containing data from selected rows.
 * @returns {Object} Payload object with extracted and formatted data.
 * @description
 *   - Handles potential null or undefined selectedRows.
 *   - Converts comma-separated string to an array for classes.
 *   - Parses start and end years to integers.
 */
export const getRequestPayload = (selectedRows, formFields) => {
  const data = selectedRows?.[0]?.data;
  const result = formFields?.reduce((acc, field) => {
    const name = field.accessor;
    const value =
      name === FORM_FIELDS.START_YEAR || name === FORM_FIELDS.END_YEAR
        ? parseInt(data[name], 10)
        : data[name];
    acc[name] = value;
    return acc;
  }, {});

  return result;
};
