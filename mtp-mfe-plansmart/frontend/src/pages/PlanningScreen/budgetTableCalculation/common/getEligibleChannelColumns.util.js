import { get } from "lodash";
import { DEFAULT_CURRENT_VERSION } from "../budgetTableCalculation.constant";

/**
 * Retrieves eligible columns based on the KPI configuration and channel mapping.
 * @param {Object} params - Function parameters.
 * @param {string} params.kpi - The KPI identifier.
 * @param {Object} params.row - The row object containing data.
 * @param {string} params.column - The column identifier.
 * @returns {Array} An array of eligible column keys.
 * @description
 *   - `params` is destructured to extract `kpi`, `row`, and `column`.
 *   - Uses a default version if `plan_version` is not specified in `row`.
 *   - Filters columns based on channel configuration and mapping.
 */
export default function ({ kpi, row, column }) {
  const kpiConfigV2 = this.kpiConfigV2[kpi];
  const version = get(row, "plan_version", DEFAULT_CURRENT_VERSION);

  const eligibleColumns = [];

  Object.keys(get(kpiConfigV2, `editable.${version}`, {})).map((channel) => {
    this.channelRollDownMapping[column].forEach((rollDownKey) => {
      const channelColumn = get(
        this.columnsMap[rollDownKey],
        "extra.channel",
        false
      );
      if (channelColumn && channelColumn === channel) {
        eligibleColumns.push(rollDownKey);
      }
    });
  });

  return eligibleColumns;
}
