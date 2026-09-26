import { get, isEmpty } from "lodash";
import { targetPlanVisibleKpis } from "../pages/PlanningScreen/planningScreen.constant";
import { SELECTOR_KPI, PLAN_VERSION, BUCKET } from "../constants/constant";
import { VALIDATE_TABLE_CELL_CONSTS } from "./constants";

export function isExternalFilterPresent() {
  return true;
}
//TODO: REMOVE IN SP 63 isTargetPlan
export function doesExternalFilterPass(
  node,
  showHideMetricsData,
  isTargetPlan,
  gridSettings,
  hierarchyLevels
) {
  const generator = validateNode(
    node,
    showHideMetricsData,
    isTargetPlan,
    gridSettings,
    hierarchyLevels
  );

  // Get the first value yielded by the generator
  const result = generator.next().value;

  return result; // Return the result of the generator
}

/**
 * Validates if the row should be visible or hidden.
 *
 * row: Row data which needs to be validated.
 * showHideMetricsData: Metric data to be shown/hidden.
 */
export const validateNode = function* (
  row,
  showHideMetricsData,
  isTargetPlan = false,
  gridSettings = [],
  hierarchyLevels = []
) {
  let isMetricVisible = false;
  let isVersionVisible = false;
  let isBucketVisible = true;

  let isRowVisible = true;
  // TODO: REMOVE IN SP 63 isTargetPlan
  if (isTargetPlan) {
    if (targetPlanVisibleKpis.indexOf(get(row, "data.metric_key", "")) === -1) {
      return false;
    }
  }

  if (!isEmpty(gridSettings)) {
    const gridHierarchyKeys = gridSettings?.map((grid) => grid?.hierarchyKey); // Based on user selection

    for (const key of gridHierarchyKeys) {
      if (row.data.hasOwnProperty(key)) {
        // Find the index of the current key in hierarchyLevels
        const currentIndexInHierarchy = hierarchyLevels?.indexOf(key);

        // Ensure the key is found in hierarchyLevels
        if (currentIndexInHierarchy !== -1) {
          // Check if the current key's value is not "Total"
          if (row.data[key] === VALIDATE_TABLE_CELL_CONSTS.KEY_TOTAL) {
            continue; // Skip to the next key if the current key is "Total"
          }

          let shouldHideRow = true;

          if (currentIndexInHierarchy === hierarchyLevels.length - 1) {
            // If the current key is the last key in hierarchyLevels
            // Check preceding keys: Their values should not be "Total"
            const precedingKeys = hierarchyLevels.slice(
              0,
              currentIndexInHierarchy
            );
            for (const precedingKey of precedingKeys) {
              if (
                row.data.hasOwnProperty(precedingKey) &&
                row.data[precedingKey] === VALIDATE_TABLE_CELL_CONSTS.KEY_TOTAL
              ) {
                shouldHideRow = false;
                break;
              }
            }
          } else {
            // Get the next set of keys in hierarchyLevels
            const followingKeys = hierarchyLevels.slice(
              currentIndexInHierarchy + 1
            );
            // Check following keys: Their values should be "Total"
            for (const nextKey of followingKeys) {
              if (
                row.data.hasOwnProperty(nextKey) &&
                row.data[nextKey] !== VALIDATE_TABLE_CELL_CONSTS.KEY_TOTAL
              ) {
                shouldHideRow = false;
                break;
              }
            }
          }

          // If all relevant keys match "Total", set isRowVisible to false
          if (shouldHideRow) {
            isRowVisible = false;
          }
        }
      }
    }
  }

  if (showHideMetricsData.length === 0) {
    return true;
  }

  for (const metricData of showHideMetricsData) {
    switch (metricData[0]?.metric) {
      case SELECTOR_KPI:
        isMetricVisible = metricData?.some(
          ({ metric, isChecked, children }) =>
            isChecked &&
            children.some(
              (child) =>
                child.isChecked && child.label === get(row, ["data", metric])
            )
        );
        break;
      case PLAN_VERSION:
        const versionMetric = metricData.find(
          (version) =>
            version.label === get(row, ["data", version.metric]) &&
            version?.plan_code === row.data["planCode"]
        );

        isVersionVisible = versionMetric?.isChecked;
        break;
      case BUCKET:
        const bucketMetric = metricData?.find(
          (bucket) => bucket.label === get(row, ["data", bucket.metric])
        );
        isBucketVisible = bucketMetric?.isChecked;
        break;
      default:
        break;
    }
  }

  return isMetricVisible && isVersionVisible && isRowVisible && isBucketVisible;
};
