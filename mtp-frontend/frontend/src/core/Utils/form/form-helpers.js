import { cloneDeep } from "lodash";

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
    if (!key.endsWith(rowId)) {
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

/** Input validation for textfields : Checks for valid Characters [Alphanumeric characters, underscores (_), and dashes (-)], and string limit
 * @param {string} input - string added to textfield by the user
 * @param {int} minLimit - minimum length of the string required, defaults to 4
 * @param {boolean} maxLimit - maximum length of the string required, defaults to 30
 * @param {function} addSnack - function to display snackbar
 * @returns boolean - returns a boolean
*/
export const isTextInputValid = (
  input,
  minLimit = 4,
  maxLimit = 30,
  addSnack
) => {
  const validPattern = /^(?!\s*$)[a-zA-Z0-9 _-]+$/;
  if (!validPattern.test(input)) {
    addSnack({
      message:
        "Only alphanumeric, underscores (_), and dashes (-) are allowed.",
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