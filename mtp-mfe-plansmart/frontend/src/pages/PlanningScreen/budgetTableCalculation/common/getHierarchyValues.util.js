/**
 * Extracts values from a row based on product hierarchies
 * @param {Object} param0 - The object containing the row data.
 * @param {Object} param0.row - The row from which to extract hierarchy values.
 * @returns {Object} An object containing hierarchy values from the row.
 * @description
 *   - Uses 'reduce' to iterate through the product hierarchies.
 *   - Dynamically builds the resulting object based on the product hierarchies.
 */
function getHierarchyValues({ row }) {
  return this.productHierarchies.reduce((accumulator, hierarchy) => {
    return {
      ...accumulator,
      [hierarchy]: row[hierarchy]
    };
  }, {});
}

export default getHierarchyValues;
