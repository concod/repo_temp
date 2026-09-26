/**
 * OMS budget feature config from TAM `inv_oms_budget_config`.
 *
 * Default (missing TAM / missing flags): feature ENABLED for all clients.
 * Opt out with `{ "disabled": true }` (or nested `*.disabled: true`).
 */

export const OMS_BUDGET_CONFIG_ATTRIBUTE = "inv_oms_budget_config";

export const DEFAULT_OMS_BUDGET_INFO_POPOVER_LABELS = {
  title: "Info",
  available: "“Excess / Deficit ($)",
  planned_otb: "Planned Budget($)",
  available_otb: "Available Budget ($)",
  order_cost: "Order Cost ($)",
};

/** Top-level kill switch — absent/`false` means enabled. */
export function isOmsBudgetFeatureEnabled(budgetConfig) {
  return budgetConfig?.disabled !== true;
}

/** Sticky-note / Info popover (new OM + legacy edit hierarchy). */
export function isOmsBudgetInfoPopoverEnabled(budgetConfig) {
  return (
    isOmsBudgetFeatureEnabled(budgetConfig) &&
    budgetConfig?.info_popover?.disabled !== true
  );
}

/** Hierarchy budget badges (new OM) / HLS hierarchy budget label. */
export function isOmsBudgetHierarchyBadgeEnabled(budgetConfig) {
  return (
    isOmsBudgetFeatureEnabled(budgetConfig) &&
    budgetConfig?.hierarchy_badge?.disabled !== true
  );
}

export function resolveOmsBudgetInfoPopoverLabels(budgetConfig) {
  const fromTam = budgetConfig?.info_popover?.labels || {};
  return {
    ...DEFAULT_OMS_BUDGET_INFO_POPOVER_LABELS,
    ...Object.fromEntries(
      Object.entries(fromTam).filter(
        ([, value]) => typeof value === "string" && value.trim() !== ""
      )
    ),
  };
}

export function selectOmsBudgetConfig(store) {
  return store?.omsReducer?.orderingCommonService?.omsBudgetConfig || null;
}
