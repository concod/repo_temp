/**
 * Transforms each key in the valueByColumnValueKey array using the rowObj.
 * @param {Array<string>} valueByColumnValueKey - Array of keys to transform.
 * @param {Object} rowObj - The object containing values for the keys.
 * @returns {Array<string>} Array of transformed string values.
 * @description
 *   - Appends the key to the value from rowObj with an underscore, except for when the key is "plan_version".
 */
export default function (valueByColumnValueKey, rowObj) {
  return valueByColumnValueKey.map((key) => {
    //TODO: remove hardcode when config is added to listing response
    if (key !== "plan_version") {
      return `${rowObj[key]}_${key}`;
    }
    return rowObj[key];
  });
}
