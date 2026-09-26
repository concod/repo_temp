import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { microFilterKeys } from "./microFilterConstanat";

/** @param {any} option */
export const formatOption = (option) => ({
  ...option,
  label: replaceSpecialCharacter(option.label.toString()),
});

/**
 * @param {any[]} options
 * @param {number} start
 * @param {number} end
 */
export const formatSlice = (options, start, end) =>
  options.slice(start, end).map(formatOption);

/**
 * Restrict fetched options to the values selected for the same column in
 * step 1 (microStep1SelectedFilters). When the column has no step-1 entry
 * or the entry has no values, the options are returned unchanged.
 *
 * @param {any[]} options - [{ label, value }] options fetched for the column
 * @param {any[]} microStep1SelectedFilters - step-1 selections, array of
 *   objects like { column_name / attribute_name / filter_id, values: [] }
 * @param {string} columnName - column_name whose options were fetched
 * @returns {any[]} options intersected with the step-1 values for the column
 */
export const getIntersectedOptions = (
  options,
  microStep1SelectedFilters,
  columnName
) => {
  if (!Array.isArray(options) || !columnName) return options;

  const entry = (microStep1SelectedFilters || []).find(
    (item) =>
      item?.column_name === columnName ||
      item?.attribute_name === columnName ||
      item?.filter_id === columnName
  );

  const values = entry?.values;
  if (!Array.isArray(values) || values.length === 0) return options;

  const allowedValues = new Set(
    values.map((v) => String(typeof v === "object" ? v?.value ?? v : v))
  );

  return options.filter((option) =>
    allowedValues.has(String(option?.value ?? option))
  );
};

/** @param {any[]} selectedRows */
export const makeMicroFilters = (selectedRows) => {
  return microFilterKeys.map((key, index) => ({
    attribute_name: key,
    dimension: "product",
    disableFuture: null,
    disableFutureWeeks: null,
    disablePast: null,
    disablePastWeeks: null,
    disableType: null,
    display_order: index + 1,
    display_type: "dropdown",
    filter_id: key,
    filter_type: "cascaded",
    operator: "in",
    startYear: null,
    values: [
      ...new Set(
        selectedRows
          .map((row) => row[key])
          .filter((value) => value !== undefined && value !== null)
      ),
    ],
  }));
};
