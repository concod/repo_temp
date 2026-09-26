import { Badge } from "impact-ui-v3";
import { STORE_GROUPING_CHANNEL_BGCOLOR_MAPPER } from "config/constants";
import {
  getAllFilters,
  getAppSpecificFilters,
} from "core/actions/filterAction";
import { capitalize, isEcommOrWholeSale } from "core/Utils/formatter";
import {
  getRequiredFilterList,
  getCombinedFilterDashboardData,
  getMappedKeyForFilter,
  checkIsFilterDependencyValid,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import { isEmpty } from "lodash";

export const renderGroupTypeCell = (groupTypeColumn) => {
  let groupTypeColumns = { ...groupTypeColumn };
  groupTypeColumns.cellRenderer = (params, extraProps) => {
    return (
      <Badge
        label={
          params.data.special_classification[0].toUpperCase() +
          params.data.special_classification.slice(1)
        }
        color={STORE_GROUPING_CHANNEL_BGCOLOR_MAPPER[params.data.special_classification]}
        variant="stroke"
        size="default"
      />
    );
  };
  return groupTypeColumns;
};

/**
 *
 * @param {array} options
 * @returns Array
 */
export const configureAttributeOptions = (options, excludeOption = []) => {
  let finalOptions = [];
  if (!isEmpty(excludeOption)) {
    options.forEach((item) => {
      if (!excludeOption.includes(item)) {
        finalOptions.push(item);
      }
    });
  } else {
    finalOptions = options;
  }
  return finalOptions?.map((item) => {
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
  allowMultiFlag = false,
  excludeOption = []
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
    let filterElement = {...key}
    const options = filterDashboardData[key.column_name] || [];
    filterElement.filter_keyword = key?.column_name;
    if (key.column_name === "channel") {
      if (!isSGdashboard && !allowMultiFlag) filterElement.is_multiple_selection = false;
      if (application === "AssortSmart") {
        filterElement.excludeOption = excludeOption
        filterElement.initialData = configureAttributeOptions(
          filterStoreChannels(options),
          excludeOption
        );
      } else {
        filterElement.initialData = configureAttributeOptions(
          filterStoreChannels(options)
        );
      }
    } else {
      filterElement.initialData = [...configureAttributeOptions(options)]
    }
    // setting mapped key value for store grade filter
    filterElement.mappedKey = getMappedKeyForFilter(filterDashboardData, key.column_name);
    return filterElement;
  });
  return filterElements;
};
export const handleErrorMessage = (e, displaySnackMessages) => {
  const errObj = e?.response?.data;
  if (e?.response?.status === 409) {
    displaySnackMessages(errObj?.message || "Something went wrong", "error");
    return;
  }
  if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
  else displaySnackMessages("Something went wrong", "error");
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
