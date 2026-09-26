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
