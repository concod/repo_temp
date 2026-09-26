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

export const checkConflictInAttributeType = (attributeList) => {
  let nonEmptyDates = attributeList.filter((item) => {
    return item[`start_date`] && item[`end_date`];
  });
  const attributeDateRangeList = nonEmptyDates?.map((item) => {
    // Newly Added
    return {
      start_time: item[`start_date`],
      end_time: item[`end_date`],
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

export const checkDateValidationInAttributeType = (attributeList) => {
  let isDateInvalid = false;

  for (let i = 0; i < attributeList.length; i++) {
    const item = attributeList[i];
    if (
      // Newly added !
      item[`start_date`] &&
      item[`end_date`] &&
      dateValidationMessage(item[`start_date`], item[`end_date`])
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
      !moment(item[`start_date`]).isValid() ||
      !moment(item[`end_date`]).isValid() ||
      moment(item[`start_date`]).isAfter(END_DATE, "year") ||
      moment(item[`end_date`]).isAfter(END_DATE, "year")
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

export const STORE_DETAIL_PANEL_OPTIONS = [
  { label: "DC Only", value: "dc" },
  { label: "PO Only", value: "po" },
  { label: "DC+PO", value: "dc_po" },
];

export const getDefaultRows = (id, defaultRowConfig = {}) => {
    const newRow = {
      // Use configuration values where available
      end_date: defaultRowConfig.end_date || null,
      start_date: defaultRowConfig.start_date || null,
      id: id || 0,
      source: defaultRowConfig.source || 'dc',
      // Names - use configuration values
      store_store_groups_mapped: defaultRowConfig.store_store_groups_mapped || "0/0",
      product_profile: defaultRowConfig.product_profile || "-",
      dc_store_rule_name: defaultRowConfig.dc_store_rule_name || "-",
      auto_allocation_rule_name: defaultRowConfig.auto_allocation_rule_name || "-",
      auto_allocation_schedular_name: defaultRowConfig.auto_allocation_schedular_name || "-",
      // IDs - use configuration values
      default_store_groups: defaultRowConfig.default_store_groups || [],
      default_product_profile: defaultRowConfig.default_product_profile || null,
      dc_store_rule: defaultRowConfig.dc_store_rule || null,
      auto_allocation_rule: defaultRowConfig.auto_allocation_rule || null,
      auto_allocation_schedular: defaultRowConfig.auto_allocation_schedular || null,
    };
    return newRow;
}

export const CONFIGURATION_TABS = [
  { tabKey: "store",      label: "Store/Store Groups Mapped" },
  { tabKey: "product",    label: "Product Profile"           },
  { tabKey: "strategy",   label: "DC To Store Strategy"      },
  { tabKey: "allocation", label: "Auto Allocation Rules"     },
  { tabKey: "scheduler",  label: "Auto Allocation Scheduler" },
];
export const ACTION_ADD_BUTTON_SX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: 0,
  padding: 0,
  minWidth: "unset",
};
