import StyledChip from "core/Utils/chip/StyledChip";
import { STORE_GROUPING_CHANNEL_BGCOLOR_MAPPER } from "config/constants";
import {
  getAllFilters,
  getCombinedFiltersValues,
  getAppSpecificFilters,
  getCombinedCrossDimensionFiltersData,
} from "core/actions/filterAction";
import { capitalize, isEcommOrWholeSale } from "core/Utils/formatter";
import {
  getRequiredFilterList,
  getCombinedFilterDashboardData,
  getMappedKeyForFilter,
  checkIsFilterDependencyValid,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";

export const renderGroupTypeCell = (groupTypeColumn) => {
  groupTypeColumn.cellRenderer = (params, extraProps) => {
    return (
      <StyledChip
        label={
          params.data.special_classification[0].toUpperCase() +
          params.data.special_classification.slice(1)
        }
        color={
          STORE_GROUPING_CHANNEL_BGCOLOR_MAPPER[
            params.data.special_classification
          ]
        }
      />
    );
  };
  return groupTypeColumn;
};
/**
 *
 * @param {array} options
 * @returns Array
 */
export const configureAttributeOptions = (options) => {
  return options?.map((item) => {
    return mapDataToLabel(item);
  });
};

export const filterStoreChannels = (channels) => {
  return channels?.filter((channel) => !isEcommOrWholeSale(channel));
};

export const fetchStoreFilters = async (
  dependency = [],
  isSGdashboard = false,
  application,
  screenName,
  allowMultiFlag = false
) => {
  let response = application
    ? await getAppSpecificFilters("store grouping", application)()
    : await getAllFilters("store grouping")();
  //For payload preparation to fetch the individual filter dropdown options, we
  //seperate the selection based on the dimension and send the dependency of the
  //dropdown element - That is suppose we are trying to fetch the options for a
  //channel dropdown, as it is part of store dimension, we pass only store dimension
  //dependency as filters to it
  dependency = getRequiredFilterList(response.data.data, dependency);
  const quickFilterLoad = JSON.parse(localStorage.getItem("quickFilterLoad"));

  let filterDashboardData = [];
  let isFilterDependencyMappingInvalid = false;
  if (!quickFilterLoad) {
    isFilterDependencyMappingInvalid = await checkIsFilterDependencyValid(
      response.data.data,
      dependency,
      screenName
    );
    if (isFilterDependencyMappingInvalid) {
      dependency = [];
    }
    filterDashboardData = await getCombinedFilterDashboardData(
      response.data.data,
      dependency,
      screenName
    );
  }

  const filterElements = response.data.data.map((key) => {
    const options = filterDashboardData[key.column_name] || [];
    key.filter_keyword = key.column_name;
    if (key.column_name === "channel") {
      if (!isSGdashboard && !allowMultiFlag) key.is_multiple_selection = false;
      key.initialData = configureAttributeOptions(filterStoreChannels(options));
    } else {
      key.initialData = configureAttributeOptions(options);
    }
    // setting mapped key value for store grade filter
    key.mappedKey = getMappedKeyForFilter(filterDashboardData, key.column_name);
    return key;
  });
  return filterElements;
};

export const capitalizeFirstLetterDropdown = (options) => {
  return options.map((option) => {
    return {
      label: capitalize(option),
      value: option,
    };
  });
};
/**
 *
 * @param { filters array } filters
 * @param { dimension } dimension ex : "store" or "product"
 * @param { isAPIPayload } boolean - If the format is for API payload
 * @returns
 */
export const formatFiltersDependency = (
  filters,
  dimension,
  isAPIPayload = false
) => {
  return filters.map((filter) => {
    return {
      ...filter,
      dimension: dimension || filter?.dimension,
      attribute_name: filter.filter_id,
      operator: "in",
      values: Array.isArray(filter.values)
        ? filter.values.map(
            (selectedValue) => selectedValue.value || selectedValue
          )
        : filter.values,
      filter_type: filter.filter_type,
      ...(isAPIPayload && { column_name: filter.attribute_name }),
    };
  });
};

/**
 *
 * @param {Array of Objects} updatedFiltersSelection
 * @returns converted values into objects of label and value for dropdown compatilibility
 */
export const convertFilterStrValsToDropdwnObjects = (
  updatedFiltersSelection
) => {
  return updatedFiltersSelection.map((filter) => {
    return {
      ...filter,
      values: filter.values.map((val) => ({
        label: val,
        value: val,
      })),
    };
  });
};


export const getClientName = (clientName) => {
  let loc = new URL(window.location.origin);
  if (loc.hostname.includes(clientName)) {
    return true;
  }
  if (loc.hostname.includes("localhost")) {
    return true;
  }

  return false;
}