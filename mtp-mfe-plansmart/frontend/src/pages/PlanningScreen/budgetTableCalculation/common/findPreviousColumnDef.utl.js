/**
 * Finds the previous column definition based on the provided column name.
 * @param {Object} param - An object containing parameters.
 * @param {string} param.columnName - The name of the current column.
 * @returns {string} The name of the previous column.
 * @description
 *   - Iterates through leafTimelineMapping array to locate the previous column.
 *   - If the provided column is the first in a sub-array, it remains unchanged.
 */
function findPreviousColumnDef({ columnName }) {
  let column = columnName;
  this.leafTimelineMapping.forEach((columns) => {
    if (columns.indexOf(columnName) > 0) {
      column = columns[columns.indexOf(columnName) - 1];
    }
  });
  return column;
}

export default findPreviousColumnDef;
