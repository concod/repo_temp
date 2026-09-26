/**
 * Processes a formula string, extracts and formats its components.
 * @param {string} formula - The formula string to be processed.
 * @returns {Array<string>} An array of formatted substrings extracted from the formula.
 * @description
 *   - Removes spaces from the formula.
 *   - Splits the formula by mathematical operators.
 *   - Matches and preserves function call formats in the result.
 *   - Removes parentheses from non-matched substrings.
 */
const formulaParser = (formula = "") => {
  const formulaWithoutSpace = formula.replaceAll(" ", "");
  const splittedValue = formulaWithoutSpace.split(/[-+*/]/g);
  const result = new Set();
  const regex = /\b[a-z]+\(\w+\)\b/i;

  splittedValue.forEach((str) => {
    const matched = str.match(regex);
    if (matched) {
      const remMatchedStr = str.replace(matched, "MATCHED");
      const remBrackets = remMatchedStr.replace(/[()]/g, "");
      const addMatched = remBrackets.replace("MATCHED", matched);
      result.add(addMatched);
    } else {
      const remBrackets = str.replace(/[()]/g, "");
      result.add(remBrackets);
    }
  });
  return [...result];
};

export default formulaParser;
