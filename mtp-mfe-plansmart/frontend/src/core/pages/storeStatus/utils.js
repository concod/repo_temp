import { cloneDeep, isEqual, capitalize, isNil } from "lodash";
import moment from "moment";
import {
  isDateRangeConflict,
  dateValidationMessage,
} from "core/Utils/functions/helpers/validation-helpers";
import { END_DATE, SKU_STORE_STATUS_START_DATE } from "config/constants";
import store from "store";
import { addSnack } from "core/actions/snackbarActions";

// formats updated status attribute
export const formatAttribute = (
  attributeId,
  params,
  attributeType,
  actionType
) => {
  let setAllObject = {
    attributes: [],
    code: attributeId,
  };
  // creating payload for patch api call
  const attributeObj = {
    time_attr_id: params.data.time_attr_id,
    attribute_name: attributeType,
    attribute_value: params.data[attributeType],
    start_time: params.data[`${attributeType}${"_end_time"}`]
      ? moment(params.data[`${attributeType}${"_start_time"}`]).format(
          "YYYY-MM-DD"
        )
      : SKU_STORE_STATUS_START_DATE,
    end_time: params.data[`${attributeType}${"_end_time"}`]
      ? moment(params.data[`${attributeType}${"_end_time"}`]).format(
          "YYYY-MM-DD"
        )
      : END_DATE,
    action: actionType,
  };
  setAllObject.attributes = [attributeObj];
  return setAllObject;
};

export const checkConflictInAttributeType = (attributeList, attributeType) => {
  const attributeDateRangeList = attributeList?.map((item) => {
    return {
      start_time: item[`${attributeType}${"_start_time"}`],
      end_time: item[`${attributeType}${"_end_time"}`],
    };
  });
  return isDateRangeConflict(attributeDateRangeList, "YYYY-MM-DD", "[]");
};

/**
 * @func
 * @desc Verify if the latest change is a dateChange and a valid date
 * @param {Object} params
 * @returns {Boolean}
 */
export const isDateFieldChangeValid = (params) => {
  let validDateChange = true;
  if (params && moment.isMoment(params.newValue)) {
    const dateObj = moment(params.newValue);
    validDateChange =
      dateObj.isValid() && !Boolean(dateObj.isAfter(END_DATE, "year"));
  } else {
    validDateChange = Boolean(params) || false;
  }

  return validDateChange;
};

export const checkDateValidationInAttributeType = (
  attributeList,
  attributeType
) => {
  let isDateInvalid = false;

  for (let i = 0; i < attributeList.length; i++) {
    const item = attributeList[i];
    if (
      dateValidationMessage(
        item[`${attributeType}${"_start_time"}`],
        item[`${attributeType}${"_end_time"}`]
      )
    ) {
      isDateInvalid = true;
      break;
    }
  }

  return isDateInvalid;
};

/**
 * @func
 * @desc Check if the moment start and end dates are valid
 * @param {Object} attributeList
 * @param {String} attributeType
 * @returns
 */
export const isValidDates = (attributeList, attributeType) => {
  let isDateInvalid = true;
  for (let i = 0; i < attributeList.length; i++) {
    const item = attributeList[i];
    if (
      !moment(item[`${attributeType}${"_start_time"}`]).isValid() ||
      !moment(item[`${attributeType}${"_end_time"}`]).isValid() ||
      moment(item[`${attributeType}${"_start_time"}`]).isAfter(
        END_DATE,
        "year"
      ) ||
      moment(item[`${attributeType}${"_end_time"}`]).isAfter(END_DATE, "year")
    ) {
      isDateInvalid = false;
      break;
    }
  }

  return isDateInvalid;
};

// add deleted attribute in setAllData
export const updateSetAllDataDelete = (item, inputActionObj) => {
  // removing edit action of attribute for which delete action is performed
  item.attributes = item.attributes.filter((value) => {
    return value.time_attr_id != inputActionObj.attributes[0].time_attr_id;
  });
  // adding delete action
  item.attributes = [...item.attributes, inputActionObj.attributes[0]];
  return { item: item, isEdited: true };
};

// update or add edited attribute in setAllData
export const updateSetAllDataEdit = (
  item,
  inputActionObj,
  cellAttributeId,
  isEdited
) => {
  item.attributes = item.attributes.map((attributeObj) => {
    const { time_attr_id } = attributeObj;
    if (isEqual(time_attr_id, cellAttributeId)) {
      // update since attribute is already edited
      isEdited = true;
      attributeObj = { ...inputActionObj.attributes[0] };
    }
    return attributeObj;
  });
  if (!isEdited) {
    // add newly edited attribute object
    isEdited = true;
    item.attributes = [...item.attributes, inputActionObj.attributes[0]];
  }

  return { item, isEdited };
};

export const getUpdatedSetAllData = (
  inputActionObj,
  updateActionType,
  setAllData
) => {
  setAllData = cloneDeep(setAllData);
  const cellCode = inputActionObj.code;
  const cellAttributeId = inputActionObj.attributes[0].time_attr_id;
  let isEdited = false;

  // check if status attribute present in setAllData already
  let updatedSetAllData = setAllData.map((item) => {
    const { code } = item;
    if (isEqual(code, cellCode)) {
      // update in setAllData for corresponding status attribute code
      if (isEqual(updateActionType, "delete")) {
        ({ item, isEdited } = updateSetAllDataDelete(item, inputActionObj));
      } else if (isEqual(updateActionType, "edit")) {
        ({ item, isEdited } = updateSetAllDataEdit(
          item,
          inputActionObj,
          cellAttributeId,
          isEdited
        ));
      }
    }
    return item;
  });

  return { isEdited, updatedSetAllData };
};

export const getListOptions = (optionList) => {
  return optionList.map((item) => {
    return { label: capitalize(item), id: item, value: item };
  });
};

export const dateValidation = (startDate, endDate) => {
  const errMessage = dateValidationMessage(startDate, endDate);
  if (errMessage) {
    store.dispatch(
      addSnack({
        message: errMessage,
        options: {
          variant: "error",
        },
      })
    );
    return false;
  }
  return true;
};

export const getActiveEntityFilter = (dimension) => {
  return {
    attribute_name: "active",
    dimension: dimension,
    values: [true, false],
    operator: "in",
  };
};

export const addCustomStatusDependency = (initialDependency, dimension) => {
  return [...(initialDependency || []), getActiveEntityFilter(dimension)];
};

export const getNextInactiveStatus = (statusObj, dateKey) => {
  const START_TIME = "status_start_time";
  const END_TIME = "status_end_time";
  let dateString = "-";
  if (!isNil(statusObj)) {
    const today = moment();
    const inactiveStatusObj = statusObj.filter(
      (obj) => obj.status === "inactive"
    );

    for (let i = 0; i < inactiveStatusObj.length; i++) {
      const item = inactiveStatusObj[i];
      if (
        moment(item[START_TIME]).isSameOrAfter(today, "day") ||
        (moment(item[START_TIME]).isSameOrBefore(today, "day") &&
          moment(item[END_TIME]).isSameOrAfter(today, "day"))
      ) {
        dateString = moment(item[dateKey]).format("MM-DD-YYYY");
        break;
      }
    }
  }

  return dateString;
};
