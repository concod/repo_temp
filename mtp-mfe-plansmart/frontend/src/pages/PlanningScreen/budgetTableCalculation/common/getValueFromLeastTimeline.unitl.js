import { LEAST_TIMELINE_FIRST_VALUE } from "../budgetTableCalculation.constant";

/**
 * Recursively searches in time roll-down mapping based on value position and column ID
 * @param {number} valuePosition - Position value used to determine direction of search.
 * @param {string} columnIdToSearch - Column ID to start the search.
 * @returns {string} The found column ID after the recursive search.
 * @description
 *   - Uses `LEAST_TIMELINE_FIRST_VALUE` to determine search direction.
 *   - Recursively calls itself if the columnIdToSearch exists in timeRollDownMapping.
 *   - Returns the column ID to search if not found in the mapping.
 */
function searchInTimeRollDownMapping(valuePosition, columnIdToSearch) {
  if (this.timeRollDownMapping[columnIdToSearch]) {
    const columnIds = this.timeRollDownMapping[columnIdToSearch];
    return searchInTimeRollDownMapping.call(
      this,
      valuePosition,
      valuePosition === LEAST_TIMELINE_FIRST_VALUE
        ? columnIds[0]
        : columnIds[columnIds.length - 1]
    );
  }
  return columnIdToSearch;
}

/**
 * Retrieves a value from the least timeline based on value position and column ID.
 * @param {Object} params - Parameters object containing properties.
 * @param {number} params.valuePosition - The position of the value to retrieve.
 * @param {string} params.columnId - The ID of the column to search in.
 * @returns {any} The value found in the timeline.
 * @description
 *   - Checks if 'timeRollDownMapping' exists for the given column ID.
 *   - Throws an error if no timeline mapping exists for the specified column.
 */
function getValueFromLeastTimeline({ valuePosition, columnId }) {
  if (this.timeRollDownMapping[columnId]) {
    return searchInTimeRollDownMapping.call(this, valuePosition, columnId);
  }
  throw new Error(
    `UI_BC_ERROR/${columnId} - there is no least level for this column`
  );
}

export default getValueFromLeastTimeline;
