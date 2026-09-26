import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Generic hook for cross-filter cascading functionality.
 * When a filter's value changes, downstream filters' options are re-fetched
 * with the current selections of upstream filters included in the payload.
 *
 * @param {Object} config
 * @param {Array} config.filters - Array of filter configs. Each must have at minimum:
 *   { paramName, dimension?, column_name?, attribute_name?, display_type?, ... }
 *   The order in this array determines the cascading hierarchy (index 0 = most upstream).
 * @param {Function} config.fetchOptionsFn - Async function to fetch options for a filter.
 *   Signature: (filterConfig, existingSelections, allFilters) => Promise<Array<{label, value}>>
 *   - filterConfig: the config of the filter whose options we're fetching
 *   - existingSelections: array of { attributeName, filterName, values, checkAll } for upstream filters
 *   - allFilters: the full filters array (for reference/lookup)
 * @param {Object} config.initialSelections - Optional. { paramName: value[] } to preload selections.
 * @param {boolean} config.fetchOnMount - Whether to fetch initial options for all filters on mount. Default: true.
 * @param {Function} config.onSelectionChange - Optional callback fired after any filter value changes.
 *   Signature: (paramName, selectedValues, allSelections) => void
 *
 * @returns {Object}
 *   - optionsMap: { paramName: Array<{label, value}> } — current available options per filter
 *   - loadingMap: { paramName: boolean } — loading state per filter
 *   - selectionsMap: { paramName: value[] } — current selections per filter
 *   - onFilterChange: (paramName, selectedValues) => void — call when user changes a filter
 *   - resetAll: () => void — reset all selections and re-fetch initial options
 *   - resetFilter: (paramName) => void — reset a single filter and its downstream filters
 */
