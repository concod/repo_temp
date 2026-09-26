/**
 * Custom hook that encapsulates all state management and side effects
 * for the DropdownGroup component.
 *
 * Responsibilities:
 * - Memoizes normalized dropdown configs from raw field definitions.
 * - Provides helper functions for cascading option filtering and selection resolution.
 * - Fetches dimension hierarchies via getDimensionHierarchies API when item.fetchHierarchies is true.
 * - Resolves dropdown options from fetched hierarchies (filtered by dimension),
 *   applying cascading logic based on hierarchyLevel.
 * - Auto-initializes default values into formData on mount (for dropdowns with defaultValue).
 * - Auto-clears stale cascaded selections when a parent dropdown's value changes
 *   and the child's current selection is no longer in the filtered option list.
 *   Skips clearing when hierarchies have not yet loaded to avoid wiping saved values.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeDropdownConfig,
  getFilteredOptions,
  getSelectedOptions,
  resolveDefaultMatchValue,
  extractMatchValue,
  hasExistingValue,
} from "./dropdownGroupUtils";
import { getDimensionHierarchies } from "core/actions/configuratorActions";
import { useSelector } from "react-redux";

/**
 * @param {Object} params
 * @param {Object} params.item - The dropdownGroup field config (contains accessor, dropdowns array, label, etc.).
 * @param {Object} params.formData - The full form state object.
 * @param {Function} params.handleChange - The form's change handler from configurator-form.
 * @param {boolean} params.disabledFields - Global flag to disable all fields.
 * @returns {Object} { groupValue, normalizedDropdowns, getFilteredOptionsForIndex, getResolvedOptionsForIndex, getSelectedOptionsForField, dimensionHierarchies }
 */

const dimensionSchemaMapping = {
  product: "product_generic_schema_mapping",
  store: "store_generic_schema_mapping",
};

