/**
 * Pure utility functions for the DropdownGroup component.
 *
 * This module contains all stateless helper logic used by the dropdown group:
 * - Option normalization (converting raw config into Select-compatible options)
 * - Field config resolution (defaults, locked state, hidden state)
 * - Cascading filter logic (filtering child options based on ancestor selection order)
 * - Selection matching (resolving the current formData value against available options)
 */
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

/**
 * Converts raw initialData from the field config into Select-compatible options.
 * Normalizes the label (with special character replacement) and resolves the
 * primary identifier using column_name, falling back to id or value.
 * Spreads all original option properties to preserve metadata (e.g., order, dimension).
 *
 * @param {Array} initialData - Raw options array from the field configuration.
 * @returns {Array} Normalized options with { label, value, ...originalProps }.
 */
export const buildListOptions = (initialData) => {
  if (!Array.isArray(initialData)) {
    return [];
  }
  return initialData.map((option) => ({
    label: replaceSpecialCharacter(option.label || option.name),
    value: option.column_name || option.id || option.value,
    ...option,
  }));
};

/**
 * Extracts the default value from a field config, checking multiple possible
 * property names (default_value, defaultValue) at both the top level and
 * inside the extra object.
 *
 * @param {Object} field - A single dropdown field configuration.
 * @returns {*} The resolved default value, or null if none is configured.
 */
export const resolveDefaultValue = (field) => {
  return (
    field?.default_value ??
    field?.defaultValue ??
    field?.extra?.default_value ??
    field?.extra?.defaultValue ??
    null
  );
};

/**
 * Determines whether a dropdown should be disabled for editing.
 * Checks multiple config properties (isDisabled, is_disabled, disable_edit,
 * disableEdit, is_read_only, readOnly) at both the top level and inside extra.
 * Also respects the global disabledFields flag.
 *
 * Note: Having a defaultValue alone does NOT lock the field.
 *
 * @param {Object} field - A single dropdown field configuration.
 * @param {boolean} disabledFields - Global flag to disable all fields.
 * @returns {boolean} True if the dropdown should be disabled.
 */
export const isFieldLocked = (field, disabledFields) => {
  return (
    Boolean(disabledFields) ||
    Boolean(field?.isDisabled || field?.is_disabled) ||
    Boolean(field?.disable_edit || field?.disableEdit) ||
    Boolean(field?.is_read_only || field?.readOnly) ||
    Boolean(field?.extra?.disable_edit || field?.extra?.disableEdit) ||
    Boolean(field?.extra?.is_read_only || field?.extra?.readOnly)
  );
};

/**
 * Processes a single dropdown field config into a normalized object containing
 * all derived properties needed by the component and hook.
 *
 * @param {Object} field - A single dropdown field configuration.
 * @param {boolean} disabledFields - Global flag to disable all fields.
 * @returns {Object} Normalized config: { field, listOptions, isMulti, isLocked, lockedDefaultRaw, isHidden }.
 */
export const normalizeDropdownConfig = (field, disabledFields) => {
  const listOptions = buildListOptions(field?.initialData);
  const isMulti = Boolean(field.isMulti);
  const lockedDefaultRaw = resolveDefaultValue(field);
  const isLocked = isFieldLocked(field, disabledFields);
  const isHidden = Boolean(field?.hidden);

  return { field, listOptions, isMulti, isLocked, lockedDefaultRaw, isHidden };
};

/**
 * Extracts a comparable string identifier from a formData value.
 * If the value is an object (stored as a full option), extracts column_name or value.
 * If it's already a primitive, returns it as-is.
 *
 * @param {*} value - The current formData value (object or primitive).
 * @returns {*} A comparable identifier string, or null.
 */
export const extractMatchValue = (value) => {
  if (value == null) {
    return null;
  }
  if (typeof value === "object" && value !== null) {
    return value.column_name || value.value;
  }
  return value;
};

