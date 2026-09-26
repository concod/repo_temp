/**
 * Resolves OMS / dashboard filter dependency for approval flows.
 * Treats an empty dependencyData array as missing so fallbacks (localStorage / Redux) apply.
 *
 * @param {object} options
 * @param {boolean} [options.preferRedirectionBeforeSelected=false] When true, uses
 *   `omsRedirectionDetails` before Redux `selectedFilters` (original getPreselectedFilters order
 *   for dashboard → OMS redirects). When false, matches ApprovalFlowTable / API payload order.
 */
export function resolveAppliedOmsFiltersForApproval({
  omsFilterConfiguration,
  selectedFilters,
  decisionDashboardDependencyData,
  preferRedirectionBeforeSelected = false,
}) {
  let approvalFlowFiltersFromStorage;
  let redirectedSelectedFilters = [];
  try {
    const rawApprovalFlowFilters = localStorage.getItem("approvalFlowFilters");
    approvalFlowFiltersFromStorage = rawApprovalFlowFilters
      ? JSON.parse(rawApprovalFlowFilters)
      : undefined;
    const rawRedirectDetails = localStorage.getItem("omsRedirectionDetails");
    const redirectDetails = rawRedirectDetails
      ? JSON.parse(rawRedirectDetails)
      : null;
    redirectedSelectedFilters = redirectDetails?.isRedirection
      ? redirectDetails?.selectedFilters || []
      : [];
  } catch {
    approvalFlowFiltersFromStorage = undefined;
    redirectedSelectedFilters = [];
  }

  const rawOmsFilterDependencyData =
    omsFilterConfiguration?.appliedFilterData?.dependencyData;
  const nonEmptyOmsFilterDependencyData =
    Array.isArray(rawOmsFilterDependencyData) &&
    rawOmsFilterDependencyData.length > 0
      ? rawOmsFilterDependencyData
      : null;

  const nonEmptyApprovalFlowFiltersFromStorage =
    Array.isArray(approvalFlowFiltersFromStorage) &&
    approvalFlowFiltersFromStorage.length > 0
      ? approvalFlowFiltersFromStorage
      : null;
  const nonEmptyReduxSelectedFilters =
    Array.isArray(selectedFilters) && selectedFilters.length > 0
      ? selectedFilters
      : null;
  const nonEmptyRedirectedSelectedFilters =
    Array.isArray(redirectedSelectedFilters) &&
    redirectedSelectedFilters.length > 0
      ? redirectedSelectedFilters
      : null;
  const nonEmptyDecisionDashboardFilters =
    Array.isArray(decisionDashboardDependencyData) &&
    decisionDashboardDependencyData.length > 0
      ? decisionDashboardDependencyData
      : null;

  if (preferRedirectionBeforeSelected) {
    return (
      nonEmptyOmsFilterDependencyData ||
      nonEmptyApprovalFlowFiltersFromStorage ||
      nonEmptyRedirectedSelectedFilters ||
      nonEmptyReduxSelectedFilters ||
      nonEmptyDecisionDashboardFilters ||
      []
    );
  }

  return (
    nonEmptyOmsFilterDependencyData ||
    nonEmptyApprovalFlowFiltersFromStorage ||
    nonEmptyReduxSelectedFilters ||
    nonEmptyRedirectedSelectedFilters ||
    nonEmptyDecisionDashboardFilters ||
    []
  );
}

/** Drop filters with no values — backend builds `col IN (...)` and empty lists become invalid SQL. */
export function omitEmptyValueFilters(filters) {
  if (!Array.isArray(filters)) return [];
  return filters.filter((f) => {
    const v = f?.values;
    if (v == null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
}