const useDropdownGroup = ({ item, formData, handleChange, disabledFields }) => {
  const [dimensionHierarchies, setDimensionHierarchies] = useState([]);
  const hierarchiesFetchedRef = useRef(false);
  const groupValue = formData?.[item.accessor] || {};
  const dropdowns = Array.isArray(item.dropdowns) ? item.dropdowns : [];
  const { screenName } = useSelector((state) => state.configuratorReducer);

  /** Memoized array of normalized dropdown configs, recomputed only when dropdowns or disabledFields change. */
  const normalizedDropdowns = useMemo(() => {
    return dropdowns.map((field) =>
      normalizeDropdownConfig(field, disabledFields)
    );
  }, [dropdowns, disabledFields]);

  /**
   * Returns the filtered options for a dropdown at the given index.
   * Applies cascading logic if the dropdown has cascaded=true.
   *
   * @param {number} dropdownIndex - Index in the normalizedDropdowns array.
   * @returns {Array} Filtered options list.
   */
  const getFilteredOptionsForIndex = (dropdownIndex) => {
    return getFilteredOptions(dropdownIndex, normalizedDropdowns, groupValue);
  };

  /**
   * Returns the resolved options for a dropdown at the given index.
   * When item.fetchHierarchies is true and the dropdown has no initialData,
   * options are derived from dimensionHierarchies (filtered by dimension),
   * with cascading logic applied (hierarchyLevel > nearest cascaded ancestor's hierarchyLevel).
   * Otherwise falls back to the standard getFilteredOptionsForIndex.
   */
  const getResolvedOptionsForIndex = (dropdownIndex) => {
    const { field } = normalizedDropdowns[dropdownIndex];
    if (!item.fetchHierarchies || field.initialData) {
      return getFilteredOptionsForIndex(dropdownIndex);
    }
    let options = dimensionHierarchies.filter(
      (h) => h.dimension === field.dimension
    );
    if (dropdownIndex > 0 && field.cascaded) {
      let ancestorHierarchyLevel = null;
      for (let i = dropdownIndex - 1; i >= 0; i--) {
        const ancestorField = normalizedDropdowns[i].field;
        if (!ancestorField.cascaded) continue;
        const ancestorSelected = groupValue?.[ancestorField.field_name];
        if (ancestorSelected != null && ancestorSelected !== "") {
          if (ancestorSelected?.hierarchyLevel != null) {
            ancestorHierarchyLevel = ancestorSelected.hierarchyLevel;
          }
          break;
        }
      }
      if (ancestorHierarchyLevel != null) {
        options = options.filter(
          (opt) => opt.hierarchyLevel > ancestorHierarchyLevel
        );
      }
    }
    return options;
  };

  /**
   * Resolves the current selection and filtered options for a specific dropdown field.
   *
   * @param {string} fieldName - The field_name of the dropdown.
   * @param {number} dropdownIndex - Index in the normalizedDropdowns array.
   * @param {boolean} isMulti - Whether the dropdown supports multi-select.
   * @returns {Object} { selected: matched option(s), filteredOptions: available options }.
   */
  const getSelectedOptionsForField = (fieldName, dropdownIndex, isMulti) => {
    const currentValue = groupValue?.[fieldName];
    const resolvedOptions = getResolvedOptionsForIndex(dropdownIndex);
    return {
      selected: getSelectedOptions(currentValue, resolvedOptions, isMulti),
      filteredOptions: resolvedOptions,
    };
  };

  /**
   * Effect: Auto-initialize default values.
   * For each dropdown that has a configured defaultValue (and doesn't already
   * have a value in formData), finds the matching option and calls handleChange
   * to set it. This ensures defaults appear pre-selected in the UI and are
   * included in the saved payload.
   */
  useEffect(() => {
    normalizedDropdowns.forEach(
      ({ field, listOptions, isMulti, lockedDefaultRaw }) => {
        if (lockedDefaultRaw == null) {
          return;
        }

        const currentValue = groupValue?.[field.field_name];
        if (hasExistingValue(currentValue)) {
          return;
        }

        const defaultVal = resolveDefaultMatchValue(lockedDefaultRaw);
        const optionMatch = listOptions.find(
          (option) => option.value === defaultVal
        );
        if (!optionMatch) {
          return;
        }

        handleChange(
          isMulti ? [optionMatch] : [optionMatch],
          "dropdownGroup",
          item.accessor,
          {
            ...item,
            dropdownFieldName: field.field_name,
            isMulti,
          },
          []
        );
      }
    );
  }, [groupValue, handleChange, item, normalizedDropdowns]);

  /**
   * Effect: Auto-clear stale cascaded selections.
   * When a parent dropdown's value changes, child cascaded dropdowns may have
   * a selected value that is no longer in their resolved options list.
   * This effect detects that case and clears the invalid selection by calling
   * handleChange with an empty array.
   * Skips execution when item.fetchHierarchies is true but dimensionHierarchies
   * has not yet loaded, to avoid clearing valid saved values on refresh.
   */
  useEffect(() => {
    if (item.fetchHierarchies && dimensionHierarchies.length === 0) {
      return;
    }
    normalizedDropdowns.forEach(({ field, isMulti }, dropdownIndex) => {
      if (dropdownIndex === 0 || !field.cascaded) {
        return;
      }
      const currentValue = groupValue?.[field.field_name];
      if (currentValue == null || currentValue === "") {
        return;
      }
      const resolvedOptions = getResolvedOptionsForIndex(dropdownIndex);
      const matchValue = extractMatchValue(currentValue);
      const stillValid = resolvedOptions.some(
        (option) => option.value === matchValue
      );
      if (!stillValid) {
        handleChange(
          [],
          "dropdownGroup",
          item.accessor,
          {
            ...item,
            dropdownFieldName: field.field_name,
            isMulti,
          },
          []
        );
      }
    });
  }, [groupValue, normalizedDropdowns, dimensionHierarchies]);

  useEffect(() => {
    if (
      screenName?.length > 0 &&
      item.fetchHierarchies &&
      !hierarchiesFetchedRef.current
    ) {
      hierarchiesFetchedRef.current = true;
      fetchHierarchies(screenName);
    }
  }, [item, screenName]);

  const fetchHierarchies = async (screenName) => {
    try {
      let updatedData = [];
      const data = await getDimensionHierarchies(screenName)();
      let hierarchyData = data?.data?.data?.filters?.filter(
        (item) => item.is_hierarchy
      );
      hierarchyData.forEach((item, idx) => {
        if (!item) return;
        updatedData.push({
          hierarchyLevel: item.hierarchy_level ?? idx,
          label: item.label,
          value: item.column_name,
          dimension: item.dimension,
          level_desc: "",
          level_desc_display_name: "",
        });
      });
      setDimensionHierarchies(updatedData);
    } catch (error) {
      console.log(error);
    }
  };

  return {
    groupValue,
    normalizedDropdowns,
    getFilteredOptionsForIndex,
    getResolvedOptionsForIndex,
    getSelectedOptionsForField,
    dimensionHierarchies,
  };
};

export default useDropdownGroup;
