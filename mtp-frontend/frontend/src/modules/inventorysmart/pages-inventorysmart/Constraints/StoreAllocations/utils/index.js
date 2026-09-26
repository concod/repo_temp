import { cloneDeep } from "lodash";

import {
  TEXT_FIELD_FILTER_TEMPLATE,
  dropDownConstant,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import {
    FISCAL_YEAR_WEEK_ID,
    MAX_FILTER_ID,
    MAX_LABEL,
    MAX_STORE_COL_ID,
    MIN_FILTER_ID,
    MIN_LABEL,
    MIN_MAX_WOS_FILTER_IDS,
    MIN_STORE_COL_ID,
    WOS_FILTER_ID,
    WOS_LABEL,
    WOS_STORE_COL_ID,
  } from "../constants";

export const INT_REGEX = /^[0-9]+$/;

export const createWeekDropdownOptionsFromWeekData = (week) => {
  const { start_date, end_date, fiscal_year_week } = week;
  const formattedStartDate = start_date.replaceAll("-", "/");
  const formattedEndDate = end_date.replaceAll("-", "/");

  return {
    label: `${fiscal_year_week} : ${formattedStartDate} - ${formattedEndDate}`,
    value: fiscal_year_week,
  };
};

export const getIntArrFromCommaSepStr = (str) => {
    return str
      .split(",")
      .map((str) => str.trim())
      .filter((str) => INT_REGEX.test(str))
      .map((str) => parseInt(str));
  };

export const convertCommaSepStrFilterValuesToIntArr = (filterObj) => {
  const filterValuesToCommaSeparate = MIN_MAX_WOS_FILTER_IDS;
  const { filter_id } = filterObj;

  if (!filterValuesToCommaSeparate.includes(filter_id)) {
    return;
  }

  filterObj.values = getIntArrFromCommaSepStr(filterObj.values[0]);
};

export const getWeeksDropdown = (weeksDropdownOptions) => {
  const weeksDropdown = cloneDeep(dropDownConstant)[0];
  const extra  = weeksDropdown.extra ?? {};

  weeksDropdown.is_disabled = false;
  weeksDropdown.initialData = weeksDropdownOptions;
  weeksDropdown.is_multiple_selection = true;
  weeksDropdown.label = "Weeks";
  weeksDropdown.accessor = FISCAL_YEAR_WEEK_ID;
  weeksDropdown.filter_keyword = FISCAL_YEAR_WEEK_ID;
  weeksDropdown.column_name = FISCAL_YEAR_WEEK_ID;
  weeksDropdown.is_mandatory = true;
  weeksDropdown.is_clearable = true;
  weeksDropdown.extra = {
    ...extra,
    doNotShowSelectedOnTop: true,
  };

  return weeksDropdown;
};

export const getTextField = (label, id) => {
  const textField = cloneDeep(TEXT_FIELD_FILTER_TEMPLATE);

  textField.label = label;
  textField.accessor = id;
  textField.filter_keyword = id;
  textField.column_name = id;

  return textField;
};

export const getTextFieldFilterObj = (label, id) => ({
    filter_name: label,
    filter_id: id,
    filter_type: "non-cascaded",
    dimension: "custom",
    display_type: "TextField",
    check_configuration: [],
    values: [],
    attribute_name: id,
    operator: "in",
  });

export const isUndefinedNullOrEmpStr = (value) => value === undefined || value === null || (typeof value === 'string' && !value.length);

export const removeWeekMinMaxWosFilters = (filters) => {
    const filtersCopy = cloneDeep(filters);
    const filterIds = [FISCAL_YEAR_WEEK_ID, MIN_FILTER_ID, MAX_FILTER_ID, WOS_FILTER_ID];

    filterIds.forEach(filterId => {
      const foundIndex = filtersCopy.findIndex(
        (obj) => obj.filter_id === filterId
      );

      if (foundIndex !== -1) {
        filtersCopy.splice(foundIndex, 1);
      }

    });

    return filtersCopy;
};

  export const replaceWeekMinMaxWosSearchWithFilters = (reqBody) => {
    const { meta: { search } } = reqBody;
    const searchCopy = cloneDeep(search);

    const config = [
      {
        column: MIN_STORE_COL_ID,
        label: MIN_LABEL,
        filterId: MIN_FILTER_ID,
      },
      {
        column: MAX_STORE_COL_ID,
        label: MAX_LABEL,
        filterId: MAX_FILTER_ID,
      },
      {
        column: WOS_STORE_COL_ID,
        label: WOS_LABEL,
        filterId: WOS_FILTER_ID,
      },
    ];

    config.forEach(({ column, label, filterId }) => {
      const foundIndex = searchCopy.findIndex((obj) => obj.column === column);

      if (foundIndex !== -1) {
        const [{ pattern }] = searchCopy.splice(foundIndex, 1);
        const filterObj = getTextFieldFilterObj(label, filterId);

        filterObj.values = getIntArrFromCommaSepStr(pattern);

        reqBody.filters.push(filterObj);
      }
    });

    reqBody.meta.search = searchCopy;
}