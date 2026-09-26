import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import {
  getCurrentApplicationName,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";
import {
  getAllFilters,
  getCombinedCrossDimensionFiltersData,
} from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { fetchVendorData } from "core/actions/vendorActions";
import _, {
  cloneDeep,
  find,
  isEmpty,
  isNil,
  isUndefined,
  kebabCase,
  uniq,
  isNumber,
  isBoolean,
  isObject,
  has,
  isFunction,
  includes,
  sortBy,
  uniqBy,
} from "lodash";
import { getUrmFilters } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import store from "store";
import moment from "moment";
import { ASC_ORDER, EXPECTED_FILTER_DIMENSIONS, DESC_ORDER } from "./constants";
import { MAX_SELECTION_SIZE } from "core/commonComponents/filters/Select/constants";

export const getTenantTimeZoneDetails = () => {
  if (
    localStorage.getItem("tenantDateFormat") ||
    localStorage.getItem("tenantTimeZone")
  ) {
    const tenantDateFormat = localStorage.getItem("tenantDateFormat");
    const tenantTimeZone = localStorage.getItem("tenantTimeZone");

    return {
      tenantDateFormat,
      tenantTimeZone,
    };
  } else return { tenantDateFormat: "", tenantTimeZone: "" };
};

// returns the current application name and code
export const getCurrentApplicationDetails = (applicationNameValue = null) => {
  const applicationName = applicationNameValue || getCurrentApplicationName();

  if (
    localStorage.getItem("applicationCodesList") &&
    localStorage.getItem("applicationCodesList") !== "undefined"
  ) {
    const applicationCodesList = JSON.parse(
      localStorage.getItem("applicationCodesList")
    );
    const applicationCode = find(applicationCodesList, (application) => {
      return application.name.toUpperCase() === applicationName.toUpperCase();
    });

    return {
      applicationCode: applicationCode?.application_code,
      applicationName,
      applicationCodesList,
    };
  } else
    return {
      applicationCode: "",
      applicationName: "",
      applicationCodesList: [],
    };
};

export const getRequiredFilterList = (
  filterData,
  filterDependency,
  getRequiredOnly = true
) => {
  let requiredFilters = filterData;
  if (getRequiredOnly) {
    requiredFilters = requiredFilters?.filter(
      (filter) => filter.is_mandatory || filter.required || filter.isMandatory
    );
  }
  requiredFilters = requiredFilters?.map((item) => {
    return {
      attribute_name: item.column_name,
      filter_type: item.type,
    };
  });
  let copyFilterDependency = cloneDeep(filterDependency);

  const saveFilterList = copyFilterDependency?.filter((filter) => {
    const requiredFilter = find(requiredFilters, {
      attribute_name: filter.attribute_name || filter.filter_id,
    });
    if (requiredFilter) {
      // this makes sure that we are retaining the "cascaded" or "non-cascaded" type from filterData
      filter.filter_type = requiredFilter.filter_type;
      return true;
    }
    return false;
  });
  return saveFilterList;
};

export const checkIsFilterDependencyValid = async (
  filterList,
  initialDependency,
  uamScreenName,
  customDependencyValue = {}
) => {
  // check if initialDependency data is valid in filter dashboard

  // get the complete set of the initialDependency and check if depedency value is present in the super set
  // if value is not present discard the complete initialDependency and set as empty []
  // if all values in initialDependency pass the check forward the initialDependency as it is.

  let isDependencyInvalid = false;

  if (!isEmpty(initialDependency)) {
    let filtersList = initialDependency.map((filter) => {
      return {
        column_name: filter.attribute_name,
        dimension: filter.dimension,
        filter_type: filter.filter_type,
      };
    });

    const filterDashboardData = await getCombinedFilterDashboardData(
      filtersList,
      [],
      uamScreenName,
      customDependencyValue
    );

    const filterElements = getFilterElements(filterList, filterDashboardData);
    const { isMappingInvalid } = isFilterConfigurationMappingValid(
      filterElements,
      initialDependency
    );
    isDependencyInvalid = isMappingInvalid;
  }

  return isDependencyInvalid;
};

// returns attribute and dimension list for filter fetch request
export const getfilterAttributeList = (filtersList) => {
  filtersList = filtersList?.filter(
    (filter) =>
      filter.dimension !== "custom" &&
      filter.column_name !== "dimension_time_status"
  );
  return filtersList.map((filter) => {
    return {
      attribute_name: filter.column_name,
      dimension: filter.dimension,
      filter_type: filter.type || filter.filter_type,
    };
  });
};

//If uamScreenName is passed as object with custom application_code
//Then we fetch screen name from that object
const getScreenName = (uamScreenName) => {
  if (isObject(uamScreenName) && has(uamScreenName, "screen_name")) {
    return uamScreenName?.screen_name;
  }
  return uamScreenName;
};

//If uamScreenName is passed as object with custom application_code
//Then we fetch application-code from that object
export const getApplicationCode = (uamScreenName) => {
  if (isObject(uamScreenName) && has(uamScreenName, "application_code")) {
    return uamScreenName.application_code;
  }
  const { applicationCode } = getCurrentApplicationDetails();
  return uamScreenName === "ada-visual" ? 11 : applicationCode;
};

// combined filter values fetch call based on parameters and isCrossDimension key
export const getCombinedFilterDashboardData = async (
  filtersList,
  initialDependency,
  uamScreenName = "",
  customDependencyValue,
  customAttributeList,
  filterSelected,
  applicationCode = null
) => {
  let uamScreenNameCopy = cloneDeep(uamScreenName);
  try {
    const tenantUamConfig = JSON.parse(localStorage.getItem("tenantUamConfig"));
    const tenantFilterUamConfig = tenantUamConfig.filter_uam;

    filtersList = filtersList.filter((filter) => {
      if (filter?.display_type) {
        return filter.display_type === "dropdown";
      }
      return true;
    });

    let attributesList = getfilterAttributeList(filtersList);
    if (
      isObject(customDependencyValue) &&
      has(customDependencyValue, "application_code")
    ) {
      uamScreenNameCopy = {
        screen_name: uamScreenName,
        application_code: customDependencyValue["application_code"],
      };
    }
    if (
      isObject(customDependencyValue) &&
      has(customDependencyValue, "call_back") &&
      isFunction(customDependencyValue["call_back"])
    ) {
      initialDependency = await customDependencyValue["call_back"](
        initialDependency
      );
    }
    if (isFunction(customDependencyValue)) {
      initialDependency = await customDependencyValue(
        initialDependency,
        filterSelected
      );
    }
    if (isFunction(customAttributeList)) {
      attributesList = customAttributeList();
    }
    let body = {
      attributes: attributesList,
      filter_type: "cascaded",
      filters: initialDependency?.map((filter) => {
      if (
        filter?.values?.length >= MAX_SELECTION_SIZE &&
        !isNil(filter?.check_configuration) 
      ) {
        filter.values = [];
      }
      return filter;
    })
    };

    if (
      isObject(customDependencyValue) &&
      has(customDependencyValue, "addFilterExclusions")
    ) {
      body.add_filter_exclusions = customDependencyValue["addFilterExclusions"];
    }

    if (!isEmpty(uamScreenNameCopy) && tenantFilterUamConfig) {
      body.is_urm_filter = true;
      body.screen_name = getScreenName(uamScreenNameCopy);
      // hotfix for ada-visual, will be fixed in next release
      // This is required because ada-visual is a separate module as well as module in inventory
      body.application_code = getApplicationCode(uamScreenNameCopy);
    }

    const filterElementsData = await getCombinedCrossDimensionFiltersData(
      body,
      applicationCode
    )();

    return filterElementsData.data.data;
  } catch (error) {
    if (error.response?.data?.message) {
      displaySnackMessages(error.response?.data?.message, "error");
    } else {
      displaySnackMessages("Something went wrong", "error");
    }
    return [];
  }
};

export const getFilterValueData = (filterDashboardData, key) => {
  return filterDashboardData[key.column_name]
    ? filterDashboardData[key.column_name]
    : key.extra?.filterData
    ? key.extra.filterData
    : [];
};

// fetch updated filter data based on cascading of filter dependency
export const fetchFilterFieldData = async (
  filterValues,
  initialDependency,
  uamScreenName,
  customDependencyValue
) => {
  let customFilterData = {};
  filterValues.forEach((item) => {
    if (item.dimension === "custom" && item.display_type === "dropdown") {
      customFilterData[item.column_name] = item.initialData;
    }
  });
  initialDependency = initialDependency?.filter(
    (filter) =>
      filter.dimension !== "custom" && filter.filter_type !== "non-cascaded"
  );

  let filterDashboardData = [];
  const quickFilterLoad = JSON.parse(localStorage.getItem("quickFilterLoad"));
  if (!quickFilterLoad) {
    filterDashboardData = await getCombinedFilterDashboardData(
      filterValues,
      initialDependency,
      uamScreenName,
      customDependencyValue
    );
  }

  filterDashboardData = { ...filterDashboardData, ...customFilterData };

  const filterElements = filterValues.map((key) => {
    let filterElement = { ...key };
    if (filterElement.display_type !== "fiscalCalendar") {
      const options = getFilterValueData(filterDashboardData, filterElement);
      filterElement.initialData = options.map((item) => {
        return mapDataToLabel(item);
      });
    }
    filterElement.mappedKey = getMappedKeyForFilter(
      filterDashboardData,
      filterElement.column_name
    );
    filterElement.filter_keyword = filterElement.column_name;
    return filterElement;
  });
  return filterElements;
};

// fetch filter dashboard data and filter field dropdown values
export const fetchFilterFieldValues = async (
  // to destructure later
  screenName,
  initialDependency,
  uamScreenName,
  customDependency = []
) => {
  let customDependencyValue = {};
  let response = await getAllFilters(screenName)();
  initialDependency = getRequiredFilterList(
    response.data.data,
    initialDependency
  );

  if (isObject(customDependency) && has(customDependency, "application_code")) {
    customDependencyValue = {
      application_code: customDependency["application_code"],
    };
  }
  const quickFilterLoad = JSON.parse(localStorage.getItem("quickFilterLoad"));
  let isFilterDependencyMappingInvalid = false;

  if (!quickFilterLoad) {
    isFilterDependencyMappingInvalid = await checkIsFilterDependencyValid(
      response.data.data,
      initialDependency,
      uamScreenName,
      customDependencyValue
    );
  }

  if (isFilterDependencyMappingInvalid) {
    initialDependency = [];
  }

  if (Array.isArray(customDependency)) {
    initialDependency = [...initialDependency, ...customDependency];
  }

  // removing non-cascaded fields from being sent in dependency
  initialDependency = initialDependency?.filter(
    (filter) =>
      filter.dimension !== "custom" && filter.filter_type !== "non-cascaded"
  );

  let filterDashboardData = [];
  if (quickFilterLoad === "undefined" || Boolean(quickFilterLoad) !== true) {
    filterDashboardData = await getCombinedFilterDashboardData(
      updateFilterDimension(response.data.data, response.data.data, true),
      updateFilterDimension(initialDependency, response.data.data, false, true),
      uamScreenName,
      customDependencyValue
    );
  }

  const filterElements = getFilterElements(
    response.data.data,
    filterDashboardData
  );
  return filterElements;
};

export const getFilterElements = (filterDashboardList, filterDashboardData) => {
  const filterElements = filterDashboardList?.map((key) => {
    const options = getFilterValueData(filterDashboardData, key);
    const filterElement = { ...key };
    filterElement.initialData = options?.map((item) => {
      return mapDataToLabel(item);
    });
    filterElement.mappedKey = getMappedKeyForFilter(
      filterDashboardData,
      filterElement.column_name
    );
    filterElement.filter_keyword = filterElement.column_name;
    return filterElement;
  });
  return filterElements;
};

export const getMappedKeyForFilter = (filterDashboardData, columnName) => {
  if (filterDashboardData["mapping_key"]) {
    if (filterDashboardData["mapping_key"][columnName]) {
      return filterDashboardData["mapping_key"][columnName];
    }
  }
  return "";
};

// fetch table columns
export const fetchTableColumnData = async (tableName, optionsList = {}) => {
  let colData = await getColumnsAg(`${"table_name="}${tableName}`)();
  if (optionsList) {
    const keys = Object.keys(optionsList);
    colData = colData.map((item) => {
      if (keys.includes(item.column_name)) {
        item.options = optionsList[item.column_name];
        item.disabled = true;
      }
      return item;
    });
  }
  return colData;
};

// fetch vendor status table data
export const fetchTableData = async (body, url) => {
  let res = await fetchVendorData(body, url)();
  res.data.data = res.data.data.map((item) => {
    item.vendor_id = `${item.vendor_code}${item.product_code}`;
    return item;
  });
  return res;
};

// based on the depedency sent and user level hierarchy
// return the updated filters dependency list for uam
export const getUamFilterDependency = async (
  filterDependency,
  screenName,
  expectedFilterDimensions
) => {
  const { applicationCode } = getCurrentApplicationDetails();

  // hotfix for ada-visual, will be fixed in next release
  // This is required because ada-visual is a separate module as well as module in inventory

  const urmFilterList = await getUrmFilters({
    application: screenName === "ada-visual" ? 11 : applicationCode,
    screen_name: screenName,
  })();

  const filterDependencyFields = filterDependency.map((filter) => {
    return filter.attribute_name;
  });
  const urmFilterData = urmFilterList.filter(
    (filter) =>
      !filterDependencyFields.includes(filter.attribute_name) &&
      expectedFilterDimensions.includes(filter.dimension)
  );
  const uamFilterDependency = getSelectionDependency(urmFilterData);
  return [...filterDependency, ...uamFilterDependency];
};

export const convertFilterDataToDependency = (filterData) => {
  const filterDependency = filterData.map((filter) => {
    return {
      attribute_name: filter.column_name,
      dimension: filter.dimension,
      display_type: filter.display_type,
      filter_id: filter.column_name,
      filter_type: filter.type,
      values: filter?.is_multiple_selection
        ? filter.initialData.map((filterValue) => {
            return filterValue.id;
          })
        : [filter.initialData?.[0]?.id],
      operator: "in",
      extra: filter.extra,
    };
  });

  return filterDependency;
};

export const updateDependencyData = (item) => {
  let body = {
    ...item,
    filter_id: item.filter_id || item.attribute_name,
    attribute_name: item.filter_id || item.attribute_name,
    operator: "in",
    dimension: item.dimension,
    values: Array.isArray(item.values)
      ? item.values.map((opt) => {
          if (isUndefined(opt?.value)) {
            return opt;
          } else if (
            opt.label !== opt.value &&
            opt.label &&
            !isNil(item.value) &&
            item.dimension.toLowerCase() === "custom"
          ) {
            //Incase of custom filters where label & value for an option is different
            return opt;
          }
          return opt.value;
        })
      : item.values,
    filter_type: item.filter_type,
    display_type: item.display_type,
  };

  return body;
};

export const mapDataToLabel = (item) => {
  let label = !isNil(item) ? replaceSpecialCharacter(item.toString()) : "";
  if (typeof item === "boolean") {
    let toCaps = label.toString().toUpperCase();
    return {
      value: item,
      label: toCaps,
      id: item,
    };
  } else if (typeof item === "object" && item?.label && !isNil(item?.value)) {
    //Incase of custom filters where label & value for an option is different
    return item;
  } else {
    return {
      value: item,
      label: label,
      id: item,
    };
  }
};

export const getSelectionDependency = (
  dependency,
  originalFilterData = [],
  expectedFilterDimensions = []
) => {
  let selectionDependency =
    dependency.length > 0
      ? dependency.map((item) => {
          return updateDependencyData(item);
        })
      : [];

  if (dependency?.length > 0 && originalFilterData?.length > 0) {
    selectionDependency = selectionDependency?.map((item) => {
      const matchingFilter = originalFilterData?.find(
        (filter) => filter?.column_name === item?.attribute_name
      );
      if (matchingFilter) {
        return {
          ...item,
          // When we already have dimesion inside the item then we are not replacing it
          // Because Some Filter Contains New Or Old Type of Filters Like "Create New Mapping" in Product Supression
          dimension: item.dimension || matchingFilter?.dimension,
          display_order: matchingFilter?.display_order,
        };
      }
      return item;
    });
    // Checking if any of the filters have display_order as null
    const isDisplayOrderNull = selectionDependency?.some(
      (obj) => obj?.display_order === null
    );
    // Reversing the selectionDependency since uniqBy picks up the first occurence of the element found
    let result = uniqBy(
      _.reverse(selectionDependency),
      (obj) => obj.attribute_name + obj.dimension
    );
    if (isDisplayOrderNull) {
      // Generating an object with the column_name and their index in originalFilters array
      const originalDataOrder = _.fromPairs(
        originalFilterData.map((item, index) => [item?.column_name, index])
      );

      // Sorting the result based on their index in the originalDataOrder
      let sortedFilters = _.sortBy(
        result,
        (item) => originalDataOrder[item.attribute_name]
      );
      return sortedFilters;
    } else if (expectedFilterDimensions?.length > 0) {
      let sortedFilters = _.orderBy(
        result,
        [
          (item) => expectedFilterDimensions.indexOf(item.dimension),
          "display_order",
        ],
        ["asc", "asc"]
      );
      return sortedFilters;
    }
  } else {
    return uniqBy(
      _.reverse(selectionDependency),
      (obj) => obj.attribute_name + obj.dimension
    );
  }
};

// update filter field dropdowns based on cascading
export const updateFilterData = async (
  dependency,
  filterData,
  isCrossDimensionFilter = false,
  filterDependency,
  filterDimension,
  is_urm_filter,
  screen_name,
  application_code,
  filterSelected,
  customDependencyValue,
  filterFetchCustomDependency,
  selectionAutoPopulate,
  customAttributeList
) => {
  if (isCrossDimensionFilter) {
    dependency = getAllDimensionDependency(
      filterDimension,
      dependency,
      filterDependency
    );
  }

  let selectionDependency = getSelectionDependency(dependency);
  try {
    let initialFilterElements = [...filterData];
    let mappedKeys = {};
    const isResetAction =
      isEmpty(dependency) || isUndefined(filterSelected.filter_type);
    // filter option fetch will be triggered only on cascaded filters selection and reset
    // on reset action filterSelected.filter_type is not sent, hence is undefined
    if (
      isResetAction ||
      (filterSelected.filter_type === "cascaded" &&
        filterSelected.dimension !== "custom")
    ) {
      // sending only cascaded filters in filter list
      let cascadedSelectionDependency = selectionDependency.filter((key) => {
        return key.filter_type === "cascaded";
      });
      let mappedKeysList = initialFilterElements.filter(
        (item) => item.mappedKey
      );

      let mappingKeysObject = {};
      mappedKeysList.forEach((item) => {
        mappingKeysObject[item.column_name] = item.mappedKey;
      });

      cascadedSelectionDependency = isCrossDimensionFilter
        ? cascadedSelectionDependency
        : cascadedSelectionDependency.filter(
            (filter) => filter.dimension === filterDimension
          );

      // removing custom dimension and non cascaded filters before sending in attributes list
      let filterElementsToFetch = initialFilterElements.filter((filter) => {
        if (isCrossDimensionFilter) {
          return filter.dimension != "custom" && filter.type != "non-cascaded";
        } else {
          return (
            filter.dimension != "custom" &&
            filter.type != "non-cascaded" &&
            filter.dimension === filterDimension
          );
        }
      });

      // removing non-selected filters before sending in attributes list in quick filter load is enabled
      const quickFilterLoad = JSON.parse(
        localStorage.getItem("quickFilterLoad")
      );
      if (quickFilterLoad) {
        const willFieldsAutoPolulate =
          !isAutoPopulateFieldSelected(dependency, selectionAutoPopulate) &&
          !isEmpty(dependency);
        filterElementsToFetch = filterElementsToFetch.filter((filter) => {
          const additionalCheck = willFieldsAutoPolulate
            ? selectionAutoPopulate.includes(filter?.column_name)
            : filter.is_mandatory || filter.required || filter.isMandatory;
          return cascadedSelectionDependency.find(
            (item) =>
              filter?.column_name === item?.attribute_name || additionalCheck
          );
        });
      }

      cascadedSelectionDependency = cascadedSelectionDependency.map((dep) => {
        if (Object.keys(mappingKeysObject).includes(dep.attribute_name)) {
          return {
            ...dep,
            attribute_name: mappingKeysObject[dep.attribute_name],
            filter_id: mappingKeysObject[dep.attribute_name],
          };
        }
        return dep;
      });

      // check configuration logic
      let crossFilterDependency = cloneDeep(cascadedSelectionDependency);
      crossFilterDependency = crossFilterDependency.map((dep) => {
        if (
          dep?.values?.length >= MAX_SELECTION_SIZE &&
          !isNil(dep?.check_configuration)
        ) {
          dep.values = [];
        } else {
          delete dep.check_configuration;
        }
        return dep;
      });

      let combinedFilterDependency = updateFilterDimension(
        crossFilterDependency,
        initialFilterElements,
        false,
        true
      );

      //setting custom filter fetch dependency
      combinedFilterDependency.push(
        ...getFilterFetchCustomDependency(
          filterFetchCustomDependency,
          filterDimension
        )
      );

      const filterDashboardData = isEmpty(filterElementsToFetch)
        ? []
        : await getCombinedFilterDashboardData(
            updateFilterDimension(filterElementsToFetch, initialFilterElements),
            combinedFilterDependency,
            screen_name,
            // This prop is used to update the dependency manually (only) in the payload where required (use case)
            customDependencyValue,
            customAttributeList,
            filterSelected
          );

      if (Object.keys(filterDashboardData).includes("mapping_key")) {
        mappedKeys = filterDashboardData.mapping_key;
      }

      initialFilterElements = initialFilterElements.map((key) => {
        if (key.type === "cascaded") {
          if (!isCrossDimensionFilter && key.dimension !== filterDimension) {
            return key;
          }
          const options = getFilterValueData(filterDashboardData, key);
          key.initialData = options.map((item) => {
            return mapDataToLabel(item);
          });
          key.mappedKey = getMappedKeyForFilter(
            filterDashboardData,
            key.column_name
          );
        } else if (key.type === "non-cascaded" && key.is_mandatory && isEmpty(dependency)) {
          // Clear initialData for non-cascaded filters during reset
          if (key.dimension === "custom" || (!isCrossDimensionFilter && key.dimension !== filterDimension)) {
            return key;
          }
            key.initialData = [];
        }
        return key;
      });

      selectionDependency = isCrossDimensionFilter
        ? getAllDimensionDependency(
            filterDimension,
            selectionDependency,
            filterDependency
          )
        : selectionDependency;
    } else if (
      !isResetAction &&
      filterSelected.filter_type === "non-cascaded" &&
      filterSelected.dimension !== "custom"
      ) {
      // This executes when a non-cascaded filter is cleared (not a reset, not a cascaded filter change)
      initialFilterElements = initialFilterElements.map((item) => {
        if (
          item.type === "non-cascaded" &&
          (item.column_name === filterSelected.filter_id || 
           item.filter_keyword === filterSelected.filter_id)
        ) {
          const isFilterCleared = !selectionDependency.some(
            dep => dep.filter_id === item.column_name || dep.attribute_name === item.column_name
          );
          if (isFilterCleared && item.is_mandatory) {
            if (!isCrossDimensionFilter && item.dimension !== filterDimension) {
              return item;
            }
            item.initialData = [];
          }
        }
        return item;
      });
    }
    return {
      initialFilterElements,
      selectionDependency,
      mappedKeys,
    };
  } catch (error) {
    return {
      initialFilterElements: [],
      selectionDependency,
    };
  }
};

/**
 * Returns combined filter dependency using current dependency list
 * and new dependency set from filter group
 * @param {String} dimension - dimension of new dependency
 * @param {Array} newDependencyList - new dependency
 * @param {Array} currentDependencyList - current dependency list
 * @returns Array - combined filter dependency
 */

export const getAllDimensionDependency = (
  dimension,
  newDependencyList,
  currentDependencyList = []
) => {
  // create a set object of filter ids in new dependency
  const newFilterDependencySet = new Set(
    newDependencyList.map((item) => item.filter_id)
  );

  const updatedCurrentDependencyList = currentDependencyList.filter(
    (item) =>
      /**
       * Remove filter data from current depedency
       * if, filter data is present in new dependency set
       * or filter data is of same dimension as new dependency dimension
       */

      !(
        newFilterDependencySet.has(item.attribute_name) ||
        item.dimension === dimension
      )
  );

  // combine updated dependency and new depedency
  return [...newDependencyList, ...updatedCurrentDependencyList];
};

/**
 * @func
 * @desc Return structure object to utilize as filter options
 * @param {Array} data Array of Objects
 * @returns {Array}
 */
export const generateFilterValues = (data) => {
  const filterValues = data.map((item) => {
    return {
      label: item.name,
      value: item.name,
    };
  });
  return filterValues;
};

// formats filter configurations sent from page component
export const formattedFilterConfiguration = (
  filterConfigId,
  filterConfigData,
  screenName,
  dependencyData = []
) => {
  const filterConfig = filterConfigData.map((item, index) => {
    // dynamically setting filter dimension from filter data if expectedFilterDimensions is not passed
    if (!item.expectedFilterDimensions) {
      item.expectedFilterDimensions = uniq(
        item.filterDashboardData.map((filter) => filter.dimension)
      );
    }

    // Dynamically setting defaultExpanded for Filter Accordion if expectedFilterAccordionExpansions is not passed
    if (!item.expectedFilterAccordionExpansions) {
      let defaultExpansions = [];
      item.filterDashboardData.map((filter) => {
        defaultExpansions[filter.dimension] = filter.defaultExpanded;
      });
      item.expectedFilterAccordionExpansions = defaultExpansions;
    }
    //getting custom filter fetch dependency from filter data instead of config
    const filterFetchCustomDependency = getFilterFetchFilterDependency(
      item.filterDashboardData
    );
    item.filterDashboardData = item.filterDashboardData.filter((item) => {
      if (isNil(item?.extra?.initialData) && !item?.is_deleted) {
        return true;
      }
      return false;
    });

    const updatedItem = {
      ...item,
      originalFilterDashboardData: item.filterDashboardData,
      filterDashboardData: item.filterDashboardData,
      filterDashboardClassification: item.expectedFilterDimensions.map(
        (dimension) => {
          return {
            dimension,
            screenName: `${kebabCase(
              screenName
            )}${"-"}${dimension}${"-"}${index}`,
            filterLabel: dimension.toLowerCase().includes("_")
              ? dimension
                  .split("_")
                  .map((part) =>
                    captializeStringIfCamelCase(
                      dynamicLabelsBasedOnTenant(part, "core")
                    )
                  )
                  .join(" ")
              : dynamicLabelsBasedOnTenant(dimension, "core"),
            customFilterComponent:
              item.customFilterComponent?.dimension === dimension
                ? item.customFilterComponent?.component
                : null,
            onReset: item.onReset,
            defaultExpanded:
              item.expectedFilterAccordionExpansions[dimension] === undefined ||
              item.expectedFilterAccordionExpansions[dimension] === true
                ? true
                : false,
          };
        }
      ),
      filterFetchCustomDependency: filterFetchCustomDependency,
    };
    return updatedItem;
  });

  let obj = {};
  obj[filterConfigId] = {
    filterConfig,
    appliedFilterData: {
      filterHeader: "",
      dependencyData: dependencyData || [],
    },
  };

  return obj;
};

const getFilterFetchFilterDependency = (filterDashboardData) => {
  let customDependency = [];
  filterDashboardData.forEach((item) => {
    if (!isNil(item?.extra?.initialData)) {
      customDependency.push({
        attribute_name: item?.column_name,
        dimension: item?.dimension,
        values: item?.extra?.initialData,
        operator: "in",
        extra: item?.extra,
      });
    }
  });
  return customDependency;
};

export const formatSelectedFiltersData = (
  filterConfigData,
  screenName,
  dependencyData
) => {
  let formattedFilterData = {};
  filterConfigData?.forEach((item, index) => {
    dependencyData?.forEach((data) => {
      const label = `${kebabCase(screenName)}${"-"}${
        data.dimension
      }${"-"}${index}`;
      if (!formattedFilterData[label]) {
        formattedFilterData[label] = [];
      }
      const formattedData = {
        filter_id: data.filter_id,
        filter_type: data.filter_type,
        dimension: data.dimension,
        values: data?.values,
        attribute_name: data.filter_id,
        operator: "in",
        display_type: data?.display_type || "dropdown",
      };
      if (formattedData.display_type === "fiscalCalendar") {
        formattedData.initialData = data.initialData;
      }
      formattedFilterData[label].push(formattedData);
    });
  });

  return formattedFilterData;
};
const displaySnackMessages = (message, variance) => {
  store.dispatch(
    addSnack({
      message: message,
      options: {
        variant: variance,
      },
    })
  );
};

/**
 *
 * @param {string or Array} screenName
 * @returns string
 * If the uamScreenName is an array as some of the routes were defined as array in layout
 * we return first index as first index corresponds to screenName
 * If it is of string type, then we simply return the screenName back
 */
export const getUAMScreenName = (screenName) => {
  if (Array.isArray(screenName)) {
    return screenName[0];
  }
  return screenName;
};

/**
 * Returns combined filter dependency using current selectedFilters list
 * @param {Array} filterDashboardConfiguration - filterConfiguration object (redux) of the filterdashboard,
 * for which the selected filters need to be returned
 * @param {number} filterSectionRadio - filter section index, by default is 0 as most screens have,
 * only one filter section in dashboard
 * @returns Array - combined filter dependency
 */
export const getSelectedFiltersFromConfig = (
  filterDashboardConfiguration,
  filterSectionRadio = 0,
  filterReducer
) => {
  let filterDependency = [];
  const selectedFilters = filterReducer.selectedFilters;
  filterDashboardConfiguration?.[
    filterSectionRadio
  ]?.filterDashboardClassification.forEach((item) => {
    if (selectedFilters[item.screenName]) {
      filterDependency = [
        ...filterDependency,
        ...selectedFilters[item.screenName],
      ];
    }
  });
  const originalData =
    filterDashboardConfiguration?.[filterSectionRadio]
      ?.originalFilterDashboardData;
  const expectedFilterDimensions =
    filterDashboardConfiguration?.[filterSectionRadio]
      ?.expectedFilterDimensions;
  return getSelectionDependency(
    filterDependency,
    originalData,
    expectedFilterDimensions
  );
};

export const getActiveEntityFilter = (dimension, value = [true, false]) => {
  return {
    filter_id: "active",
    attribute_name: "active",
    operator: "in",
    dimension: dimension,
    values: value,
    filter_type: "cascaded",
    display_type: "dropdown",
  };
};

export const addCustomStatusDependency = (initialDependency, dimension) => {
  return [...(initialDependency || []), getActiveEntityFilter(dimension)];
};

export const requiredFieldCheck = (
  filterData,
  dependencyData,
  hideErrorMessage = false
) => {
  // required field check on filters being applied

  let reqFieldsErr = false;
  for (const filter of filterData) {
    const key = {
      filter_id: filter.column_name,
      dimension: filter.dimension,
    };
    let match = find(dependencyData, key);

    let requiredCheck =
      filter.is_mandatory || filter.required || filter.isMandatory;

    //Checking for Fiscal Date Range
    if (requiredCheck && filter.column_name === "fiscal_date_range") {
      let isAnyDateNull = false;
      if (match) {
        isAnyDateNull =
          Object.values(match?.values).indexOf(null) > -1 ? true : false;
      }
      if (isEmpty(match?.values) || isAnyDateNull) {
        reqFieldsErr = true;
      }
    } else {
      // match?.values?.includes(null) -- this check is added for date range filter
      if (requiredCheck && (match?.values?.includes(null) || !match)) {
        reqFieldsErr = true;
      }
    }
  }

  if (reqFieldsErr) {
    !hideErrorMessage &&
      displaySnackMessages("Please select the required fields", "error");
    return false;
  }

  return true;
};

export const displayErrorMessage = (
  err,
  defaultMessage = "Something went wrong"
) => {
  const errMsg = !isEmpty(err.response?.data.message)
    ? err.response.data.message
    : defaultMessage;
  displaySnackMessages(errMsg, "error");
};

export const isFilterConfigurationMappingValid = (
  originalFilterDashboardData,
  savedFilterSelection
) => {
  let isMappingInvalid = false;
  let unMappedFiltersCount = 0;
  let mappingErrorMessage = "";
  let showFilterStrip = true;

  for (const filter of savedFilterSelection) {
    const filterDashboardData = find(originalFilterDashboardData, {
      column_name: filter.attribute_name,
      dimension: filter.dimension,
    });

    if (isNil(filterDashboardData)) {
      unMappedFiltersCount++;
    }
    // validating date fields mapping
    else if (filterDashboardData.display_type === "DateTimeField") {
      if (
        filterDashboardData?.disablePast != filter.disablePast ||
        filterDashboardData?.disableFuture != filter.disableFuture
      ) {
        // does the date value fall under valid category?
        isMappingInvalid = true;
        mappingErrorMessage =
          "Date saved in filter cannot be used on this screen";
      }
    } else if (filterDashboardData.display_type === "fiscalCalendar") {
      if (
        filterDashboardData?.disablePastWeeks != filter.disablePastWeeks ||
        filterDashboardData?.disableFutureWeeks != filter.disableFutureWeeks
      ) {
        // does the date value fall under valid category?
        isMappingInvalid = true;
        mappingErrorMessage =
          "Fiscal week saved in filter cannot be used on this screen";
      }
    } else if (filterDashboardData.display_type === "rangePicker") {
      if (
        filterDashboardData?.disableType != filter.disableType ||
        filterDashboardData?.startYear != filter.startYear
      ) {
        // does the date value fall under valid category?
        isMappingInvalid = true;
        mappingErrorMessage =
          "Date range saved in filter cannot be used on this screen";
      }
    }
    // mapping multiselect to single select is invalid, while reverse is valid
    else if (
      filterDashboardData.display_type === "dropdown" &&
      !filterDashboardData.is_multiple_selection &&
      filter.values?.length > 1
    ) {
      isMappingInvalid = true;
      mappingErrorMessage =
        "Cannot use multi-selection saved filter in single-selection filter";
    } else if (filterDashboardData.display_type === "dropdown") {
      filter.values.forEach((val) => {
        const filterValue =
          find(filterDashboardData.initialData, val) ||
          find(filterDashboardData.initialData, ["value", val]) ||
          find(
            filterDashboardData?.extra?.filterData,
            (value) => value === val
          );
        if (!filterValue) {
          isMappingInvalid = true;
          mappingErrorMessage =
            "Some of the filter value(s) do not exist in the filter data";
          showFilterStrip = false
        }
      });
    }

    if (isMappingInvalid) break;
  }
  if (
    !isMappingInvalid &&
    savedFilterSelection.length !== 0 &&
    unMappedFiltersCount === savedFilterSelection.length
  ) {
    isMappingInvalid = true;
    mappingErrorMessage =
      "Some saved filter dimension's are not present in this filter dashboard";
  }

  return { isMappingInvalid, mappingErrorMessage, showFilterStrip };
};

/**
 * Returns list of filter data with updated is_disabled key
 * @param {Array} initialFilterElements - filter dashboard data,
 * @param {Array} initialFilterElements - filter dependency/selection,
 * @returns Array - updated filter filter dashboard data
 * dimension present in filterDimension list are updated,
 * based on mandatory fields selection for that dimension alone
 */
export const disableNonMandatoryFieldsAction = (
  initialFilterElements,
  selectionDependency,
  filterDimension = []
) => {
  // updating is_disabled state of fields if mandatory fields are empty/not selected

  filterDimension.forEach((dimension) => {
    const areCrossDimensionFieldsSelected = requiredFieldCheck(
      initialFilterElements.filter((item) => {
        return item.dimension === "product_store";
      }),
      selectionDependency
    );
    const areMandatoryFieldsSelected = requiredFieldCheck(
      initialFilterElements.filter((item) => {
        return item.dimension === dimension;
      }),
      selectionDependency
    );
    initialFilterElements = initialFilterElements.map((item) => {
      if (
        (item.dimension === "product" || item.dimension === "store") &&
        (item.is_mandatory || item.required || item.isMandatory)
      ) {
        item.is_disabled = !areCrossDimensionFieldsSelected;
      }

      if (
        item.dimension === dimension &&
        !(item.is_mandatory || item.required || item.isMandatory)
      ) {
        item.is_disabled = !areMandatoryFieldsSelected;
      }
      return item;
    });
  });

  return initialFilterElements;
};

/**
 * @function
 * @description Validate if all the accessors from savedFilterSelection is present originalFilterDashboardData config
 * @param {Array} originalFilterDashboardData  Filter configuration
 * @param {Array} savedFilterSelection savedFilterDependency
 * @returns {Boolean} if savedFilterSelection is valid
 */
export const isDependencyValid = (
  originalFilterDashboardData = [],
  savedFilterSelection = []
) => {
  const accessorsInConfig =
    originalFilterDashboardData?.map((config) => config.column_name) || [];
  let filtersNotMapped = 0;
  for (const filter of savedFilterSelection) {
    if (!accessorsInConfig.includes(filter.attribute_name)) {
      filtersNotMapped++;
    }
  }
  return Boolean(
    originalFilterDashboardData.length &&
      savedFilterSelection.length &&
      !filtersNotMapped
  );
};

export const sortSavedFiltersUtility = (savedFiltersList, sortPattern) => {
  //Sort Pattern is of the form column@order - name@asc or updated_at@desc
  switch (sortPattern) {
    case "name@desc":
      return sortBy(savedFiltersList, (obj) => _.toLower(obj.name)).reverse();
    case "updated_at@asc":
      return sortBy(savedFiltersList, (obj) => moment(obj.updated_at));
    case "updated_at@desc":
      return sortBy(savedFiltersList, (obj) =>
        moment(obj.updated_at)
      ).reverse();
    default:
      //defaut is name@asc
      return sortBy(savedFiltersList, (obj) => _.toLower(obj.name));
  }
};

const updateFiltersWithExtraAttrb = (
  dependencyFilter,
  filterConfig,
  result = []
) => {
  filterConfig?.extra?.attributes.forEach((attrb) => {
    result.push({
      ...dependencyFilter,
      ...(dependencyFilter?.attribute_name && {
        attribute_name:
          attrb?.attribute_name || dependencyFilter?.attribute_name,
        filter_id: attrb?.attribute_name || dependencyFilter?.attribute_name,
      }),
      ...(dependencyFilter?.column_name && {
        column_name: attrb?.attribute_name || dependencyFilter?.column_name,
        filter_id: attrb?.attribute_name || dependencyFilter?.column_name,
      }),
      dimension: attrb?.dimension || dependencyFilter?.dimension,
    });
  });
};
export const updateFilterDimension = (
  dependency = [],
  filterFields = [],
  isSame = false,
  addOnlyForFilters = false,
  checkForExtraDimension = true
) => {
  let result = [];
  dependency.forEach((depFilter) => {
    if (isSame) {
      if (addOnlyForFilters && depFilter?.extra?.attributes) {
        //attrb will be of the form -> {attribute_name : "<str>", dimension : "<str>"}
        updateFiltersWithExtraAttrb(depFilter, depFilter, result);
      } else {
        result.push({
          ...depFilter,
          dimension: checkForExtraDimension
            ? depFilter?.extra?.dimension || depFilter?.dimension
            : depFilter?.dimension,
        });
      }
    } else {
      const fieldFilterValue = filterFields.filter((fieldFilter) =>
        depFilter?.attribute_name
          ? depFilter.attribute_name === fieldFilter.column_name
          : depFilter.column_name === fieldFilter.column_name
      );

      if (
        fieldFilterValue.length > 0 &&
        addOnlyForFilters &&
        fieldFilterValue[0]?.extra?.attributes
      ) {
        updateFiltersWithExtraAttrb(depFilter, fieldFilterValue[0], result);
      } else {
        result.push({
          ...depFilter,
          dimension:
            fieldFilterValue?.length > 0
              ? fieldFilterValue[0]?.extra?.dimension || depFilter?.dimension
              : depFilter?.dimension,
        });
      }
    }
  });
  return result;
};

export const getFilterFetchCustomDependency = (
  customFilterDependency,
  dimension
) => {
  let combinedFilterDependency = [];
  const cloneCustomFilterDependency = cloneDeep(customFilterDependency);
  cloneCustomFilterDependency?.forEach((item) => {
    if (
      item?.extra?.isCrossDependency ||
      (!item?.extra?.isCrossDependency && item.dimension === dimension)
    ) {
      item.dimension = item?.extra?.dimension || item.dimension;
      const { extra, ...customDependency } = item;
      combinedFilterDependency.push(customDependency);
    }
  });
  return combinedFilterDependency;
};

export const isAutoPopulateFieldSelected = (
  filterDependency,
  selectionAutoPopulate
) => {
  if (isNil(selectionAutoPopulate)) {
    return true;
  }
  const data = filterDependency?.filter((filterElement) => {
    return selectionAutoPopulate?.includes(filterElement.filter_id);
  });
  return data?.length > 0;
};

/**
 * Returns true/false based on whether access is to be
 * restricted based on filter selection
 * @param {Array} filterBasedAccessList - no access filter selection list,
 * @param {Array} filterSelectionList - filter selection on dashboard,
 * @returns true/false
 */
export const isFilterAccessRestricted = (
  filterBasedAccessList,
  filterSelectionList
) => {
  let isFilterBasedAccessRestricted = false;
  const filterIdList = Object.keys(filterBasedAccessList);
  filterIdList?.forEach((filterId) => {
    const filterValueList = filterBasedAccessList[filterId];
    const filterField = find(filterSelectionList, {
      attribute_name: filterId,
    });
    if (filterField) {
      filterValueList?.forEach((value) => {
        if (filterField?.values?.includes(value)) {
          isFilterBasedAccessRestricted = true;
        }
      });
    }
  });
  return isFilterBasedAccessRestricted;
};

export const sortByNumber = (data, order, key) => {
  if (!data || !data?.length) {
    return [];
  }

  if (order === DESC_ORDER) {
    data.sort((a, b) => b?.[key] - a?.[key]);
  } else {
    data.sort((a, b) => a?.[key] - b?.[key]);
  }

  return data;
};

export const getFilterDimensions = (filerConfig) => {
  let expectedFilterDimensions = cloneDeep(EXPECTED_FILTER_DIMENSIONS);
  let visibleFilterDimensions = [];

  filerConfig.forEach((config) => {
    if (!expectedFilterDimensions[config.dimension].visible) {
      expectedFilterDimensions[config.dimension].visible = true;
      visibleFilterDimensions.push(expectedFilterDimensions[config.dimension]);
    }
  });

  visibleFilterDimensions = sortByNumber(
    visibleFilterDimensions,
    ASC_ORDER,
    "order"
  ).map((dimension) => dimension.label);

  return visibleFilterDimensions;
};

export const deepEqualsArrayWithException = (
  selectedFilter1,
  selectedFilter2,
  curretDimentionList = []
) => {
  const sortedStringifyFilter1 = selectedFilter1
    ?.filter((filter) => curretDimentionList.includes(filter.dimension))
    ?.map((filter) =>
      JSON.stringify({
        attribute_name: filter.attribute_name || filter.filter_id,
        values: filter.values,
      })
    )
    .sort();

  const sortedStringifyFilter2 = selectedFilter2
    ?.filter((filter) => curretDimentionList.includes(filter.dimension))
    ?.map((filter) =>
      JSON.stringify({
        attribute_name: filter.attribute_name || filter.filter_id,
        values: filter.values,
      })
    )
    .sort();

  if (sortedStringifyFilter1?.length !== sortedStringifyFilter2?.length)
    return false;

  for (let i = 0; i < sortedStringifyFilter1?.length; i++) {
    if (sortedStringifyFilter1?.[i] !== sortedStringifyFilter2[i]) return false;
  }

  return true;
};

export const findCorrectSavedFilterDataifNotChangeSavedFilters = (
  filterDashboardConfiguration,
  selectedFilters,
  defaultFilterData,
  savedFilterUserConfig
) => {
  let selectedFiltersData = [];
  let isSelectedFilterWithCurrentRendersFilterAvailable = false;
  let defaultFilter = { ...defaultFilterData };
  const currentFiltersScreenName = filterDashboardConfiguration?.map((filter) =>
    filter?.filterDashboardClassification?.map((item) => item.screenName)
  );

  if (
    Array.isArray(currentFiltersScreenName) &&
    currentFiltersScreenName.length
  ) {
    currentFiltersScreenName[0]?.map((filterScreenName) => {
      const selectedFiltersForScreenName = selectedFilters?.[filterScreenName];

      if (
        selectedFiltersForScreenName &&
        Array.isArray(selectedFiltersForScreenName)
      ) {
        isSelectedFilterWithCurrentRendersFilterAvailable = true;
        selectedFiltersData = [
          ...selectedFiltersData,
          ...selectedFiltersForScreenName,
        ];
      }
    });
  }

  if (
    isSelectedFilterWithCurrentRendersFilterAvailable &&
    !isNil(defaultFilter) &&
    defaultFilter?.saved_filter_preference
  ) {
    let expectedFilterDimensions = [];
    filterDashboardConfiguration?.forEach((filter) => {
      expectedFilterDimensions = filter.expectedFilterDimensions;
    });

    let isBothFiltersEqual = deepEqualsArrayWithException(
      defaultFilter.saved_filter_preference,
      selectedFiltersData,
      expectedFilterDimensions
    );

    if (!isBothFiltersEqual) {
      for (let i = 0; i < savedFilterUserConfig.length; i++) {
        const isMatch = deepEqualsArrayWithException(
          savedFilterUserConfig[i].saved_filter_preference,
          selectedFiltersData,
          expectedFilterDimensions
        );
        if (isMatch) {
          defaultFilter = savedFilterUserConfig[i];
          isBothFiltersEqual = true;
          break;
        }
      }
      if (!isBothFiltersEqual) defaultFilter = {};
    }
  }

  return defaultFilter;
};

export const generateUploadedFilterDependency = (
  orignalFilters,
  selectedValues
) => {
  return orignalFilters
    ?.map((item) => {
      if (selectedValues?.hasOwnProperty(item?.column_name)) {
        return {
          attribute_name: item?.column_name,
          check_configuration: [],
          dimension: item?.dimension,
          display_order: null,
          display_type: item?.display_type,
          extra: {},
          filter_id: item?.column_name,
          filter_name: item?.label,
          filter_type: item?.type,
          is_mandatory: item?.is_mandatory || false,
          operator: "in",
          values: selectedValues?.[item?.column_name],
        };
      }
      return null;
    })
    ?.filter((item) => item !== null);
};

export const getProgressPercentage = (defaultFilterLoadingMsg) => {
  let value = 33;
  if (defaultFilterLoadingMsg === "Fetching the filters for current screen") {
    value = 33;
  } else if (defaultFilterLoadingMsg === "Setting the Default Filter") {
    value = 70;
  } else if (defaultFilterLoadingMsg === "Applying the default saved filters") {
    value = 100;
  }
  return value;
};