/**
 * Implements cascading dropdown logic.
 * For a dropdown with cascaded=true, walks backward through ancestor dropdowns
 * to find the nearest cascaded ancestor with a selected value. Filters this
 * dropdown's options to only include those with a hierarchyLevel greater than the
 * ancestor's selected option hierarchyLevel.
 *
 * Non-cascaded ancestors are skipped during the walk-back.
 * If no cascaded ancestor has a selection, all options are returned unfiltered.
 *
 * @param {number} dropdownIndex - Index of the current dropdown in normalizedDropdowns.
 * @param {Array} normalizedDropdowns - All normalized dropdown configs.
 * @param {Object} groupValue - Current formData values for the dropdown group (e.g., formData[accessor]).
 * @returns {Array} Filtered (or full) list of options for the dropdown.
 */
export const getFilteredOptions = (
  dropdownIndex,
  normalizedDropdowns,
  groupValue
) => {
  const { field, listOptions } = normalizedDropdowns[dropdownIndex];
  if (dropdownIndex === 0 || !field.cascaded) {
    return listOptions;
  }

  let ancestorHierarchyLevel = null;
  for (let ancestorIdx = dropdownIndex - 1; ancestorIdx >= 0; ancestorIdx--) {
    const ancestorField = normalizedDropdowns[ancestorIdx].field;
    if (!ancestorField.cascaded) {
      continue;
    }
    const ancestorSelected = groupValue?.[ancestorField.field_name];
    if (ancestorSelected != null && ancestorSelected !== "") {
      if (ancestorSelected?.hierarchyLevel != null) {
        ancestorHierarchyLevel = ancestorSelected.hierarchyLevel;
      }
      break;
    }
  }

  if (ancestorHierarchyLevel == null) {
    return listOptions;
  }

  return listOptions.filter(
    (option) => option.hierarchyLevel > ancestorHierarchyLevel
  );
};

/**
 * Resolves the currently selected option(s) from the formData value.
 * Handles both single-select (returns a single option object or null)
 * and multi-select (returns an array of matched option objects).
 * Supports formData values stored as full objects or plain strings.
 *
 * @param {*} value - The current formData value for this dropdown.
 * @param {Array} options - The available (possibly filtered) options.
 * @param {boolean} isMulti - Whether this is a multi-select dropdown.
 * @returns {Object|Array|null} Matched option(s), or null/[] if no match.
 */
export const getSelectedOptions = (value, options, isMulti) => {
  if (value == null) {
    return isMulti ? [] : null;
  }
  if (isMulti) {
    const valuesArray = Array.isArray(value) ? value : [value];
    return options.filter((option) =>
      valuesArray.some((selectedItem) =>
        typeof selectedItem === "object" && selectedItem !== null
          ? (selectedItem.column_name || selectedItem.value) === option.value
          : selectedItem === option.value
      )
    );
  }
  const matchValue = extractMatchValue(value);
  return options.find((option) => option.value === matchValue) || null;
};

/**
 * Extracts a comparable identifier from a raw default value config.
 * Similar to extractMatchValue but also checks for the id property,
 * used specifically when matching defaults against listOptions.
 *
 * @param {*} defaultRaw - The raw default value (object with column_name/value/id, or primitive).
 * @returns {*} A comparable identifier, or null.
 */
export const resolveDefaultMatchValue = (defaultRaw) => {
  if (defaultRaw == null) {
    return null;
  }
  if (typeof defaultRaw === "object" && defaultRaw !== null) {
    return defaultRaw.column_name ?? defaultRaw.value ?? defaultRaw.id;
  }
  return defaultRaw;
};

/**
 * Checks whether a formData slot already contains a valid, populated value.
 * Used to avoid overwriting an existing selection when auto-initializing defaults.
 * A value is considered "existing" if it's non-null, non-empty, and has
 * either a column_name or value property.
 *
 * @param {*} currentValue - The current formData value for a dropdown.
 * @returns {boolean} True if a meaningful value already exists.
 */
export const hasExistingValue = (currentValue) => {
  return (
    currentValue != null &&
    currentValue !== "" &&
    (currentValue?.column_name != null || currentValue?.value != null)
  );
};
