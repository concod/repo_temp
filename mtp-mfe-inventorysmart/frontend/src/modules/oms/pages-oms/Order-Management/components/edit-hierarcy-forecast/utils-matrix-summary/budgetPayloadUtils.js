import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";

/**
 * Hierarchy values shown in the AG-Grid (e.g. "Women's Accessories") are decoded
 * for display, but the DB stores them in the encoded form (apostrophes etc. mapped
 * to char-code tokens via SPECIAL_CHARACTER_MAPPING). The get-oms-matrix-summary
 * API receives encoded values via `formatSpecialCharToCharCode` in
 * HighLevelSummaryTable; the budget API must match that convention or its
 * `paf.lN_name IN (...)` filter will miss every row containing special chars.
 */
const encodeHierarchyValueForBackend = (value) => {
  if (value == null) return value;
  const stringValue = String(value);
  return replaceSpecialCharToCharCode(stringValue);
};

/**
 * Builds the request payload for the get-budget-data API based on the current
 * AG-Grid context (L0 total row, L0 data row, or L1 row).
 *
 * @param {string} context - 'L0Total' | 'L0Table' | 'L1'
 * @param {Object} options
 * @param {string} options.fiscalKey - Column id (fiscal period, e.g. 202630)
 * @param {boolean} options.isDataWeekLevel - Week vs month view
 * @param {Object} [options.rowData] - Row data (params.data) for L0 row or L1 row
 * @param {string} [options.activeChildHierarchyKey] - Expanded L0 row value (for L1)
 * @param {Object} [options.highLevelSummaryState] - For L0 total: level_of_hierarchy_id, level_of_hierarchy_value
 * @param {string} [options.roqDateOption] - 'roq_receipt_date' | 'roq_placement_date' from radio state
 * @param {string} [options.selectedHierarchyL0] - L0 hierarchy for budget API (e.g. from orderingScreensConfig?.oms_dashboard?.matrix_summary?.selecteddHierarchyL0ForBudget)
 * @param {Array} [options.filters] - Applied OMS filter array (FilterQuerySchema[]) forwarded to the budget API
 * @returns {{ selected_hierarchy: string, hierarchy_values: string[], dc_or_channels: string[], fiscal_year_week: string[], fiscal_year_month: string[], roq_date_option: string, filters: Array }}
 */
export const buildBudgetRequestPayload = (
  context,
  {
    fiscalKey,
    isDataWeekLevel,
    rowData,
    activeChildHierarchyKey,
    highLevelSummaryState,
    roqDateOption,
    selectedHierarchyL0: selectedHierarchyL0FromOptions,
    filters,
  }
) => {
  const fiscalKeyStr = fiscalKey != null ? String(fiscalKey) : "";
  const fiscal_year_week = isDataWeekLevel ? [fiscalKeyStr] : [];
  const fiscal_year_month = !isDataWeekLevel ? [fiscalKeyStr] : [];
  const roq_date_option = roqDateOption;
  const normalizedFilters = Array.isArray(filters) ? filters : [];

  const selectedHierarchyL0 = selectedHierarchyL0FromOptions;

  if (context === "L0Total") {
    const selected_hierarchy =
      highLevelSummaryState?.level_of_hierarchy_id || selectedHierarchyL0;
    const hierarchy_value = highLevelSummaryState?.level_of_hierarchy_value;
    return {
      selected_hierarchy,
      hierarchy_values:
        hierarchy_value != null
          ? [encodeHierarchyValueForBackend(hierarchy_value)]
          : [],
      dc_or_channels: [],
      fiscal_year_week,
      fiscal_year_month,
      roq_date_option,
      filters: normalizedFilters,
    };
  }

  if (context === "L0Table") {
    const hierarchyValue = rowData?.aggr_column ?? rowData?.row;
    return {
      selected_hierarchy: selectedHierarchyL0,
      hierarchy_values:
        hierarchyValue != null && hierarchyValue !== "total"
          ? [encodeHierarchyValueForBackend(hierarchyValue)]
          : [],
      dc_or_channels: [],
      fiscal_year_week,
      fiscal_year_month,
      roq_date_option,
      filters: normalizedFilters,
    };
  }

  if (context === "L1") {
    const hierarchy_values =
      activeChildHierarchyKey != null
        ? [encodeHierarchyValueForBackend(activeChildHierarchyKey)]
        : [];
    const dcValue =
      rowData != null
        ? rowData.loc_code ?? rowData.row ?? rowData.aggr_column
        : null;
    const dc_or_channels = dcValue != null ? [String(dcValue)] : [];

    return {
      selected_hierarchy: selectedHierarchyL0,
      hierarchy_values,
      dc_or_channels,
      fiscal_year_week,
      fiscal_year_month,
      roq_date_option,
      filters: normalizedFilters,
    };
  }

  return {
    selected_hierarchy: selectedHierarchyL0,
    hierarchy_values: [],
    dc_or_channels: [],
    fiscal_year_week,
    fiscal_year_month,
    roq_date_option,
    filters: normalizedFilters,
  };
};
