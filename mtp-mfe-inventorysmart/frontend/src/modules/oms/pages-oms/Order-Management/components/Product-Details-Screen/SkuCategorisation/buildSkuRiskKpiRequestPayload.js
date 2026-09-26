import { cloneDeep } from "lodash";
import { tableConfigurationMetaData } from "modules/oms/constants-oms/stringConstants";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import { addSelectedHierarchyToFilters } from "../Style-Order-Summary/utils";

export const buildSkuRiskKpiRequestPayload = ({
  filterDashboardConfiguration,
  selectedFilters,
  highLevelSummaryState,
  orderManagementDeepDiveFiltersData,
  orderManagementProductDetailsFilters,
  selectedRowsFromMatrixSummary,
}) => {
  const columnName = orderManagementProductDetailsFilters?.[0]?.column_name;
  const stylesFromDeepDive =
    columnName && orderManagementDeepDiveFiltersData
      ? orderManagementDeepDiveFiltersData[columnName]
      : null;

  let selectedStyles = [];
  if (Array.isArray(stylesFromDeepDive) && stylesFromDeepDive.length > 0) {
    selectedStyles = [...stylesFromDeepDive];
  } else if (Array.isArray(selectedRowsFromMatrixSummary?.values)) {
    selectedStyles = [...selectedRowsFromMatrixSummary.values];
  }

  let redirectionDetails = null;
  try {
    redirectionDetails = JSON.parse(
      localStorage.getItem("omsRedirectionDetails") || "null"
    );
  } catch (error) {
    redirectionDetails = null;
  }
  const filtersFromRedirection = redirectionDetails?.isRedirection
    ? redirectionDetails?.selectedFilters || []
    : [];

  let appliedFilters = [];
  if (filterDashboardConfiguration?.dependencyData?.length) {
    appliedFilters = cloneDeep(filterDashboardConfiguration.dependencyData);
  } else if (selectedFilters?.length) {
    appliedFilters = cloneDeep(selectedFilters);
  } else if (filtersFromRedirection.length) {
    appliedFilters = cloneDeep(filtersFromRedirection);
  }

  let resolvedFilters = addSelectedHierarchyToFilters(
    highLevelSummaryState,
    appliedFilters
  );

  const dcFilterFromSelected = selectedFilters?.find(
    (filter) => filter.dimension === "dc"
  );
  if (dcFilterFromSelected) {
    resolvedFilters = mergeOmsDcIntoFilters(
      resolvedFilters,
      dcFilterFromSelected.values
    );
  }

  // Get date range from localStorage if redirected from dashboard alerts
  const meta = cloneDeep(tableConfigurationMetaData.meta);
  try {
    const orderPlacementDateRange = JSON.parse(
      localStorage.getItem("omsAlertOrderPlacementDateRange") || "null"
    );
    if (
      orderPlacementDateRange &&
      orderPlacementDateRange.min_val &&
      orderPlacementDateRange.max_val
    ) {
      if (!meta.range) {
        meta.range = [];
      }
      meta.range.push(orderPlacementDateRange);
    }
  } catch (error) {
    console.error("Error parsing omsAlertOrderPlacementDateRange:", error);
  }

  return {
    filters: resolvedFilters,
    meta,
    styles: selectedStyles,
  };
};
