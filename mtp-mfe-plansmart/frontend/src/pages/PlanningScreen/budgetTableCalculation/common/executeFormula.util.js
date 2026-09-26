import formulaParser from "./formulaParser.util";
import assignValueToFormula from "./assignValueToFormula.util";
import numberValidationUtil from "./numberValidation.util";

/**
 * Evaluates a formula string with given values and logs the calculation if required.
 * @param {string} formulaStr - The formula to evaluate as a string.
 * @param {Object} valueObj - Object containing key-value pairs for variable substitution.
 * @param {string} from - Source or context of the formula execution.
 * @param {Object} cell - Cell information with properties rowInx and colId.
 * @returns {number} The result of the evaluated formula after validation.
 * @description
 *   - Logs the formula evaluation details if logging is enabled.
 *   - Dynamically constructs column identifiers using provided cell information.
 */
export default function (formulaStr, valueObj, from, cell) {
  const parsedFormula = formulaParser.call(this, formulaStr);
  const executableFormula = assignValueToFormula.call(
    this,
    formulaStr,
    parsedFormula,
    valueObj
  );

  const isLoggingEnabled = JSON.parse(this.logCalculations);

  if (isLoggingEnabled) {
    const colDetails = this.columnsMap[cell.colId];
    const colIdString = `${colDetails.headerName}_${
      colDetails.extra.timeline
    }_${colDetails.extra.category.join("_")}`;

    console.log(
      from,
      { rowInx: cell.rowInx, colId: colIdString },
      executableFormula,
      numberValidationUtil(executableFormula)
    );
  }

  return numberValidationUtil(executableFormula);
}
