import isChannelEligibleUtil from "./isChannelEligible.util";

/**
 * Counts eligible channels based on provided KPI, column, and row.
 * @param {Object} args - Function arguments.
 * @param {string} args.kpi - The KPI to use for eligibility check.
 * @param {string} args.column - The column to evaluate.
 * @param {Object} args.row - The row data for context.
 * @returns {number} Number of eligible channels.
 * @description
 *   - Uses `this.channelRollDownMapping` to map columns to reduce eligible channels.
 *   - Leverages `isChannelEligibleUtil` for eligibility check within context.
 */
export default function ({ kpi, column, row }) {
  return this.channelRollDownMapping[column].reduce(
    (channelCount, rollDownMapping) => {
      if (
        isChannelEligibleUtil.call(this, {
          kpi,
          column: rollDownMapping,
          row: row
        })
      ) {
        return channelCount + 1;
      }
      return channelCount;
    },
    0
  );
}
