import { cloneDeep, get } from "lodash";
import {
  FORM_FIELDS,
  PLAN_STAGE_CONSTANTS,
  CREATE_TARGET_PLAN_STATUS_PAYLOAD,
  MAX_DATE_SELECTION_ERROR_MESSAGE,
  MIN_DATE_SELECTION_ERROR_MESSAGE,
  MAX_YEAR_SELECTION_ERROR_MESSAGE,
  SEQUENTIAL_SELECTION_ERROR_MESSAGE,
  CREATE_TARGET_PLAN_FILTER_CONFIG_URL,
  CREATE_PLAN_FILTER_CONFIG_URL,
  DATATYPE,
  YYYY_MM_DD,
  CLIENT
} from "./createNewPlan.constant";
import {
  FETCH_FORM_FIELDS_MODEL_API_DATA,
  TARGET_PLAN_FORM_FIELDS_MODEL_API_DATA
} from "constants/modalApi.constant";
import moment from "moment";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import { DASHBOARD_PAGES } from "../CommonDashboard/dashboard.constant";
import { setFormFields, setLoader } from "./createNewPlan.slice";
import { fetchFormFieldDataApi } from "./apis/fetchFormFieldData.api";
import partycityCreatePlanValidation from "./data/partycityCreatePlanValidation.json";
import arhausCreatePlanValidation from "./data/arhausCreatePlanValidation.json";
import tommybahamasCreatePlanValidation from "./data/tommybahamasCreatePlanValidation.json";
import peterMillarCreatePlanValidation from "./data/peterMillarCreatePlanValidation.json";
import { PLANNING_SCREEN_ROUTE } from "../../constants/route.constant";
import defaultFilterConfiguration from "./data/defaultFilterConfiguration.json";

/**
 * Validates if the selected value does not exceed a specified limit.
 * @example
 * validateSelection('2022', ['2021', '2022'], dispatchFunction, 1)
 * false
 * @param {string[]} selectedValue - Array of selected values.
 * @param {Array} options - Available options for selection.
 * @param {Function} formDispatch - Function to dispatch the form state.
 * @param {number} limit - Maximum allowable selections.
 * @returns {boolean} Returns true if validation passes, otherwise false.
 * @description
 *   - Dispatches an error message if the selected values exceed the limit.
 */
