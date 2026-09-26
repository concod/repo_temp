import intersection from "lodash/intersection";

/**
 * Finds the intersection of arrays specified by column names from the data object.
 * @param {Object} data - An object containing arrays as values.
 * @param {Array<string>} columns - Array of keys to access arrays in the data object.
 * @returns {Array} Intersection of the arrays found in the specified columns.
 * @description
 *   - Returns an empty array if columns is empty.
 *   - Uses the `intersection` function from another library or code.
 */
function findIntersection(data, columns) {
  if (!columns.length) {
    return [];
  }

  const intersectionList = intersection(
    ...columns.map((column) => data[column])
  );

  return intersectionList;
}

export default findIntersection;
