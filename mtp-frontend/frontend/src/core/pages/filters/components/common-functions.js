import ModuleConfig from "./moduleConfig";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
/**
 *
 * @param {Object} selectedModuleConfigData
 * @returns Array
 *
 * This method combines respective values for each key into a single array
 */
export const flattenSelectedFiltersData = (selectedModuleConfigData) => {
  const combinedfilters = Object.keys(selectedModuleConfigData).reduce(
    function (res, key) {
      return res.concat(selectedModuleConfigData[key]);
    },
    []
  );
  return combinedfilters.map((element) => {
    return {
      label: element.label,
      column_name: element.column_name,
      filter_type: element.filter_type,
      display_type: element.display_type,
      level: element.level,
      dimension: element.dimension,
      is_mandatory: !!element.is_mandatory,
      display_order: element.display_order,
      is_disabled: !!element.is_disabled,
      is_clearable: !!element.is_clearable,
    };
  });
};

/**
 * This method is used in formatting tabs array passed to tabs component in both
 * create filter config and update filter config
 */
export const formatTabsArray = (tabsInfoArr, id) => {
  return tabsInfoArr.map((tab) => {
    return {
      label: captializeStringIfCamelCase(
        dynamicLabelsBasedOnTenant(tab.label, "core")
      ),
      id: tab.value,
      TabPanel: <ModuleConfig id={id} dimension={tab.value} />,
    };
  });
};

/**
 *
 * @param {Object} selectedFilterConfigData
 * @param {Array} dimensions
 * @returns boolean
 *
 * This method checks if atleast one filter is selected for every dimension
 */
export const checkForEmptyDimensionFilters = (
  selectedFilterConfigData,
  dimensions
) => {
  for (let dimension of dimensions) {
    if (
      !selectedFilterConfigData[dimension.value] ||
      selectedFilterConfigData[dimension.value].length === 0
    ) {
      return true;
    }
  }
  return false;
};

/**
 * @func
 * @desc
 * @param {Object} Selected Filter Configuration
 * @return {Boolean} Valid filter config
 */
export const checkForValidFilters = (selectedFilterConfigData) => {
  return Boolean(
    Object.keys(selectedFilterConfigData).some((key) =>
      Boolean(
        selectedFilterConfigData[key].some((filter) =>
          Boolean(
            Object.keys(filter).some(
              (item) =>
                filter[item] === undefined ||
                filter[item] === null ||
                filter[item] === ""
            )
          )
        )
      )
    )
  );
};
