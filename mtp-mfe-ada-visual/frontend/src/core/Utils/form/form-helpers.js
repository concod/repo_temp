import { cloneDeep } from "lodash";
import {
  INPUT_VALIDATION_REGEX,
  INPUT_WITH_SPECIAL_CHARACTERS_REGEX,
  INPUT_VALIDATION_WARNING,
  INPUT_WITH_SPECIAL_CHARACTERS_WARNING,
} from "./formConstants";


/**
 * removes row fields from field list for particular fieldId and rowId
 * @param {array} fieldList - form list which is sent to form
 * @param {int} fieldId - field id to be removed. ex. status, type
 * @param {int} rowId - row id
 * @returns array - returns an updated form list
 */
export const deleteFieldRow = (fieldList, fieldId, rowId) => {
  let updatedFieldList = cloneDeep(fieldList);

  updatedFieldList = updatedFieldList.map((section) => {
    if (section.id === fieldId) {
      section.fields = section.fields.filter(
        (field) => !field.accessor.endsWith(rowId)
      );
    }
    return section;
  });
  return updatedFieldList;
};

/**
 * removes fields from form data object which match the fieldId and rowId
 * @param {object} formData - form data object
 * @param {int} fieldId - field id to be removed. ex. status, type
 * @param {int} rowId - row id
 * @returns object - returns an updated form data object
 */
export const updateFormData = (formData, fieldId, rowId) => {
  let updatedFormData = {};
  Object.keys(formData).forEach((key) => {
    if (!(key.startsWith(fieldId) && key.endsWith(rowId))) {
      updatedFormData = { ...updatedFormData, [key]: formData[key] };
    }
  });
  return updatedFormData;
};

/**
 * creates and returns a delete icon field based on id and row number
 * @param {int} id - field id ex. status, type
 * @param {int} rowCount - row number
 * @param {boolean} isDisabled - count of string type
 * @returns object - returns an object
 */
export const getDeleteRowField = (id, rowCount, isDisabled) => {
  return {
    field_type: "deleteRow",
    accessor: `${"delete_"}${id}${"_"}${rowCount}`,
    disabled: isDisabled,
  };
};

export const transformFiltersData = (fields) => {
  let cloneFiltersData = cloneDeep(fields);
  cloneFiltersData = cloneFiltersData.map((item) => {
    if (item.display_type === "dropdown") {
      item.isClearable = item.is_clearable;
      item.isDisabled = item.is_disabled;
      item.isMulti = item.is_multiple_selection;
      item.isSelectAllButtonHidden = item.extra?.is_selectall_button_hidden;
    }
    item.options = item.initialData;
    item.accessor = item.column_name;
    item.field_type = item.display_type;
    item.autoSize = false;

    return item;
  });
  return cloneFiltersData;
};

export const getDefaultFilterValues = (initiallySelectedFields) => {
  // update the format of intial selection required by form component
  let cloneInititalSelection = cloneDeep(initiallySelectedFields);
  let defaultFilterValues = {};

  cloneInititalSelection.forEach((item) => {
    defaultFilterValues = {
      ...defaultFilterValues,
      [item.filter_id]: item.values,
    };
  });

  return defaultFilterValues;
};

/** Input validation for textfields : Checks for valid Characters [Alphanumeric characters, underscores (_), and dashes (-)], and string limit
 * @param {string} input - string added to textfield by the user
 * @param {number} minLimit - minimum length of the string required, defaults to 4
 * @param {number} maxLimit - maximum length of the string required, defaults to 30
 * @param {function} addSnack - function to display snackbar
 * @param {boolean} isChatValidation - flag to check for chat validation
 * @returns boolean - returns a boolean
 */
export const isTextInputValid = (
  input,
  minLimit = 4,
  maxLimit = 30,
  addSnack,
  isChatValidation = false
) => {
  const validPattern = isChatValidation ? INPUT_WITH_SPECIAL_CHARACTERS_REGEX : INPUT_VALIDATION_REGEX;
  const message = isChatValidation
    ? INPUT_WITH_SPECIAL_CHARACTERS_WARNING
    : INPUT_VALIDATION_WARNING;

  if (!validPattern.test(input)) {
    addSnack({
      message: message,
      options: {
        variant: "error",
      },
    });
    return false;
  }

  if (input.length < minLimit || input.length > maxLimit) {
    addSnack({
      message: `Input length must be between ${minLimit} and ${maxLimit} characters.`,
      options: {
        variant: "error",
      },
    });
    return false;
  }
  return true;
};
