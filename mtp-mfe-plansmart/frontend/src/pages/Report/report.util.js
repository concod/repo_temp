import { cloneDeep, get } from "lodash";
import { FORM_FIELDS, DATE_SELECTION_ERROR_MESSAGE } from "./report.constant";
import moment from "moment";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import { getConfigFile } from "../CreateNewPlan/createNewPlan.util";

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

export const getFieldRequestPayload = ({
  selectedField,
  fieldsDefaultValues
}) => {
  const { accessor } = selectedField;

  const filterConfig = getConfigFile()?.fields[accessor];
  const getPayload = () => {
    const filters = [];
    filterConfig?.payloadDependentOn?.forEach((item) => {
      const values = fieldsDefaultValues[item];
      filters.push({
        attribute_name: item,
        operator: "in",
        values: values ? (Array.isArray(values) ? values : [values]) : [],
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

export const getUpdatedDefaultValues = ({
  newDefaultValues,
  prevDefaultValues,
  fieldKey
}) => {
  const updatedDefaultValues = cloneDeep(newDefaultValues);

  if (prevDefaultValues[fieldKey] !== newDefaultValues[fieldKey]) {
    const filterConfig = getConfigFile()?.fields[fieldKey];

    filterConfig?.reportFilterDependency?.forEach((dependency) => {
      delete updatedDefaultValues[dependency];
    });
  }
  return updatedDefaultValues;
};

export const generateReportPayload = ({ fields, fieldsDefaultValues }) => {
  const payload = {};

  fields.forEach((item) => {
    const value = fieldsDefaultValues[item?.accessor];
    payload[item?.accessor] = Array.isArray(value)
      ? value
      : value
      ? [value]
      : [];
  });
  return payload;
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

  if (monthDifference < 1) {
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
