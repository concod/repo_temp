/**
 * Retrieves the previous timeline for a given column ID.
 * @param {Object} param - The parameter object.
 * @param {string} param.columnId - The ID of the column whose previous timeline is to be fetched.
 * @returns {Object} The previous timeline mapped to the specified column ID.
 * @description
 *   - Accesses `previousTimelineMapping` using the provided `columnId`.
 */
function getPreviousTimeline({ columnId }) {
  return this.previousTimelineMapping[columnId];
}

export default getPreviousTimeline;
