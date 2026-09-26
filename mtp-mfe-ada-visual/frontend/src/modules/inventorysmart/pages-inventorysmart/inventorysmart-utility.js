import { getAllFilters, getCombinedFiltersValues } from "core/actions/filterAction";
import { isEmpty, cloneDeep, isNull, startCase } from "lodash";
import { Dashboard } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import moment from "moment";
import {
  ASC_ORDER,
  DESC_ORDER,
  EXPECTED_FILTER_DIMENSIONS,
  FUTURE_DATE_RANGE_ERROR,
  RANGE_FILTER_ERROR_MESSAGE,
  ACTIVE_STATUS_FILTER_PAYLOAD,
  tableConfigurationMetaData,
} from "../constants-inventorysmart/stringConstants";
import { getCustomFiltersData } from "../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import {
  checkIsFilterDependencyValid,
  getCombinedFilterDashboardData,
  getfilterAttributeList,
  getMappedKeyForFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { formatStringDate } from "core/Utils/functions/utils";
import store from "store";

export const configureAttributeOptions = (options) => {
  return options.map((item) => {
    if (typeof item === "boolean") {
      // To show boolean values in drop down options in the form of string
      let toCaps = item.toString().toUpperCase();
      return {
        value: item,
        label: toCaps,
        id: item,
      };
    } else
      return {
        value: item,
        label: item,
        id: item,
      };
  });
};

