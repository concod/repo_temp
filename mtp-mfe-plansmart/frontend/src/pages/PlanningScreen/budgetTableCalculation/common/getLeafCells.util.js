/**
 * Recursively finds the top-level parent accessor in a column hierarchy.
 * @param {Object} param - The input parameter object.
 * @param {string} param.accessor - The current accessor to find the parent for.
 * @returns {string} The top-level parent accessor.
 * @description
 *   - Uses call to maintain the correct context (`this`) in recursive calls.
 *   - Assumes `this.channelRollUpMapping` exists and contains the necessary mapping.
 *   - Halts recursion when no more parent is found in the mapping.
 */
export function findParentColumn({ accessor }) {
  if (this.channelRollUpMapping[accessor]) {
    return findParentColumn.call(this, {
      accessor: this.channelRollUpMapping[accessor]
    });
  }
  return accessor;
}

/**
 * Recursively finds the top-level parent row index.
 * @param {Object} param - An object containing the row index.
 * @param {number} param.rowInx - The index of the row to find the parent for.
 * @returns {number} The index of the top-level parent row.
 * @description
 *   - Uses recursion to trace back to the top-level parent row.
 *   - Assumes that rows with a `parent_index` of -1 are top-level parents.
 */
export function findParentRowInx({ rowInx }) {
  if (this.rowData[rowInx].parent_index >= 0) {
    return findParentRowInx.call(this, {
      rowInx: this.rowData[rowInx].parent_index
    });
  }
  return rowInx;
}

/**
 * Finds and returns leaf cells based on provided accessor and row index.
 * @param {Object} params - Parameters for finding leaf cells.
 * @param {string} params.accessor - The accessor for the parent column.
 * @param {number} params.rowInx - The index of the parent row.
 * @returns {Array<Object>} Array of objects containing accessor and row index for leaf cells.
 * @description
 *   - Utilizes `findParentColumn` and `findParentRowInx` functions to locate parent elements.
 *   - Accesses `channelRollDownMapping` to find child accessors.
 *   - Accesses children's indexes from `rowData` to map leaf cells.
 */
export default function findLeafCells({ accessor, rowInx }) {
  const parentColumn = findParentColumn.call(this, { accessor });
  const parentRowInx = findParentRowInx.call(this, { rowInx });

  const leafCells = [];

  this.channelRollDownMapping[parentColumn].forEach((rollDownKey) => {
    this.rowData[parentRowInx].children_indexes.forEach((childRowInx) => {
      leafCells.push({
        accessor: rollDownKey,
        rowInx: childRowInx
      });
    });
  });

  return leafCells;
}