export const maxLengthLimitValidation = (
  selectedValue,
  options,
  formDispatch,
  limit
) => {
  if (selectedValue?.length > limit) {
    formDispatch(
      addSnack({
        message: MAX_YEAR_SELECTION_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
    return false;
  }
  return true;
};

/**
 * Checks if selected options are sequential in their IDs.
 * @example
 * function(selectedValues, options, formDispatch)
 * true
 * @param {Array} selectedValues - Array of selected values.
 * @param {Array} options - Array of option objects to check.
 * @param {Function} formDispatch - Function to dispatch form actions.
 * @returns {boolean} True if all option IDs are sequential.
 * @description
 *   - Sequential IDs mean each option's ID is incremented by one from the previous.
 *   - If IDs are not sequential, an error snack is dispatched.
 */
export const sequentialSelectionValidation = (
  selectedValues,
  options,
  formDispatch
) => {
  const isSequential = options.reduce(
    (acc, option, index, arr) => {
      if (!acc.isSequential) return acc; // If already found non-sequential, skip further checks
      const id = option?.extra?.id;
      if (index < arr.length - 1 && !(id + 1 === arr[index + 1]?.extra?.id)) {
        formDispatch(
          addSnack({
            message: SEQUENTIAL_SELECTION_ERROR_MESSAGE,
            options: {
              variant: SNACK_VARIANT.ERROR
            }
          })
        );
        return { isSequential: false, lastId: id };
      }
      return { isSequential: true, lastId: id };
    },
    { isSequential: true, lastId: null }
  );

  return isSequential.isSequential; // Return true if all indices are sequential
};

/**
 * Validates date range selection based on the provided fields.
 * @example
 * validateDateRange(fieldsDefaultValues, formDispatch, validationFields)
 * true
 * @param {Object} fieldsDefaultValues - Object containing default values of form fields.
 * @param {Function} formDispatch - Function to dispatch form actions.
 * @param {Array} validationFields - Array containing the field keys to validate start and end dates.
 * @returns {boolean} Returns true if the date range is valid, otherwise dispatches an error snack and returns false.
 * @description
 *   - Validates whether the selected date range is within 1 to 24 months.
 *   - Dispatches appropriate snack messages for errors.
 */
export const durationValidation = (
  fieldsDefaultValues,
  formDispatch,
  validationFields
) => {
  const startYear = fieldsDefaultValues[validationFields[0]];
  const startMonth = fieldsDefaultValues[validationFields[1]];
  const endYear = fieldsDefaultValues[validationFields[2]];
  const endMonth = fieldsDefaultValues[validationFields[3]];
  const startDate = moment(`${startYear}-${startMonth}-01`);
  const endDate = moment(`${endYear}-${endMonth}-01`);
  const monthDifference = endDate.diff(startDate, "months");

  if (monthDifference < 0) {
    formDispatch(
      addSnack({
        message: MIN_DATE_SELECTION_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
    return false;
  }

  if (monthDifference > 24) {
    return formDispatch(
      addSnack({
        message: MAX_DATE_SELECTION_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  }
  return true;
};

const validationFunctionsNames = {
  maxLengthLimitValidation,
  sequentialSelectionValidation,
  durationValidation
};

/**
 * Updates the options of a selected field in form fields
 * // returns updated form fields with the new options for the selected field
 * @param {Object} params.selectedField - Object representing the field to update.
 * @param {Array} params.options - Array of new options for the selected field.
 * @param {Array} params.formFields - Array of form fields to be updated.
 * @returns {Array} Updated form fields with the new options for the selected field.
 * @description
 *   - Uses deep cloning to avoid mutation of the original form fields.
 *   - Updates only if the selected field is found in the form fields.
 */
export const getUpdatedFormFields = ({
  selectedField,
  options,
  formFields
}) => {
  const fieldIndex = formFields.findIndex(
    (field) => field.accessor === selectedField.accessor
  );
  const updatedFormFields = cloneDeep(formFields);
  if (fieldIndex > -1) {
    updatedFormFields[fieldIndex].options = [...options];
  }
  return updatedFormFields;
};

export const getCreatePlanRequestPayload = ({
  fields,
  fieldsDefaultValues,
  dispatch,
  selectedScreenName
}) => {
  const attribute = fields.map((field) => {
    let value = fieldsDefaultValues[field.accessor];
    const name = field.accessor;
    const createPlanValidation = getConfigFile();
    const createPlanConfig = createPlanValidation.fields;
    for (const key in createPlanConfig) {
      const filterConfig = createPlanConfig[key];
      if (key === name) {
        if (key === FORM_FIELDS.PLAN_STAGE) {
          value = PLAN_STAGE_CONSTANTS[fieldsDefaultValues[field.accessor]];
        } else {
          if (filterConfig.dataType === DATATYPE.ARRAY) {
            if (!value) {
              value = [];
            } else if (!Array.isArray(value)) {
              value = [value];
            }
          } else if (filterConfig.dataType === DATATYPE.MOMENT) {
            value = value.map((item) => {
              return item.format(YYYY_MM_DD);
            });
          } else {
            value = value;
          }
        }
      }
    }

    return {
      attribute_name: name,
      attribute_value: value,
      dimension: field.dimension || ""
    };
  });

  const attributes =
    selectedScreenName === DASHBOARD_PAGES.TARGET_PLAN
      ? [...attribute, CREATE_TARGET_PLAN_STATUS_PAYLOAD]
      : attribute;

  return {
    overwrite: false,
    attributes
  };
};

/**
 * Validates fields against their required status and default values.
 * @param {Object} fields - An array of field objects.
 * @param {Object} fieldsDefaultValues - An object representing default values of the fields.
 * @param {Object} selectedField - The currently selected field object.
 * @returns {boolean} True if all fields pass validation, otherwise false.
 * @description
 * - Performs special validation for fields with the accessor of FORM_FIELDS.PLAN_STAGE.
 */
export const validateForm = ({
  fields,
  fieldsDefaultValues,
  selectedField
}) => {
  return fields.every((field) => {
    if (
      field.required &&
      field.accessor === FORM_FIELDS.PLAN_STAGE &&
      fieldsDefaultValues[field.accessor]
    ) {
      return true;
    }
    return !(field.required && !fieldsDefaultValues[field.accessor]);
  });
};

/**
 * Validates selected field(s) based on configuration rules.
 *
 * @param {Object} fields - Collection of current field values.
 * @param {Object} fieldsDefaultValues - Default values for fields.
 * @param {Object} selectedField - The currently selected field.
 * @param {Function} formDispatch - Function to dispatch form updates.
 * @returns {boolean} True if validation passes, false otherwise.
 * @description
 *   - Uses configuration rules for both single and group field validations.
 *   - Employs specific validation functions based on the type of validation required.
 */
export const validateField = ({
  fields,
  fieldsDefaultValues,
  selectedField,
  formDispatch
}) => {
  const createPlanValidation = getConfigFile();
  if (Object.keys(selectedField).length > 0) {
    const fieldValidationObj =
      createPlanValidation?.fields[selectedField]?.field_validation;
    const fieldValidation = Object.keys(fieldValidationObj);
    //Logic For single field validation
    if (fieldValidation.length > 0) {
      return fieldValidation.every((item) => {
        return validationFunctionsNames[item](
          fieldsDefaultValues[selectedField],
          fieldsDefaultValues[`${selectedField}_options`],
          formDispatch,
          fieldValidationObj[item]
        );
      });
    }

    const groupValidationObj =
      createPlanValidation?.fields[selectedField]?.group_field_validation;
    //Logic For Group field validation
    if (groupValidationObj.length > 0) {
      const validationStatus = groupValidationObj[0].fields.every((field) => {
        return field in fieldsDefaultValues;
      });

      if (validationStatus) {
        return validationFunctionsNames[groupValidationObj[0].type](
          fieldsDefaultValues,
          formDispatch,
          groupValidationObj[0].fields
        );
      }
    }
  }

  return true;
};

/**
 * Transforms an array of filter objects by mapping specific keys to new properties.
 * @param {Array} filters - Array of filter objects to be transformed.
 * @returns {Array} Transformed array of filter objects with additional properties.
 * @description
 *   - Adds fixed properties like `attribute_type` and `disablePast` to each filter object.
 *   - Extracts and maps `extra` object properties if they exist.
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
    maxLengthLimit: key.extra?.maxLengthLimit,
    dependentOn: key.extra?.dependentOn,
    apiEndPoint: key.extra?.apiEndPoint,
    maxSelectionLimit: key.extra?.maxSelectionLimit,
    sequentialSelection: key.extra?.sequentialSelection,
    validationRules: key.extra?.validation_rules
  }));
};

/**
 * Updates default values and form fields based on dependencies and validation rules.
 * @param {Object} params.newDefaultValues - Current default values for the form fields.
 * @param {Object} params.updatedDefaultValues - Updated default values to return.
 * @param {Array} params.updatedFormFields - Form fields that will be updated.
 * @param {Object} params.createPlanValidation - Validation rules and dependencies.
 * @param {string} params.fieldKey - Identifier for the current form field.
 * @returns {Object} Updated default values and form fields.
 * @description
 *   - Removes dependencies and their options from updated default values.
 *   - Updates form fields with defults from the validation rules if they exist.
 */
const resetDependentFields = ({
  newDefaultValues,
  updatedDefaultValues,
  updatedFormFields,
  createPlanValidation,
  fieldKey
}) => {
  createPlanValidation?.fields[fieldKey]?.itHasDependency?.forEach(
    (dependency) => {
      delete updatedDefaultValues[dependency];
      delete updatedDefaultValues[`${dependency}_options`];
      const index = updatedFormFields.findIndex(
        (formField) => formField.column_name === dependency
      );
      if (
        Object.keys(createPlanValidation?.fields[fieldKey]?.validation_rules)
          .length !== 0
      ) {
        updatedFormFields[index] = {
          ...updatedFormFields[index],
          ...createPlanValidation?.fields[dependency]?.defults
        };
      }
    }
  );

  return { updatedDefaultValues, updatedFormFields };
};

/**
 * Updates default values based on field dependencies.
 * @param {Object} params - The input parameters.
 * @param {Object} params.newDefaultValues - New default values.
 * @param {Object} params.updatedDefaultValues - Updated default values.
 * @param {Object} params.createPlanValidation - Configuration for plan validation.
 * @param {string} params.fieldKey - The key of the current field.
 * @returns {Object} The updated default values.
 * @description
 *   - Applies only if the dependent field is disabled and dependent on the current field.
 *   - Uses `moment` to format dates based on season options.
 *   - Sets the dependency field to an empty array before updating values.
 */
const updateDisabledFields = ({
  newDefaultValues,
  updatedDefaultValues,
  createPlanValidation,
  fieldKey
}) => {
  createPlanValidation?.fields[fieldKey]?.itHasDependency?.forEach(
    (dependency) => {
      if (
        createPlanValidation?.fields[dependency]?.defults?.is_disabled &&
        createPlanValidation?.fields[dependency]?.dependentOn[0] === fieldKey
      ) {
        updatedDefaultValues[dependency] = [];

        updatedDefaultValues[dependency][0] = moment(
          updatedDefaultValues?.season_options[0]?.extra?.season_start_date,
          "YYYY_MM_DD"
        );
        updatedDefaultValues[dependency][1] = moment(
          updatedDefaultValues?.season_options[
            updatedDefaultValues?.season_options.length - 1
          ]?.extra?.season_end_date,
          "YYYY_MM_DD"
        );
      }
    }
  );

  return updatedDefaultValues;
};

/**
 * Handles updating default values and form fields based on field dependencies and validation rules.
 * @param {Object} params - The function parameters.
 * @param {Object} params.newDefaultValues - The new default values.
 * @param {Object} params.prevDefaultValues - The previous default values.
 * @param {string} params.fieldKey - The key of the field being updated.
 * @param {Array} params.formFields - The current form fields.
 * @param {function} params.formDispatch - The dispatch function for form actions.
 * @returns {Object} The updated default values.
 * @description
 *   - Resets and updates dependent fields based on the given configuration.
 *   - Fetches and updates options for fields with payload dependencies.
 *   - Applies validation rules including enabling/disabling fields.
 *   - Updates default values and selected options for fields with "select all" rules.
 */
export const getUpdatedDefaultValues = async ({
  newDefaultValues,
  prevDefaultValues,
  fieldKey,
  formFields,
  formDispatch
}) => {
  let updatedDefaultValues = cloneDeep(newDefaultValues);
  let updatedFormFields = cloneDeep(formFields);
  const createPlanValidation = getConfigFile();

  // Reset dependent fields
  if (createPlanValidation?.fields[fieldKey]?.itHasDependency?.length > 0) {
    ({ updatedDefaultValues, updatedFormFields } = resetDependentFields({
      newDefaultValues,
      updatedDefaultValues,
      updatedFormFields,
      createPlanValidation,
      fieldKey
    }));

    // Update disabled fields
    updatedDefaultValues = updateDisabledFields({
      newDefaultValues,
      updatedDefaultValues,
      createPlanValidation,
      fieldKey
    });
  }
  const dependencyPromises = createPlanValidation?.fields[
    fieldKey
  ]?.itHaspayloadDependency?.map(async (dependency) => {
    formDispatch(setLoader(true));
    const FormFields = await formDispatch(
      fetchFormFieldDataApi({
        selectedField: { accessor: dependency },
        fieldsDefaultValues: {
          ...updatedDefaultValues
        },
        formFields: updatedFormFields
      })
    );

    const { options } = FormFields.filter(
      (item) => item.column_name === dependency
    )[0];

    const index = updatedFormFields.findIndex(
      (formField) => formField.column_name === dependency
    );
    updatedFormFields[index].options = options;

    if (options.length == 1) {
      updatedDefaultValues[dependency] = options.map((item) => item.value);
      updatedDefaultValues[`${dependency}_options`] = options;
      updatedFormFields[index].selectedOptions = options;
    }

    const validationRules =
      createPlanValidation?.fields[fieldKey]?.validation_rules;
    if (validationRules) {
      const ruleKeys = Object.keys(validationRules);
      for (const key of ruleKeys) {
        if (newDefaultValues[fieldKey] === key || key?.includes("*")) {
          const rules = validationRules[key];
          for (const field of Object.keys(rules)) {
            const ValidationIndex = updatedFormFields.findIndex(
              (formField) => formField.column_name === field
            );
            updatedFormFields[ValidationIndex] = {
              ...updatedFormFields[ValidationIndex],
              ...rules[field]
            };

            //Need generic logic to disable l3 field when user selects multiple classes
            if (updatedDefaultValues["l2_name"]?.length >= 2) {
              updatedFormFields[8] = {
                ...updatedFormFields[8],
                is_disabled: true,
                isDisabled: true
              };
            }
            // Code for all select
            if (rules[field]?.by_defult_all_select_) {
              const { options } = FormFields.filter(
                (item) => item.column_name === field
              )[0];

              updatedDefaultValues[field] = options?.map((item) => item.value);
              updatedDefaultValues[`${field}_options`] = options;
              updatedFormFields[ValidationIndex].selectedOptions = options;

              updatedDefaultValues = updateDisabledFields({
                newDefaultValues,
                updatedDefaultValues,
                createPlanValidation,
                fieldKey: field
              });
            }
          }
        }
      }
    }
  });
  await Promise.all(dependencyPromises);
  formDispatch(setLoader(false));
  formDispatch(setFormFields(updatedFormFields));
  return updatedDefaultValues;
};

/**
 * Returns the appropriate form fields model API data based on the selected screen name.
 * @param {string} selectedScreenName - The name of the selected screen.
 * @returns {object} The form fields model API data for the given screen.
 * @description
 *   - Uses a ternary operator to determine which form fields model to return.
 *   - Relies on predefined constants: DASHBOARD_PAGES, TARGET_PLAN_FORM_FIELDS_MODEL_API_DATA, and FETCH_FORM_FIELDS_MODEL_API_DATA.
 */
export const getModalApiData = (selectedScreenName) => {
  return selectedScreenName === DASHBOARD_PAGES.TARGET_PLAN
    ? TARGET_PLAN_FORM_FIELDS_MODEL_API_DATA
    : FETCH_FORM_FIELDS_MODEL_API_DATA;
};

/**
 * Determines the appropriate URL based on the selected screen name.
 * @param {string} selectedScreenName - The name of the selected screen.
 * @returns {string} The URL corresponding to the selected screen name.
 * @description
 *   - Checks if the selected screen name is equivalent to the target plan page.
 */
export const getFilterUrl = (selectedScreenName) => {
  return selectedScreenName === DASHBOARD_PAGES.TARGET_PLAN
    ? CREATE_TARGET_PLAN_FILTER_CONFIG_URL
    : CREATE_PLAN_FILTER_CONFIG_URL;
};

/**
 * Generates a URL for editing a plan based on the given plan code.
 * @param {string} url - The URL used to map to a season type.
 * @param {string} planCode - The code of the plan to be edited.
 * @returns {string} The complete URL for the plan editing screen.
 * @description
 *   - Utilizes mappings to determine the correct season type and planning screen URL.
 */
export const getPlanningScreenRedirectUrl = (url, planCode) => {
  return `${PLANNING_SCREEN_ROUTE}/edit/${planCode}`;
};

/**
 * Returns a function based on the presence of "arhaus" in the baseUrl.
 * @param {none} none - This function does not take any arguments.
 * @returns {function} Returns either arhausCreatePlanValidation or partycityCreatePlanValidation function.
 * @description
 *   - Reads `baseUrl` from the window's localStorage.
 *   - Chooses the validation function based on the content of the `baseUrl`.
 */
// TODO:Move the JSON files to backend and call api to retrieve the specific JSON data.
//Jira ticket: https://impactanalytics.atlassian.net/browse/MTP-55498
export const getConfigFile = () => {
  const { baseUrl } = window.localStorage;
  switch (true) {
    case baseUrl?.includes("arhaus"):
      return arhausCreatePlanValidation;
    case baseUrl?.includes("partycity"):
      return partycityCreatePlanValidation;
    case baseUrl?.includes("ootb-plansmart"):
      return arhausCreatePlanValidation;
    case baseUrl?.includes("tommy-bahama"):
      return tommybahamasCreatePlanValidation;
    case baseUrl?.includes("petermillar"):
      return peterMillarCreatePlanValidation;
    default:
      return arhausCreatePlanValidation;
  }
};

export const getMockDataforFilters = (planValidationJson) => {
  // Create an array to store the 'defults' objects
  let defaultsArray = [];

  // Loop through each field in the 'fields' object
  for (const key in planValidationJson.fields) {
    if (planValidationJson.fields.hasOwnProperty(key)) {
      // Check if the 'defults' key exists for the field
      if (planValidationJson.fields[key].defults) {
        defaultsArray.push(planValidationJson.fields[key].defults);
      }
    }
  }

  defaultsArray = [...defaultFilterConfiguration, ...defaultsArray];

  return defaultsArray;
};
