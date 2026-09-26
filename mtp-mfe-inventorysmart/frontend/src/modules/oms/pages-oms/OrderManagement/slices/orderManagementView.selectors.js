import { selectOrderManagementView } from "./orderManagementView.slice.js";
import {
  parseEditableFromLevel,
} from "../utils/orderQtyEditability.util.js";
import {
  shouldShowDistributionMethod,
} from "../utils/timelineEditMode.util.js";
import { OMS_DISTRIBUTION_METHOD_OPTIONS } from "modules/oms/constants-oms/stringConstants.js";

export function selectOrderManagementScreenConfig(store) {
  return (
    store?.omsReducer?.orderingCommonService?.orderingScreensConfig
      ?.oms_dashboard?.matrix_summary || {}
  );
}

export function selectHighLevelSummaryScreenConfig(store) {
  return (
    store?.omsReducer?.orderingCommonService?.orderingScreensConfig
      ?.oms_dashboard?.high_level_summary || {}
  );
}

export function selectEditableFromLevel(store) {
  return parseEditableFromLevel(selectOrderManagementScreenConfig(store));
}

/** @deprecated use selectEditableFromLevel */
export function selectOrderQtyEditableLevels(store) {
  const level = selectEditableFromLevel(store);
  return level ? [level] : null;
}

export function selectShowDistributionMethod(store) {
  const view = selectOrderManagementView(store);
  return shouldShowDistributionMethod(view.selectedRoqDateTab);
}

export function selectDistributionMethodOptions(store) {
  return (
    selectOrderManagementScreenConfig(store)?.distributionMethodOptions ||
    selectOrderManagementView(store)?.setAllConfig?.options ||
    OMS_DISTRIBUTION_METHOD_OPTIONS
  );
}

export function selectViewBootstrapStatus(store) {
  return selectOrderManagementView(store).viewBootstrapStatus ?? "idle";
}

export function selectViewBootstrapError(store) {
  return selectOrderManagementView(store).viewBootstrapError ?? null;
}

export function selectIsViewBootstrapReady(store) {
  return selectViewBootstrapStatus(store) === "ready";
}
