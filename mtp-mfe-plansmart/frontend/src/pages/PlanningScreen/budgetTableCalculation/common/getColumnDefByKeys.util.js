/**
 * Retrieves column values based on provided keys.
 * @param {Array} keys - Array of column keys to retrieve.
 * @returns {Array} Array of column values corresponding to the keys.
 * @description
 *   - Uses map function to iterate over keys.
 *   - Accesses values from this.columnsMap using each key.
 */
function getColumnByKeys(keys) {
  return keys.map((columnKey) => {
    return this.columnsMap[columnKey];
  });
}

export default getColumnByKeys;
