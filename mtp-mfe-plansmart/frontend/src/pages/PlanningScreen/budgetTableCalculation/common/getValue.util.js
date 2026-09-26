import { isNumber } from "lodash";

/**
 * Retrieves a specific value from row data.
 * @param {number} rowInx - Index of the row from which to retrieve the value.
 * @param {string} key - The key of the value to retrieve.
 * @param {boolean} isInitialValue - Whether to use the initial row data.
 * @returns {number|null} The value if it is a number, otherwise null.
 * @description
 *   - Uses initialRowData if isInitialValue is true, otherwise uses rowData.
 *   - Ensures the value is a number before returning.
 */
export default function getValue(rowInx, key, isInitialValue) {
  const rowData = isInitialValue ? this.initialRowData : this.rowData;
  if (rowData.length > rowInx && rowInx >= 0) {
    const value = rowData?.[rowInx]?.[key];
    return isNumber(value) ? value : null;
  }
  return null;
}
