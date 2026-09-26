import get from "lodash/get";
import { getFiltersValues } from "../../../../actions/filterAction";
import { CreatePlan } from "../stringConstants/stringConstants";
import {
  getDropdownValues,
  getStoreDropdownValues,
} from "../../../../actions/tenantConfigActions";

/**
 * @function
 * @description Fetches all the plans ans product dropdown attributes.
 * @param {Object} elementsData
 * @param {Boolean} isFilter
 * @returns {Object}
 */
export const getAllDropdownValues = async (elementsData, isFilter = false) => {
  const fields = [...elementsData];
  const filterElements = fields.map(async (key) => {
    key.accessor = key.column_name;
    if (key.display_type === "dropdown") {
      let body = {
        attribute_name: key.column_name,
        filter_type: key.type,
        filters: [],
      };
      let isProduct = key.dimension === "product";
      let isStore = key.dimension === "store";
      const fetchStoreOptions = key.accessor !== "store";

      const request = isStore
        ? fetchStoreOptions
          ? getStoreDropdownValues(body)()
          : []
        : isProduct
        ? getFiltersValues("product", body)()
        : getDropdownValues(2, {
            attribute_name: key.column_name,
        })();

      const options = await request;
      const optionData = isStore
        ? fetchStoreOptions
          ? get(options, "data.data.attribute", [])
          : []
        : get(options, "data.data.attribute", []);
      key.options = configureAttributeOptions(optionData);
      key.field_type = key.display_type;
      key.filter_type = key.type;
      key.required = key.is_mandatory;
      key.isMulti = key.hasOwnProperty("is_multiple_selection")
        ? key.is_multiple_selection
        : key.isMulti;
    }

    key.isDisabled = key.is_disabled;
    return key;
  });
  await Promise.all(filterElements);
  return fields;
};

/**
 * @function
 * @description Get the updated Element with updated Filter Options
 * @param {Object} initialDependency
 * @param {Integer} index
 * @returns {Object}
 */
export const getFiltersOptions = async (
  elementsData,
  initialDependency,
  index
) => {
  let fields = [...elementsData];
  const filterElements = fields.map(async (key, Idx) => {
    if (CreatePlan.__plan_levels.indexOf(key.accessor) > -1 && Idx > index) {
      let body = {
        attribute_name: key.accessor,
        filter_type: key.filter_type,
        filters: initialDependency,
      };

      const options = await getFiltersValues("product", body)();
      key.options = configureAttributeOptions(options.data.data.attribute);
    }
    return key;
  });

  await Promise.all(filterElements);
  return fields;
};

/**
 * @function
 * @description Return All the updated dependent element values
 * @param {Object} selectedOptions
 * @param {Integer} index
 * @returns {Object}
 */
export const getFilterDependency = (elementsData, selectedOptions, index) => {
  if (selectedOptions) {
    let dependency = [];
    elementsData.forEach((key, Idx) => {
      if (
        CreatePlan.__plan_levels.indexOf(key.accessor) > -1 &&
        selectedOptions[key.accessor] &&
        Idx <= index
      ) {
        let val = [selectedOptions[key.accessor]].flat();
        dependency.push({
          attribute_name: key.accessor,
          operator: "in",
          values: val,
          filter_type: key.filter_type,
          dimension: "product",
        });
      }
    });
    return dependency;
  } else {
    return [];
  }
};

/**
 * @function
 * @description Return Dropdown Options in a specific format
 * @param {Object} options
 * @returns {Object}
 */
export const configureAttributeOptions = (options) => {
  return options.map((item) => {
    return {
      ...item,
      value: item.attribute,
      label: item.attribute,
      id: item.attribute,
    };
  });
};
