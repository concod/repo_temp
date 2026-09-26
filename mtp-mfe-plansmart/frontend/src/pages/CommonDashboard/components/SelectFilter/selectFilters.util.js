import { cloneDeep, get } from "lodash";
import {
  FORM_FIELDS,
  DATE_SELECTION_ERROR_MESSAGE
} from "./selectFilters.constant";
import moment from "moment";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import { getConfigFile } from "../../../CreateNewPlan/createNewPlan.util";

/**
 * Updates the form fields with new options for the selected field.
 * @param {Object} params - Function parameters.
 * @param {Object} params.selectedField - The field to be updated.
 * @param {Array} params.options - New options for the selected field.
 * @param {Array} params.formFields - Existing form fields.
 * @returns {Array} Updated form fields array.
 * @description
 *   - Uses lodash's cloneDeep to ensure original form fields are not mutated.
 *   - Adds new options only if the selected field is found within form fields.
 */
export const getUpdatedFormFields = ({
  selectedField,
  options,
  formFields
}) => {
  const fieldIndex = formFields.findIndex(
    (field) => field.accessor === selectedField.accessor
  );
  let updatedFormFields = [];
  if (fieldIndex > -1) {
    updatedFormFields = cloneDeep(formFields);
    updatedFormFields[fieldIndex].options = [...options];
  }
  return updatedFormFields;
};

/**
 * Generates a configuration object for a selected field.
 * @param {Object} param - An object containing configuration details.
 * @param {Object} param.selectedField - Selected field information.
 * @param {Object} param.fieldsDefaultValues - Default values for fields.
 * @returns {Object} Configuration object containing options, API call details, and payload.
 * @description
 *   - Constructs payload based on dependencies in the filter configuration.
 *   - Formats the response data to an array of label-value pairs.
 */
export const getFieldRequestPayload = ({
  selectedField,
  fieldsDefaultValues
}) => {
  const { accessor } = selectedField;
  const filterConfig = getConfigFile()?.fields[accessor];
  const getPayload = () => {
    const filters = [];
    filterConfig?.filterpayloadDependentOn?.forEach((item) => {
      filters.push({
        attribute_name: item,
        operator: "in",
        values: fieldsDefaultValues[item]
          ? [fieldsDefaultValues[item]]?.flat(1)
          : [],
        filter_type: "cascaded",
        dimension: filterConfig?.dimension
      });
    });
    return {
      attribute_name: accessor,
      application_code: filterConfig?.application_code,
      filter_type: "cascaded",
      filters,
      is_urm_filter: true
    };
  };
  return {
    options: filterConfig?.options || null,
    apiCall: filterConfig?.apiCall,
    apiCallType: filterConfig?.apiCallType,
    requestPayload: filterConfig?.apiCall ? getPayload() : null,
    responseFormatter: (options) =>
      get(options, "data.attribute", []).map(({ attribute }) => ({
        label: attribute,
        value: attribute
      }))
  };
};

/**
 * Transforms an array of filter objects by enhancing them with additional properties.
 * @param {Array<Object>} filters - Array of filter objects each containing configuration properties.
 * @returns {Array<Object>} Array of transformed filter objects with added and renamed properties.
 * @description
 *   - Assigns default values such as `attribute_type`, `disablePast`, etc.
 *   - Maps nested properties such as `extra` if they exist.
 *   - Renames some properties for consistency.
 *   - Ensures each filter object includes properties like `accessor`, `label`, `required`, etc.
 */
export const transformFilterConfig = (filters) => {
  return filters.map((key) => ({
    ...key,
    accessor: key.column_name,
    label: key.label,
    attribute_type: "create_plan",
    column_name: key.column_name,
    field_type: key.display_type,
    filter_type: key.type,
    isDisabled: key.is_disabled,
    required: key.is_mandatory,
    isMulti: key.is_multiple_selection,
    isClearable: key.is_clearable,
    disablePast: true,
    options: key.options,
    dimension: key.dimension,
    isSelectAllButtonHidden: key.extra?.is_selectall_button_hidden,
    extra: key.extra,
    maxLengthLimit: key.extra?.maxLengthLimit
  }));
};

/**
 * Validates the difference between two dates and dispatches an error if invalid
 * @param {Object} fieldsDefaultValues - Contains the default start and end dates.
 * @param {Function} dispatch - Function to dispatch actions.
 * @returns {boolean} Returns true if the date range is valid.
 * @description
 *   - Uses moment.js to compute the difference in months.
 *   - Dispatches a snack message if the date range is invalid.
 */
export const validateYearSelection = (fieldsDefaultValues, dispatch) => {
  const startYear = fieldsDefaultValues[FORM_FIELDS.START_YEAR];
  const startMonth = fieldsDefaultValues[FORM_FIELDS.START_MONTH];
  const endYear = fieldsDefaultValues[FORM_FIELDS.END_YEAR];
  const endMonth = fieldsDefaultValues[FORM_FIELDS.END_MONTH];
  const startDate = moment(`${startYear}-${startMonth}-01`);
  const endDate = moment(`${endYear}-${endMonth}-01`);
  const monthDifference = endDate.diff(startDate, "months");

  if (monthDifference < 0) {
    return dispatch(
      addSnack({
        message: DATE_SELECTION_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  }
  return true;
};

/**
 * Updates default values based on changes and field key
 * @param {Object} params.newDefaultValues - The new set of default values.
 * @param {Object} params.prevDefaultValues - The previous set of default values.
 * @param {string} params.fieldKey - The key indicating which field was changed.
 * @returns {Object} The updated set of default values.
 * @description
 *   - Removes the CLASS field from defaults if the DEPARTMENT field is changed.
 */
export const getUpdatedDefaultValues = ({
  newDefaultValues,
  prevDefaultValues,
  fieldKey
}) => {
  const updatedDefaultValues = cloneDeep(newDefaultValues);

  const filterConfig = getConfigFile()?.fields[fieldKey];
  if (prevDefaultValues[fieldKey] !== newDefaultValues[fieldKey]) {
    filterConfig?.reportFilterDependency?.forEach((dependency) => {
      delete updatedDefaultValues[dependency];
    });
  }
  return updatedDefaultValues;
};
