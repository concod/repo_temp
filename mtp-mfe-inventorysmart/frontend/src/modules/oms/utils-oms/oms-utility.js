import { isEmpty, cloneDeep, isNull, startCase } from "lodash";
import moment from "moment";
import { getAllFilters } from "core/actions/filterAction";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { checkIsFilterDependencyValid } from "core/commonComponents/coreComponentScreen/utils";
import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import axiosInstance from "core/Utils/axios";
import { getMappedKeyForFilter } from "core/commonComponents/coreComponentScreen/utils";
import { updateFilterDimension } from "core/commonComponents/coreComponentScreen/utils";
import {
  ASC_ORDER,
  DESC_ORDER,
  ERROR_MESSAGE,
  EXPECTED_FILTER_DIMENSIONS,
  OMS_CNO_REDIRECT_DASHBOARD_DCS,
  OMS_CONSTRAINTS_SCREENNAME_KEY,
} from "../constants-oms/stringConstants";

export const fetchFilterConfig = async (screenName) => {
  const response = await getAllFilters(screenName)();
  return response.data.data;
};

export const getCustomFiltersData = (postBody, apiUrl) => () => {
  return axiosInstance({
    url: apiUrl,
    method: "POST",
    data: postBody,
  });
};

export const configureAttributeOptions = (options) => {
  return options.map((item) => {
    if (typeof item === "boolean") {
      // To show boolean values in drop down options in the form of string
      let toCaps = item.toString().toUpperCase();
      return {
        value: item,
        label: replaceSpecialCharacter(toCaps),
        id: item,
      };
    } else
      return {
        value: item,
        label: replaceSpecialCharacter(item),
        id: item,
      };
  });
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
    return cloneDeep(allFilters);
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

  const filterElements = allFilters?.map(async (rawKey) => {
    const key = cloneDeep(rawKey);
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

export const filtersPayload = (
  filterValues,
  filterDependency,
  isNewFilterComponent,
  ignoreCustomDimension = false,
  ignoreDimension = false
) => {
  let isValid = true;
  let error = null;
  //updated filterValues
  let filterValuesCopy = updateFilterDimension(
    filterValues,
    filterValues,
    true,
    true,
    false
  );
  const reqBody = filterValuesCopy.map((filter) => {
    let value;
    if (isNewFilterComponent) {
      const depMatchesColumn = (dependency) =>
        dependency.filter_id === filter.column_name ||
        dependency.attribute_name === filter.column_name;
      const depMatchesDimension = (dependency) =>
        String(dependency.dimension || "").toLowerCase() ===
        String(filter.dimension || "").toLowerCase();

      let currentFilter = filterDependency.find(
        (dependency) =>
          depMatchesColumn(dependency) && depMatchesDimension(dependency)
      );

      if (ignoreDimension) {
        currentFilter = filterDependency.find((dependency) =>
          depMatchesColumn(dependency)
        );
      }

      if (currentFilter) {
        if (Array.isArray(currentFilter.values)) {
          value = currentFilter.values.map((filterItem) =>
            filterItem?.value === 0
              ? 0
              : filterItem?.value
              ? filterItem?.value
              : filterItem
          );
        } else {
          value = Object.values(currentFilter.values);
        }
      } else {
        value = null;
      }
    } else {
      value = filterDependency[filter.column_name];
    }
    if (filter.field_type === "rangePicker" && value?.length) {
      isValid = !(Boolean(value[0]) ^ Boolean(value[1]));
      value =
        Boolean(value[0]) & Boolean(value[1])
          ? [
              moment(value[0]).utc().format("YYYY-MM-DD"),
              moment(value[1]).utc().format("YYYY-MM-DD"),
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
      dimension: ignoreCustomDimension
        ? filter.dimension
        : getCustomDimensionValue(filter.dimension, filter?.extra?.dimension),
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

export const getCustomDimensionValue = (dimension, customDimension) => {
  //TODO Write a function to return capitalized values
  return customDimension
    ? customDimension
    : dimension === "product"
    ? "Product"
    : dimension === "store"
    ? "Store"
    : dimension === "dc"
    ? "Dc"
    : dimension === "product_store"
    ? "product_store"
    : dimension === "custom"
    ? "Custom"
    : dimension === "product_store"
    ? "Product Store"
    : "Sales";
};

export const displaySnackMessages = (
  message,
  variance,
  props,
  disableOnClose = false
) => {
  props?.addSnack({
    message: message,
    options: {
      variant: variance,
      disableOnClose: disableOnClose,
    },
  });
};

export const getFilterDimensions = (filerConfig) => {
  let expectedFilterDimensions = cloneDeep(EXPECTED_FILTER_DIMENSIONS);
  let visibleFilterDimensions = [];

  filerConfig.forEach((config) => {
    if (expectedFilterDimensions[config.dimension]) {
      if (!expectedFilterDimensions[config.dimension].visible) {
        expectedFilterDimensions[config.dimension].visible = true;
        visibleFilterDimensions.push(
          expectedFilterDimensions[config.dimension]
        );
      }
    } else {
      expectedFilterDimensions[config.dimension] = {
        label: config.dimension,
        order: config?.order,
        visible: true,
      };
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

export const handleErrorMessage = (e, props) => {
  const errObj = e?.response?.data;
  if (errObj?.show_message)
    displaySnackMessages(errObj?.message, "error", props);
  else displaySnackMessages(ERROR_MESSAGE, "error", props);
};

export const replaceSpacesWithUnderscores = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.toLowerCase().replace(/\s+/g, "_");
};

export const scrollIntoView = (ref) => {
  setTimeout(() => {
    ref?.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, 1000);
};

export const getModuleVisibility = (permissions) => permissions.length;

export const getTabItemVisibility = (modulePermissions, tabPermissions) => {
  let displayFlag = false;

  for (const subModule of tabPermissions) {
    const userSubModulePermissions = modulePermissions?.[subModule] || [];
    if (getModuleVisibility(userSubModulePermissions)) {
      displayFlag = true;
      break;
    }
  }
  return displayFlag;
};

/** DC filter shape aligned with OMS shared `pages-oms/common/DcFilter.jsx` (linked_store_codes). */
export const buildOmsDcFilterFromSelectedDcs = (selectedDcs) => {
  if (!selectedDcs?.length) return null;
  return {
    filter_type: "non-cascaded",
    attribute_name: "linked_store_codes",
    operator: "in",
    dimension: "dc",
    values: selectedDcs.map((dc) => dc.value),
  };
};

/** Strips any existing DC dimension entry, then appends one from `selectedDcs` when non-empty. */
export const mergeOmsDcIntoFilters = (filters, selectedDcs) => {
  const withoutDc = [...(filters || [])].filter(
    (f) => String(f?.dimension || "").toLowerCase() !== "dc"
  );
  const dcFilter = buildOmsDcFilterFromSelectedDcs(selectedDcs);
  if (dcFilter) withoutDc.push(dcFilter);
  return withoutDc;
};

/** Dashboard → CNO redirect DCs (read before `applyFilters` clears the key). */
export const readOmsCnoRedirectDashboardDcsFromStorage = () => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(OMS_CNO_REDIRECT_DASHBOARD_DCS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Filters sent to POST `/inventory-smart/oms/get-distribution-centres`:
 * excludes DC dimension; only entries with values are included.
 */
export const getAppliedOmsFiltersForDistributionCentres = (selectedFilters) =>
  (selectedFilters || []).filter(
    (f) =>
      String(f?.dimension || "").toLowerCase() !== "dc" && f?.values?.length > 0
  );

export const getVendorConstraintsManageRulesVisible = ({
  vendorConstraintsConfig,
  userAccessVendorDc,
  orderingAccessControl,
}) => {
  const hideManageRulesButton =
    vendorConstraintsConfig?.disable_manage_rules_button || false;
  const constraintsAccess = userAccessVendorDc?.find(
    (item) =>
      item.module === "vendor_constraints" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canManageRules = constraintsAccess?.isManageRulesButton || false;
  return !isEmpty(userAccessVendorDc)
    ? !hideManageRulesButton && canManageRules
    : !hideManageRulesButton && orderingAccessControl?.isEditButton?.isVisible;
};

export const adjustMiddleContentHeight = (
  middleContentRef,
  footerRef,
  marginBottom = 16
) => {
  if (!middleContentRef?.current) return;

  const offsetTop = middleContentRef.current.getBoundingClientRect().top; // Distance from top of page
  const footerHeight = footerRef?.current?.offsetHeight || 0; // Footer height
  const windowHeight = window.innerHeight; // Current visible window height
  // Calculate available height for middle content area
  const middleContentHeight =
    windowHeight - (offsetTop + footerHeight + marginBottom);

  // Apply styles to middle content container
  middleContentRef.current.style.maxHeight = `${middleContentHeight}px`;
  middleContentRef.current.style.overflowY = "scroll";
};
