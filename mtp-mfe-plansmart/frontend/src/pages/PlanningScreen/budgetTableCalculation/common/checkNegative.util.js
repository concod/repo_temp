/**
 * Formats a number, enclosing negative values in parentheses.
 * @param {number} number - The number to format.
 * @returns {string|number} The formatted number, either as a string with parentheses or the original number.
 * @description
 *   - The function returns a string representation if the number is negative.
 */
export default function (number) {
  if (number < 0) {
    return `(${number})`;
  }

  return number;
}