const useCrossFilterCascading = ({
  filters = [],
  fetchOptionsFn,
  initialSelections = {},
  fetchOnMount = true,
  onSelectionChange,
}) => {
  // State maps
  const [optionsMap, setOptionsMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [selectionsMap, setSelectionsMap] = useState(() => {
    // Initialize from initialSelections
    const initial = {};
    filters.forEach((f) => {
      const paramName = f.paramName || f.param_name || f.column_name || f.attribute_name;
      initial[paramName] = initialSelections[paramName] || [];
    });
    return initial;
  });

  // Refs for latest state access in async operations
  const selectionsRef = useRef(selectionsMap);
  const filtersRef = useRef(filters);
  const fetchFnRef = useRef(fetchOptionsFn);
  const mountedRef = useRef(true);

  // Keep refs in sync
  useEffect(() => {
    selectionsRef.current = selectionsMap;
  }, [selectionsMap]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    fetchFnRef.current = fetchOptionsFn;
  }, [fetchOptionsFn]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Get the paramName from a filter config object (supports multiple naming conventions)
   */
  const getParamName = useCallback((filter) => {
    return filter.paramName || filter.param_name || filter.column_name || filter.attribute_name;
  }, []);

  /**
   * Get the index of a filter in the hierarchy by its paramName
   */
  const getFilterIndex = useCallback((paramName) => {
    return filtersRef.current.findIndex((f) => getParamName(f) === paramName);
  }, [getParamName]);

  /**
   * Get all filters that are downstream (higher index) of a given filter
   */
  const getDownstreamFilters = useCallback((paramName) => {
    const index = getFilterIndex(paramName);
    if (index === -1) return [];
    return filtersRef.current.slice(index + 1);
  }, [getFilterIndex]);

  /**
   * Get all filters that are upstream (lower index) of a given filter
   */
  const getUpstreamFilters = useCallback((paramName) => {
    const index = getFilterIndex(paramName);
    if (index <= 0) return [];
    return filtersRef.current.slice(0, index);
  }, [getFilterIndex]);

  /**
   * Build the existing selections payload for upstream filters (for cascading API call)
   */
  const buildExistingSelections = useCallback((paramName) => {
    const upstreamFilters = getUpstreamFilters(paramName);
    const currentSelections = selectionsRef.current;

    return upstreamFilters
      .filter((f) => {
        const pName = getParamName(f);
        const vals = currentSelections[pName];
        return vals && vals.length > 0;
      })
      .map((f) => {
        const pName = getParamName(f);
        return {
          filterName: f.label || f.name || pName,
          attributeName: f.column_name || f.attribute_name || pName,
          values: currentSelections[pName] || [],
          checkAll: false,
        };
      });
  }, [getUpstreamFilters, getParamName]);

  /**
   * Fetch options for a single filter
   */
  const fetchOptionsForFilter = useCallback(async (filterConfig) => {
    const paramName = getParamName(filterConfig);
    if (!fetchFnRef.current) return;

    // Set loading
    setLoadingMap((prev) => ({ ...prev, [paramName]: true }));

    try {
      const existingSelections = buildExistingSelections(paramName);
      const options = await fetchFnRef.current(
        filterConfig,
        existingSelections,
        filtersRef.current
      );

      if (!mountedRef.current) return;

      // Check if the response contains extra options for other filters
      const extraOptionsMap = options?.__extraOptionsMap;
      if (extraOptionsMap && typeof extraOptionsMap === "object") {
        // Distribute extra options to matching filters
        setOptionsMap((prev) => {
          const updated = { ...prev, [paramName]: options || [] };
          Object.keys(extraOptionsMap).forEach((key) => {
            // Only populate if this key matches a known filter in our hierarchy
            const matchingFilter = filtersRef.current.find(
              (f) => getParamName(f) === key || f.column_name === key || f.attribute_name === key
            );
            if (matchingFilter) {
              const matchParamName = getParamName(matchingFilter);
              updated[matchParamName] = extraOptionsMap[key];
            }
          });
          return updated;
        });
        // Clear loading for extra filters that were populated
        setLoadingMap((prev) => {
          const updated = { ...prev, [paramName]: false };
          Object.keys(extraOptionsMap).forEach((key) => {
            const matchingFilter = filtersRef.current.find(
              (f) => getParamName(f) === key || f.column_name === key || f.attribute_name === key
            );
            if (matchingFilter) {
              updated[getParamName(matchingFilter)] = false;
            }
          });
          return updated;
        });
      } else {
        setOptionsMap((prev) => ({ ...prev, [paramName]: options || [] }));
        setLoadingMap((prev) => ({ ...prev, [paramName]: false }));
      }
    } catch (error) {
      console.error(`[useCrossFilterCascading] Error fetching options for ${paramName}:`, error);
      if (mountedRef.current) {
        setOptionsMap((prev) => ({ ...prev, [paramName]: [] }));
        setLoadingMap((prev) => ({ ...prev, [paramName]: false }));
      }
    }
  }, [getParamName, buildExistingSelections]);

  /**
   * Fetch options for multiple filters (used for initial load and cascade refresh)
   */
  const fetchOptionsForFilters = useCallback(async (filterConfigs) => {
    await Promise.all(filterConfigs.map((f) => fetchOptionsForFilter(f)));
  }, [fetchOptionsForFilter]);

  /**
   * Handle a filter value change — triggers cascading for downstream filters
   */
  const onFilterChange = useCallback((paramName, selectedValues) => {
    const values = Array.isArray(selectedValues) ? selectedValues : [selectedValues];

    // Update selections
    setSelectionsMap((prev) => {
      const updated = { ...prev, [paramName]: values };
      selectionsRef.current = updated;

      // Notify consumer
      if (onSelectionChange) {
        onSelectionChange(paramName, values, updated);
      }

      return updated;
    });

    // Only clear downstream if the filter is being emptied (user cleared the filter).
    // When a value is being selected/changed while downstream filters already have
    // selections, preserve them — the dropdown close handler will decide whether
    // to refetch downstream options.
    if (values.length === 0) {
      const downstreamFilters = getDownstreamFilters(paramName);
      if (downstreamFilters.length > 0) {
        // Clear downstream selections
        setSelectionsMap((prev) => {
          const updated = { ...prev };
          downstreamFilters.forEach((f) => {
            const pName = getParamName(f);
            updated[pName] = [];
          });
          selectionsRef.current = updated;
          return updated;
        });

        // Clear downstream options
        const downstreamParamNames = downstreamFilters.map(getParamName);
        setOptionsMap((prev) => {
          const updated = { ...prev };
          downstreamParamNames.forEach((pName) => {
            updated[pName] = [];
          });
          return updated;
        });
      }
    }
  }, [getDownstreamFilters, getParamName, fetchOptionsForFilter, onSelectionChange]);

  /**
   * Reset all filters — clears selections and re-fetches initial options
   */
  const resetAll = useCallback(() => {
    const initial = {};
    filtersRef.current.forEach((f) => {
      initial[getParamName(f)] = [];
    });
    setSelectionsMap(initial);
    selectionsRef.current = initial;
    setOptionsMap({});

    if (fetchFnRef.current && filtersRef.current.length > 0) {
      // Fetch options for the first filter (others will cascade)
      fetchOptionsForFilter(filtersRef.current[0]);
    }
  }, [getParamName, fetchOptionsForFilter]);

  /**
   * Reset a specific filter and all its downstream filters
   */
  const resetFilter = useCallback((paramName) => {
    const downstreamFilters = getDownstreamFilters(paramName);
    const allToReset = [paramName, ...downstreamFilters.map(getParamName)];

    setSelectionsMap((prev) => {
      const updated = { ...prev };
      allToReset.forEach((pName) => {
        updated[pName] = [];
      });
      selectionsRef.current = updated;
      return updated;
    });

    // Re-fetch options for the reset filter itself
    const filterConfig = filtersRef.current.find((f) => getParamName(f) === paramName);
    if (filterConfig) {
      fetchOptionsForFilter(filterConfig);
    }
  }, [getDownstreamFilters, getParamName, fetchOptionsForFilter]);

  /**
   * Fetch options for a specific filter on demand (e.g., when dropdown is opened)
   */
  const fetchOptions = useCallback((paramName) => {
    const filterConfig = filtersRef.current.find((f) => getParamName(f) === paramName);
    if (filterConfig) {
      fetchOptionsForFilter(filterConfig);
    }
  }, [getParamName, fetchOptionsForFilter]);

  /**
   * Fetch options for all downstream filters of a given filter.
   * Called when the user closes a dropdown after making a selection,
   * so downstream filters are pre-populated before the user opens them.
   */
  const fetchDownstreamOptions = useCallback((paramName) => {
    const downstreamFilters = getDownstreamFilters(paramName);
    if (downstreamFilters.length > 0) {
      fetchOptionsForFilters(downstreamFilters);
    }
  }, [getDownstreamFilters, fetchOptionsForFilters]);

  /**
   * Build selections payload that includes the triggering filter and all other
   * filters that have selections (used for upstream/reverse cascading).
   */
  const buildAllSelections = useCallback((excludeParamName) => {
    const currentSelections = selectionsRef.current;
    return filtersRef.current
      .filter((f) => {
        const pName = getParamName(f);
        if (pName === excludeParamName) return false;
        const vals = currentSelections[pName];
        return vals && vals.length > 0;
      })
      .map((f) => {
        const pName = getParamName(f);
        return {
          filterName: f.label || f.name || pName,
          attributeName: f.column_name || f.attribute_name || pName,
          values: currentSelections[pName] || [],
          checkAll: false,
        };
      });
  }, [getParamName]);

  /**
   * Fetch options for a single upstream filter using all current selections
   * (reverse cascading — the payload includes the triggering lower filter's values).
   */
  const fetchUpstreamFilterOptions = useCallback(async (filterConfig) => {
    const paramName = getParamName(filterConfig);
    if (!fetchFnRef.current) return;

    setLoadingMap((prev) => ({ ...prev, [paramName]: true }));

    try {
      const existingSelections = buildAllSelections(paramName);
      const options = await fetchFnRef.current(
        filterConfig,
        existingSelections,
        filtersRef.current
      );

      if (!mountedRef.current) return;

      // Handle extra options from multi-key response
      const extraOptionsMap = options?.__extraOptionsMap;
      if (extraOptionsMap && typeof extraOptionsMap === "object") {
        setOptionsMap((prev) => {
          const updated = { ...prev, [paramName]: options || [] };
          Object.keys(extraOptionsMap).forEach((key) => {
            const matchingFilter = filtersRef.current.find(
              (f) => getParamName(f) === key || f.column_name === key || f.attribute_name === key
            );
            if (matchingFilter) {
              updated[getParamName(matchingFilter)] = extraOptionsMap[key];
            }
          });
          return updated;
        });
        setLoadingMap((prev) => {
          const updated = { ...prev, [paramName]: false };
          Object.keys(extraOptionsMap).forEach((key) => {
            const matchingFilter = filtersRef.current.find(
              (f) => getParamName(f) === key || f.column_name === key || f.attribute_name === key
            );
            if (matchingFilter) {
              updated[getParamName(matchingFilter)] = false;
            }
          });
          return updated;
        });
      } else {
        setOptionsMap((prev) => ({ ...prev, [paramName]: options || [] }));
        setLoadingMap((prev) => ({ ...prev, [paramName]: false }));
      }
    } catch (error) {
      console.error(`[useCrossFilterCascading] Error fetching upstream options for ${paramName}:`, error);
      if (mountedRef.current) {
        setOptionsMap((prev) => ({ ...prev, [paramName]: [] }));
        setLoadingMap((prev) => ({ ...prev, [paramName]: false }));
      }
    }
  }, [getParamName, buildAllSelections]);

  /**
   * Fetch options for all upstream filters of a given filter.
   * Called on dropdown close to reverse-cascade — e.g., selecting Channel
   * triggers a fetch for Brand with Channel's selection in the payload.
   */
  const fetchUpstreamOptions = useCallback((paramName) => {
    const upstreamFilters = getUpstreamFilters(paramName);
    if (upstreamFilters.length > 0) {
      Promise.all(upstreamFilters.map((f) => fetchUpstreamFilterOptions(f)));
    }
  }, [getUpstreamFilters, fetchUpstreamFilterOptions]);

  // Fetch initial options on mount
  useEffect(() => {
    if (fetchOnMount && filters.length > 0 && fetchFnRef.current) {
      // Fetch options for the first filter (it has no upstream dependencies)
      fetchOptionsForFilter(filters[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    optionsMap,
    loadingMap,
    selectionsMap,
    onFilterChange,
    resetAll,
    resetFilter,
    fetchOptions,
    fetchDownstreamOptions,
    fetchUpstreamOptions,
    getParamName,
  };
};

export default useCrossFilterCascading;
