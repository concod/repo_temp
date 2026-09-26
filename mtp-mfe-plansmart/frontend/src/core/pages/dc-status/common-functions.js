import {
  getFiltersValues,
  getCreateDimensionFilters,
} from "../../actions/filterAction";
import { getListOptions } from "core/pages/storeStatus/utils";

const ignore_columns = [
  "store_name",
  "store_code",
  "name",
  "dc_code",
  "fc_code",
];

export const configureDCFCColumnDef = (cols, statusValues) => {
  cols.map((item) => {
    if (item.column_name === "status") {
      item.showFilter = true;
      item.options = getListOptions(statusValues);
    }
    if (item.column_name === "start_time" || item.column_name === "end_time") {
      item.disablePast = true;
    }
    return item;
  });

  return cols;
};

export const getOptionsData = (options, key) => {
  key.filter_keyword = key.column_name;
  key.initialData = options.data.data.attribute.map((item) => {
    return {
      value: item.attribute,
      label: item.attribute,
      id: item.attribute,
    };
  });
  return key;
};

export const filterMapper = (inp_filters) => {
  inp_filters.map((item) => {
    return {
      attribute_name: item.filter_id,
      operator: "in",
      values: Array.isArray(item.values)
        ? item.values.map((opt) => opt.value)
        : item.values,
      filter_type: item.filter_type,
    };
  });
  return inp_filters;
};

export const generateFormFields = async (filters, initialDependency) => {
  const filterElements = filters.map(async (key) => {
    key.accessor = key.column_name;
    if (
      !ignore_columns.includes(key.accessor) ||
      key.field_type !== "TextField"
    ) {
      let body = {
        attribute_name: key.accessor,
        filter_type: key.filter_type,
        filters: initialDependency,
      };
      const options = await getFiltersValues("store", body)();
      key.options = options.data.data.attribute.map((item) => {
        return {
          value: item.attribute,
          label: item.attribute,
          id: item.attribute,
        };
      });
    }
    return key;
  });

  await Promise.all(filterElements);
  return filters;
};

/**
 * @func
 * @description
 * @param {String} _exflag
 * @param {Object} formFields
 * @returns
 */
export const processFilterfields = async (_exflag, formFields) => {
  let additionalfields = [];
  const { data: newFilter } = await getCreateDimensionFilters("store");
  formFields.forEach((item) => {
    if (item.field_type !== "dropdown") {
      additionalfields = [...additionalfields, item];
    }
  });
  additionalfields = [...newFilter.data, ...additionalfields];
  return additionalfields;
};