export const scrollIntoView = (ref) => {
  setTimeout(() => {
    ref?.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, 1000);
};

export const configurePlanHierarchyLevels = async (screenName, crossFilter) => {
  //API to fetch the hierarchy levels
  let planLvlsResp = await getAllFilters(screenName)();

  const attributesList = getfilterAttributeList(planLvlsResp);
  let filterElementsData = [];
  let body = {
    attributes: attributesList,
    filter_type: "cascaded",
    filters: [],
    meta: {},
    application_code: 1, // this util function is used across all modules, hence hardcoding the application code as it is constant (1) for inv module
    // dimension: key.dimension,
  };
  if (crossFilter) {
    filterElementsData = await getCombinedCrossDimensionFiltersData(body)();
  } else {
    filterElementsData = await getCombinedFiltersValues(body)();
  }

  filterElementsData = filterElementsData.data.data;

  const filterElements = planLvlsResp.data.data.map(async (key) => {
    key.accessor = key.column_name;
    if (key.display_type === "dropdown") {
      let filterBody = {
        attribute_name: key.column_name,
        filter_type: key.type,
        filters: [],
      };
      let isProduct = key.dimension === "product";

      //After fetching the levels, for each hierarchy level, fetch the values under the level
      let options = filterElementsData[key.column_name];

      //For now else condition is null because we don't have filters other than hierarchy
      key.filter_keyword = key.column_name;
      key.filter_type = key.type;
      key.field_type = key.display_type;
      //map the fetched options to initial data key
      key.initialData = configureAttributeOptions(options);
      key.options = configureAttributeOptions(options);
      key.required = key.is_mandatory;
      key.isMulti = key.hasOwnProperty("is_multiple_selection")
        ? key.is_multiple_selection
        : key.isMulti;
    }
    return key;
  });
  await Promise.all(filterElements);
  return planLvlsResp.data.data;
};

export const fetchFilterConfig = async (screenName) => {
  const response = await getAllFilters(screenName)();
  return response.data.data;
};

export const getFilterDependency = (elementsData, selectedOptions, index) => {
  if (selectedOptions) {
    let dependency = [];
    elementsData.forEach((key) => {
      if (selectedOptions[key.accessor]) {
        let val = [selectedOptions[key.accessor]].flat();
        if (val.length > 0) {
          dependency.push({
            attribute_name: key.accessor,
            operator: "in",
            values: val,
            filter_type: key.filter_type,
            dimension: key.dimension ? key.dimension : "product",
          });
        }
      }
    });
    return dependency;
  } else {
    return [];
  }
};

export const getRequiredFilterList = (filterData, filterDependency) => {
  const requiredFilters = filterData
    .filter((filter) => filter.is_mandatory)
    .map((item) => item.column_name);
  let copyFilterDependency = cloneDeep(filterDependency);

  const saveFilterList = copyFilterDependency.filter((filter) =>
    requiredFilters.includes(filter.attribute_name)
  );
  return saveFilterList;
};

export const fetchFilterOptions = async (props) => {
  let {
    allFilters,
    appliedFilters = [],
    current = null,
    fetchOption = null,
    rolesBasedAccess,
    screenName,
    customDependency = [],
    tenantFilterUamConfig,
    enableCrossFiltersConditionally = false, // this prop is used in specific condition, call cross filters API in new store's sister store config screen (as hierarchies are displayed within a table rather than a filter component). This can be used when quickFilterLoad is set to true (eg - In VB)
  } = props;
  // const tenantFilterUamConfig = store.getState()?.tenantUserRoleMgmtReducer
  //   .userRoleManagementReducer.tenantUamConfig.filter_uam;

  if (current?.filter_type === "non-cascaded") {
    return allFilters;
  }
  if (appliedFilters?.length) {
    appliedFilters = getRequiredFilterList(allFilters, appliedFilters);
  }
  // To add condition to fetch only mandatory fields on initial api call
  let filters = appliedFilters?.map((item) => ({
    attribute_name: item?.filter_id || item?.attribute_name,
    operator: "in",
    values: Array.isArray(item?.values)
      ? item?.values?.map(
          (selectedValue) => selectedValue?.value || selectedValue
        )
      : item?.values,
    filter_type: item?.filter_type,
    filter_id: item?.filter_id || item?.attribute_name,
    dimension: item?.dimension,
  }));

  const quickFilterLoad = JSON.parse(localStorage.getItem("quickFilterLoad"));

  let isFilterDependencyMappingInvalid = false;
  if (!quickFilterLoad || enableCrossFiltersConditionally) {
    isFilterDependencyMappingInvalid = await checkIsFilterDependencyValid(
      allFilters,
      appliedFilters,
      screenName
      // rolesBasedAccess ? screenName : ""
    );
  }

  if (isFilterDependencyMappingInvalid) {
    filters = [];
  }
  // passig active status value in cross filter payload
  if (customDependency?.length) filters = [...filters, ...customDependency];

  const attributesList = getfilterAttributeList(allFilters);
  let body = {
    attributes: attributesList,
    filter_type: "cascaded",
    filters: filters,
    application_code: 1,
  };
  if (tenantFilterUamConfig) {
    body.is_urm_filter = true;
    body.screen_name = screenName;
  }

  let filterDashboardData = [];
  if (!quickFilterLoad || enableCrossFiltersConditionally) {
    const filterElementsData = await getCombinedCrossDimensionFiltersData(
      body
    )();
    filterDashboardData = filterElementsData.data.data;
  }

  const filterElements = allFilters?.map(async (key) => {
    // l_customApi -- custom api to get options for filter as cross filters doesn't support
    // l_customAttributeIgnoreInRequest -- custom api ignores few attribute_name in request body
    let fetchCondition =
      fetchOption === true
        ? key.type === "non-cascaded"
          ? false
          : true
        : true;
    if (fetchCondition) {
      const l_customApi = key?.extra?.custom_api;
      const l_customAttributeIgnoreInRequest =
        key?.extra?.ignore_attributes_custom_api;
      let l_filters = filters;
      if (!isEmpty(l_customAttributeIgnoreInRequest)) {
        l_filters = filters?.filter(
          (config) =>
            !l_customAttributeIgnoreInRequest?.includes(config.attribute_name)
        );
      }

      let body = {
        attribute_name: key?.column_name,
        filter_type: key?.type,
        filters: l_filters || [],
        application_code: 1,
        dimension: key?.dimension,
      };
      if (tenantFilterUamConfig) {
        body.is_urm_filter = true;
        body.screen_name = screenName;
      }

      const apiToFetchOptions = l_customApi ? getCustomFiltersData : null;

      let options = isNull(apiToFetchOptions)
        ? filterDashboardData[key?.column_name]
        : await apiToFetchOptions(body, l_customApi)();
      options = options ? options : [];
      key.filter_keyword = key?.column_name;
      key.levelLabel = "Hierarchy";

      key.initialData = configureAttributeOptions(options);
      key.mappedKey = getMappedKeyForFilter(
        filterDashboardData,
        key?.column_name
      );
    }
    return key;
  });
  return await Promise.all(filterElements);
};

export const getFiltersOptions = async (
  elementsData,
  initialDependency,
  index
) => {
  let fields = [...elementsData];

  const filterDashboardData = getCombinedFilterDashboardData(
    fields,
    initialDependency
  );

  const filterElements = fields.map(async (key, Idx) => {
    if (Dashboard.__plan_levels.indexOf(key.accessor) > -1 && Idx > index) {
      let body = {
        attribute_name: key.accessor,
        filter_type: key.filter_type,
        filters: initialDependency,
      };

      const options = filterDashboardData[key.column_name];
      key.options = configureAttributeOptions(options);
    }
    return key;
  });

  await Promise.all(filterElements);
  return fields;
};

export const updateCrossFiltersData = async (
  elementsData,
  initialDependency,
  requestType
) => {
  let filterElementsData = [];
  const attributesList = getfilterAttributeList(elementsData);
  let body = {
    attributes: attributesList,
    filter_type: "cascaded",
    filters: initialDependency,
    meta: {},
    application_code: 1,
  };

  filterElementsData = await getCombinedCrossDimensionFiltersData(body)();
  filterElementsData = filterElementsData.data.data;

  const filterElements = elementsData.map(async (key) => {
    if (
      (key.type === "cascaded" && requestType === "updateOptions") ||
      requestType === "fetchOptions"
    ) {
      const options = filterElementsData[key.column_name];
      key.filter_keyword = key.column_name;
      key.initialData = options.map((opt) => {
        let attrVal =
          typeof opt === "boolean" ? opt.toString().toUpperCase() : opt;
        return {
          value: attrVal,
          label: attrVal,
          id: attrVal,
        };
      });
    }
    return key;
  });
  return await Promise.all(filterElements);
};

export const filtersPayload = (
  filterValues,
  filterDependency,
  isNewFilterComponent
) => {
  let isValid = true;
  let error = null;
  const reqBody = filterValues.map((filter) => {
    let value;
    if (isNewFilterComponent) {
      const currentFilter = filterDependency.find(
        (dependency) =>
          dependency.filter_id === filter.column_name &&
          dependency.dimension === filter.dimension
      );

      if (currentFilter) {
        value = currentFilter.values.map((filterItem) =>
          filterItem?.value === 0
            ? 0
            : filterItem?.value
            ? filterItem?.value
            : filterItem
        );
      } else {
        value = null;
      }
    } else {
      value = filterDependency[filter.column_name];
    }
    if (filter.field_type === "rangePicker" && value.length) {
      isValid = !(Boolean(value[0]) ^ Boolean(value[1]));
      value =
        Boolean(value[0]) & Boolean(value[1])
          ? [
              moment(value[0]).format("YYYY-MM-DD"),
              moment(value[1]).format("YYYY-MM-DD"),
            ]
          : [];
    }
    if (filter.is_mandatory && !value) {
      isValid = false;
      error = `${filter.label} is required`;
    }
    return {
      filter_type: filter.type,
      attribute_name: filter.column_name,
      operator: "in",
      //TODO Write a function to return capitalized values
      dimension: filter?.extra?.dimension
        ? startCase(filter?.extra?.dimension)
        : filter.dimension === "product"
        ? "Product"
        : filter.dimension === "store"
        ? "Store"
        : filter.dimension === "dc"
        ? "Dc"
        : filter.dimension === "custom"
        ? "Custom"
        : "Sales",
      values: value ? [value].flat() : [],
    };
  });

  isValid =
    isValid &&
    reqBody.some((filter) => {
      return filter.values.length > 0;
    });

  return { reqBody: reqBody, isValid: isValid, error };
};

export const getServerSidePaginationAPIPayload = (
  url,
  filters,
  manualbody,
  page,
  includeExclusionFilter,
  excludeURLObject,
  params
) => {
  const payload = {
    url,
    data: {
      ...filters,
      meta: manualbody
        ? {
            ...manualbody,
            limit: {
              limit: 10,
              page: Number(page) ? page + 1 : 1,
            },
          }
        : {
            ...tableConfigurationMetaData.meta,
            limit: {
              limit: 10,
              page: Number(page) ? page + 1 : 1,
            },
          },
    },
    includeExclusionFilter,
    excludeURLObject,
  };

  return payload;
};

export const getFilterDependencyProductAndStoreAttributes = (
  filterDependency
) => {
  const filters = {
    product_attributes: [],
    store_attributes: [],
  };

  filterDependency.forEach((filter) => {
    if (filter.dimension === "Product" && filter?.values?.length > 0) {
      filters.product_attributes.push(filter);
    } else if (
      filter.dimension.toLowerCase() === "store" &&
      filter?.values?.length > 0
    ) {
      filters.store_attributes.push(filter);
    }
  });

  return filters;
};

export const generateRandomIndex = (min, max) => {
  return Math.floor(Math.random() * (max - min) + 1) + min;
};

export const validateDateRange = (dateRange, restricFutureDateSelection) => {
  let isValid = true;
  let error = null;

  const currentDate = formatStringDate(moment(), false, false);

  let startDate = formatStringDate(
    dateRange?.fiscalInfoStartDate?.calendar_week_start_date,
    true,
    true
  );
  let endDate = formatStringDate(
    dateRange?.fiscalInfoEndDate?.calendar_week_start_date,
    true,
    true
  )
    .endOf("week")
    .format("YYYY-MM-DD");

  if (!startDate || !endDate) {
    isValid = false;
    error = RANGE_FILTER_ERROR_MESSAGE;
  } else if (
    restricFutureDateSelection &&
    (moment(startDate).isAfter(currentDate) ||
      moment(endDate).endOf("week").isAfter(currentDate))
  ) {
    isValid = false;
    error = FUTURE_DATE_RANGE_ERROR;
  }

  return { isValid, error };
};

export const fetchProductCode = (article) => {
  const productCode = article?.sku
    ? article.sku
    : article?.product_code
    ? article?.product_code
    : article?.article
    ? article?.article
    : article?.style_colour_id;

  return productCode;
};

export const fetchStoreCode = (articleDetails) => {
  return articleDetails?.store_code;
};

export const fetchProductCodes = (articles) => {
  const productCodes = [];
  articles?.forEach((article) => {
    const productCode = fetchProductCode(article);

    if (productCodes.indexOf(productCode) === -1) {
      productCodes.push(productCode);
    }
  });

  return productCodes;
};

export const fetchStoreCodes = (articles) => {
  const storeCodes = [];
  articles?.forEach((article) => {
    const storeCode = fetchStoreCode(article);

    if (storeCodes.indexOf(storeCode) === -1) {
      storeCodes.push(storeCode);
    }
  });

  return storeCodes;
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

export const modifyInvetoryAlertsCount = (data, productCodes) => {
  const noOfProductCodes = productCodes?.length || 0;

  const modifiedData = data?.map((countItem) => {
    if (countItem.label === "Resolved") {
      countItem.value = countItem.value + noOfProductCodes;
    } else if (countItem.label === "Pending") {
      countItem.value = countItem.value - noOfProductCodes;
    }

    return countItem;
  });
  return modifiedData;
};

export const isActionAllowedOnSubModule = (
  permissions,
  moduleName,
  subModuleName,
  action
) => {
  if (!permissions || !moduleName) {
    return true;
  }
  return permissions?.[moduleName]?.[subModuleName]?.indexOf(action) > -1;
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

/**
 * this function is used to append payload with [true,false] value for active status filter for (product and store) dimension
 * @param {array} dependency Selected filter dependency list
 * @param {string} column_name Column name to append the payload for (active) in this case
 * @param {string/ array} dimension Dimension to update the payload for, filter present on screen
 * @returns updated payload for active status filter with existing dependencies
 */
export const getActiveFilterCustomDependency = (
  dependency,
  column_name,
  dimension = ["product", "store"] // when both dimension's active status filter are present
) => {
  let selectedDependencies = dependency.map((obj) => obj?.filter_id);
  let selectedDimensionActiveStatusFilter = "";
  if (typeof dimension === "string")
    selectedDimensionActiveStatusFilter = dependency.filter(
      (obj) => obj?.filter_id === column_name && obj.dimension === dimension
    )?.[0]?.dimension;
  let currentDimensions = ["product", "store"];
  let activeFilterDependency = [];
  if (!selectedDependencies.includes(column_name)) {
    activeFilterDependency = currentDimensions.map((item) => {
      return {
        ...ACTIVE_STATUS_FILTER_PAYLOAD,
        filter_id: column_name,
        attribute_name: column_name,
        dimension: item,
      };
    });
    return [...dependency, ...activeFilterDependency];
  } else if (isEmpty(selectedDimensionActiveStatusFilter)) {
    let activeDep = dependency.filter((obj) => obj.filter_id === "active");
    // Either product or store dimension is selected
    if (activeDep.length === 1) {
      activeFilterDependency = {
        ...ACTIVE_STATUS_FILTER_PAYLOAD,
        filter_id: column_name,
        attribute_name: column_name,
        dimension: currentDimensions.filter(
          (val) => val !== activeDep[0]?.dimension
        )?.[0],
      };
      return [...dependency, activeFilterDependency];
    } else return dependency;
  } else {
    activeFilterDependency = {
      ...ACTIVE_STATUS_FILTER_PAYLOAD,
      filter_id: column_name,
      attribute_name: column_name,
      dimension: currentDimensions.filter(
        (val) => val !== selectedDimensionActiveStatusFilter
      )?.[0],
    };
    return [...dependency, activeFilterDependency];
  }
};

/**
 *
 * @param {*} value
 * @param {int} size
 * @returns array of size n with all filled values equal to value
 */
export const fillArrayWithSameValue = (value, size) => {
  const arr = new Array(size);
  arr.fill(value);

  return arr;
};
