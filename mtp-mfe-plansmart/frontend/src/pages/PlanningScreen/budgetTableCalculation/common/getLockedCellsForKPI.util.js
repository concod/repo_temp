import findIntersection from "./findIntersection.util";
import { DEFAULT_CURRENT_VERSION } from "../budgetTableCalculation.constant";

/**
 * Filters locked cells based on the KPI and current version.
 * @param {Object} kpi - The KPI object to filter locked cells.
 * @returns {Array} Array of filtered locked cells based on the current KPI and version.
 * @description
 *   - Utilizes the current version if the instance's version is not set.
 *   - Determines relevant rows using the findIntersection method.
 *   - Filters locked cells only if they intersect with the determined rows.
 */
export default function ({ kpi }) {
  const currentVersion =
    this.currentVersion !== "" ? this.currentVersion : DEFAULT_CURRENT_VERSION;

  const rowInx = findIntersection.call(this, this.rowDataInxMapping, [
    kpi,
    currentVersion
  ]);

  const kpiLockedCells = [];

  Object.entries(this.lockedCells).forEach((key) => {
    kpiLockedCells[key[0]] = this.lockedCells[key[0]].filter((index) =>
      rowInx.includes(index)
    );

    if (kpiLockedCells[key[0]].length === 0) {
      delete kpiLockedCells[key[0]];
    }
  });

  return kpiLockedCells;
}
