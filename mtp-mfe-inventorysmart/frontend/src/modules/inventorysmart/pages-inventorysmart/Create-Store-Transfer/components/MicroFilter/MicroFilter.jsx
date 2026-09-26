// @ts-nocheck
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { connect } from "react-redux";
import { Select, Panel, FiltersStrip, useTranslation } from "impact-ui-v3";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  CrossFilterProvider,
  useCrossFilterContext,
} from "core/commonComponents/crossFilterCascading";
import { getCombinedFilterDashboardData } from "core/commonComponents/coreComponentScreen/utils";
import { addSnack } from "core/actions/snackbarActions";
import {
  fetchFilterConfig,
  filtersPayload,
} from "../../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../../constants-inventorysmart/stringConstants";
import {
  setMicroFilterLoader,
  setMicroFilterDependency,
  setMicroFilterSelectedFilters,
  setMicroFilterConfig,
  setMicroFilterAppliedData,
} from "../../../../services-inventorysmart/Create-Transfer-Recommendations-S2S/create-transfer-recommendations-service";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  MANDATORY_MICRO_FILTERS,
  MICRO_FILTER_CONFIG_NAME,
  REVIEW_STATUS_CONFIG,
  INITIAL_DISPLAY_COUNT,
  LOAD_MORE_COUNT,
  SEARCH_DISPLAY_LIMIT,
  REVIEW_STATUS_MAPPING,
} from "./microFilterConstanat";
import {
  formatOption,
  formatSlice,
  getIntersectedOptions,
} from "./microFilterUtils";

const microFilterStyles = makeStyles(() => ({
  filtersContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "24px",
    rowGap: "14.5px",
  },
  filterItem: {
    // At least 2 selects per row; grow to fill available space.
    flex: "1 1 45%",
    minWidth: "200px",
  },
  filterHeading: {
    color: colours.lightNeutrals,
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "21px",
    textTransform: "capitalize",
    marginTop: "4px",
    marginBottom: "14.5px",
  },
}));

/**
 * Adapter that bridges the generic useCrossFilterCascading hook with the
 * inventorysmart combined cross-dimension filter API. This is the
 * `fetchOptionsFn` passed to the CrossFilterProvider.
 *
 * @param {Object} filterConfig - The filter config for which to fetch options
 * @param {Array} existingSelections - Upstream selections built by the hook
 *   (unused — the full dependency is rebuilt from live selections instead)
 * @param {Array} allFilters - Full array of all filter configs
 * @param {string} screenName - The screen name to use in the API payload
 * @param {Function} getSelections - Returns the latest selectionsMap
 *   ({ paramName: values[] }) so the dependency includes ALL selections
 * @param {Array} microStep1SelectedFilters - step-1 selections used to
 *   intersect each fetched column's options
 * @returns {Promise<Array<{label, value}>>} - Formatted options
 */
const fetchMicroFilterOptions = async (
  filterConfig,
  existingSelections = [],
  allFilters = [],
  screenName,
  getSelections,
  microStep1SelectedFilters
) => {
  try {
    const attributeName =
      filterConfig.column_name ||
      filterConfig.attribute_name ||
      filterConfig.param_name ||
      filterConfig.paramName;

    if (!attributeName) return [];

    const allSelections = getSelections?.() || {};

    const getKey = (f) =>
      f.column_name || f.attribute_name || f.param_name || f.paramName;
    const hasSelection = (f) => {
      const vals = allSelections[getKey(f)];
      return Array.isArray(vals) && vals.length > 0;
    };

    const currentIndex = (allFilters || []).findIndex(
      (f) => getKey(f) === attributeName
    );

    const nextKey =
      currentIndex >= 0 && allFilters[currentIndex + 1]
        ? getKey(allFilters[currentIndex + 1])
        : null;

    // `attributes`: every filter that is mandatory OR currently has a
    // selection — plus the filter being requested (so a lazy-open fetch for a
    // non-mandatory, unselected filter still returns its own options).
    // Same semantics as coreComponentScreen's filterElementsToFetch under
    // quickFilterLoad.
    const filtersList = (allFilters || [])
      .filter(
        (f) =>
          f.is_mandatory ||
          hasSelection(f) ||
          getKey(f) === attributeName ||
          (nextKey && getKey(f) === nextKey)
      )
      .map((f) => ({
        column_name: getKey(f),
        dimension: f.dimension || "product",
        display_type: f.display_type || "dropdown",
      }));

    if (filtersList.length === 0) return [];

    // `filters`: all current selections (not just upstream of the changed
    // filter) — the full cascaded dependency, like coreComponentScreen's
    // cascadedSelectionDependency. Non-cascaded filters (review_status) are
    // absent from allFilters so they are never included.
    const initialDependency = (allFilters || [])
      .filter((f) => hasSelection(f))
      .map((f) => {
        const key = getKey(f);
        return {
          filter_name: f.label || f.name || key,
          filter_id: key,
          filter_type: "cascaded",
          dimension: f.dimension || "product",
          display_type: f.display_type || "dropdown",
          check_configuration: [],
          is_mandatory: f.is_mandatory || false,
          extra: {},
          values: allSelections[key] || [],
          attribute_name: key,
          operator: "in",
          display_order: f.display_order || 0,
        };
      });

    const responseData = await getCombinedFilterDashboardData(
      filtersList,
      initialDependency,
      screenName
    );

    if (!responseData) return [];

    const primaryValues = responseData[attributeName] || [];
    let primaryOptions = Array.isArray(primaryValues)
      ? primaryValues.map((value) => {
          const stringValue = String(value);
          return {
            label: replaceSpecialCharacter(stringValue),
            value: stringValue,
          };
        })
      : [];

    // Restrict options to the values step 1 selected for this column
    // (microStep1SelectedFilters ∩ fetched options).
    primaryOptions = getIntersectedOptions(
      primaryOptions,
      microStep1SelectedFilters,
      attributeName
    );

    // The combined API can return options for multiple filters in one call.
    // Distribute any extra keys to the matching filters via __extraOptionsMap
    // (the hook will place them in optionsMap for the right filter).
    const extraOptionsMap = {};
    Object.keys(responseData).forEach((key) => {
      if (key !== attributeName && Array.isArray(responseData[key])) {
        const mapped = responseData[key].map((value) => {
          const stringValue = String(value);
          return {
            label: replaceSpecialCharacter(stringValue),
            value: stringValue,
          };
        });
        // Same step-1 intersection applied per extra column.
        extraOptionsMap[key] = getIntersectedOptions(
          mapped,
          microStep1SelectedFilters,
          key
        );
      }
    });

    if (Object.keys(extraOptionsMap).length > 0) {
      primaryOptions.__extraOptionsMap = extraOptionsMap;
    }

    return primaryOptions;
  } catch (error) {
    console.error("[MicroFilterNewOne] fetchMicroFilterOptions error:", error);
    return [];
  }
};

/**
 * A single multi-select dropdown that consumes the cross-filter cascading
 * context for its options, loading state and selections. Mirrors the
 * cascading behaviour of SelectContent (lazy load on open, downstream +
 * upstream refetch on close) but stores state purely in the context.
 */
const CrossFilterSelect = ({
  filterConfig,
  initialValues,
  onCascadingStart,
}) => {
  const ctx = useCrossFilterContext();
  const paramName = filterConfig.paramName;
  const isNonCascaded = filterConfig.type === "non-cascaded";

  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [initialOptions, setInitialOptions] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);

  const allOptionsRef = useRef([]);
  const isSearchActiveRef = useRef(false);
  const searchTermRef = useRef("");
  const selectAllCountRef = useRef(0);
  // Selection snapshot taken when the dropdown opens — compared on close to
  // decide whether the selection actually changed and a cascade is needed.
  const selectionSnapshotRef = useRef([]);
  // Accumulates every option object we have ever seen so we can resolve
  // saved string selections into { label, value } objects.
  const valueToOptionRef = useRef({});

  const isCascading = ctx?.isEnabled && paramName && !isNonCascaded;
  const options = useMemo(
    () =>
      isNonCascaded
        ? filterConfig.options || []
        : ctx?.optionsMap?.[paramName] || [],
    [isNonCascaded, filterConfig.options, ctx?.optionsMap, paramName]
  );
  const loading = isNonCascaded ? false : ctx?.loadingMap?.[paramName] || false;
  const selectionValues = ctx?.selectionsMap?.[paramName] || [];

  // Index incoming options for selection resolution + lazy rendering.
  useEffect(() => {
    if (isNonCascaded && filterConfig.options?.length > 0) {
      allOptionsRef.current = filterConfig.options;
      filterConfig.options.forEach((opt) => {
        valueToOptionRef.current[opt.value] = opt;
      });
      const initialSlice = formatSlice(
        filterConfig.options,
        0,
        INITIAL_DISPLAY_COUNT
      );
      setInitialOptions(initialSlice);
      setCurrentOptions(initialSlice);
    } else if (isCascading && options.length > 0) {
      allOptionsRef.current = options;
      options.forEach((opt) => {
        valueToOptionRef.current[opt.value] = opt;
      });
      const initialSlice = formatSlice(options, 0, INITIAL_DISPLAY_COUNT);
      setInitialOptions(initialSlice);
      setCurrentOptions(initialSlice);
    }
  }, [isNonCascaded, isCascading, options, filterConfig.options]);

  // Reconcile selected option objects from the context's string selections.
  useEffect(() => {
    if (!isCascading) return;
    const resolved = selectionValues.map((val) => {
      const stringValue = String(val);
      return (
        valueToOptionRef.current[stringValue] || {
          label: replaceSpecialCharacter(stringValue),
          value: stringValue,
        }
      );
    });
    setSelectedOptions(resolved);
    // If the selection no longer covers all loaded options, clear select-all.
    if (
      isAllSelected &&
      allOptionsRef.current.length > 0 &&
      resolved.length < allOptionsRef.current.length
    ) {
      setIsAllSelected(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCascading, selectionValues]);

  // Non-cascaded filters (e.g. review_status) live outside the provider's
  // filter list, so their saved selections are not initialised by the
  // provider. Seed them once on mount: restore the selected option objects
  // locally and record the values in selectionsMap so Apply picks them up.
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (
      didSeedRef.current ||
      !isNonCascaded ||
      !Array.isArray(initialValues) ||
      initialValues.length === 0
    ) {
      return;
    }
    didSeedRef.current = true;
    const stringValues = initialValues.map((v) => String(v));
    const resolved = stringValues.map(
      (stringValue) =>
        valueToOptionRef.current[stringValue] || {
          label: replaceSpecialCharacter(stringValue),
          value: stringValue,
        }
    );
    setSelectedOptions(resolved);
    if (ctx?.isEnabled && paramName) {
      ctx.onFilterChange(paramName, stringValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNonCascaded, initialValues]);

  const handleChange = (selected) => {
    const value = Array.isArray(selected)
      ? selected.map((s) => s.value)
      : selected.value;
    if (ctx?.isEnabled && paramName) {
      ctx.onFilterChange(paramName, Array.isArray(value) ? value : [value]);
    }
  };

  const handleClearAll = () => {
    setSelectedOptions([]);
    setIsAllSelected(false);
    selectAllCountRef.current = 0;
    if (ctx?.isEnabled && paramName) {
      // Local reset only — the hook clears this + downstream selections and
      // options. No API call; options lazy-load again on the next open.
      ctx.onFilterChange(paramName, []);
    }
  };

  const handleSearch = useCallback((event) => {
    const rawInput = event?.target?.value || "";
    searchTermRef.current = rawInput;
    const trimmed = rawInput.trim();

    if (!trimmed) {
      isSearchActiveRef.current = false;
      const resetSlice = formatSlice(
        allOptionsRef.current,
        0,
        INITIAL_DISPLAY_COUNT
      );
      setCurrentOptions(resetSlice);
      setInitialOptions(resetSlice);
      setIsAllSelected(false);
      return;
    }

    isSearchActiveRef.current = true;
    const terms = trimmed
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const filtered = allOptionsRef.current.filter((option) => {
      const labelLower = option.label?.toString().toLowerCase() || "";
      const valueLower = option.value?.toString().toLowerCase() || "";
      return terms.some(
        (term) => labelLower.includes(term) || valueLower.includes(term)
      );
    });

    const formatted = filtered.slice(0, SEARCH_DISPLAY_LIMIT).map(formatOption);
    setCurrentOptions(formatted);
    setInitialOptions(formatted);
    setIsAllSelected(false);
  }, []);

  return (
    <div style={{ width: "100%" }}>
      <Select
        currentOptions={currentOptions}
        setCurrentOptions={setCurrentOptions}
        label={filterConfig.label}
        labelOrientation="top"
        isRequired={filterConfig.is_mandatory}
        onClearAll={handleClearAll}
        handleChange={handleChange}
        isClearable={true}
        isCloseWhenClickOutside
        setIsOpen={(open) => {
          setIsOpen(open);
          if (!isCascading) return;
          if (open) {
            // Snapshot the current selection so close can detect changes.
            selectionSnapshotRef.current = [
              ...(ctx.selectionsMap[paramName] || []),
            ];
            // Lazy fetch the first time the dropdown is opened.
            if (
              (!ctx.optionsMap[paramName] ||
                ctx.optionsMap[paramName].length === 0) &&
              !ctx.loadingMap[paramName]
            ) {
              ctx.fetchOptions(paramName);
            }
          } else {
            // On close, if the selection changed AND still has values, fire
            // ONE combined call: attributes = all required + selected filters,
            // filters = all current selections. Clearing (empty selection) is
            // a pure local reset — the hook already cleared downstream
            // selections/options, no API call needed.
            const currentSelection = ctx.selectionsMap[paramName] || [];
            const snapshot = selectionSnapshotRef.current || [];
            const changed =
              currentSelection.length !== snapshot.length ||
              currentSelection.some((v) => !snapshot.includes(v));
            if (changed && currentSelection.length > 0) {
              onCascadingStart?.();
              ctx.fetchOptions(paramName);
            }
          }
        }}
        width="292px"
        isOpen={isOpen}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        initialOptions={initialOptions}
        isMulti={true}
        isSelectAll={isAllSelected}
        setIsSelectAll={setIsAllSelected}
        toggleSelectAll={true}
        isLoading={loading}
        emptyMessage={loading ? "Loading values..." : "No options available"}
        isWithSearch={true}
        onSearch={handleSearch}
        onMenuScrollToBottom={() => {
          if (isSearchActiveRef.current) return;
          const allRaw = allOptionsRef.current;
          if (allRaw.length > 0 && currentOptions.length < allRaw.length) {
            const nextCount = Math.min(
              currentOptions.length + LOAD_MORE_COUNT,
              allRaw.length
            );
            const newBatch = formatSlice(
              allRaw,
              currentOptions.length,
              nextCount
            );
            const nextOptions = [...currentOptions, ...newBatch];
            setCurrentOptions(nextOptions);
            setInitialOptions(nextOptions);
            if (isAllSelected) {
              setSelectedOptions(nextOptions);
            }
          }
        }}
        onSelectAll={(e) => {
          if (e && e.target.checked) {
            let valuesToDispatch;
            if (isSearchActiveRef.current) {
              valuesToDispatch = currentOptions.map((opt) => opt.value);
              setSelectedOptions([...currentOptions]);
              selectAllCountRef.current = currentOptions.length;
            } else {
              valuesToDispatch = allOptionsRef.current.map((opt) => opt.value);
              setSelectedOptions([...currentOptions]);
              selectAllCountRef.current = allOptionsRef.current.length;
            }
            setIsAllSelected(true);
            if (ctx?.isEnabled && paramName) {
              ctx.onFilterChange(paramName, valuesToDispatch);
            }
          } else {
            handleClearAll();
          }
        }}
        customPlaceholderAfterSelect={
          isAllSelected
            ? selectAllCountRef.current
            : selectedOptions.length > 0
            ? selectedOptions.length
            : null
        }
      />
    </div>
  );
};

/**
 * Content rendered inside the CrossFilterProvider. Tracks cascading
 * fetches (downstream/upstream refetch on dropdown close) :wqto show a
 * whole-panel loader and disable the footer buttons. Lazy-load fetches
 * triggered by opening a dropdown do NOT activate the panel loader.
 */
const MicroFilterPanelContent = ({
  crossFilterConfigs,
  initialSelections,
  onCascadingLoadingChange,
  filtersContainerClass,
  filterItemClass,
}) => {
  const ctx = useCrossFilterContext();
  const cascadingActiveRef = useRef(false);
  const [isCascadingLoading, setIsCascadingLoading] = useState(false);

  // Any filter currently loading via the cascading context?
  const anyLoading = useMemo(
    () => Object.values(ctx?.loadingMap || {}).some(Boolean),
    [ctx?.loadingMap]
  );

  // Clear the cascading loader once all cascading fetches are done.
  useEffect(() => {
    if (!anyLoading && cascadingActiveRef.current) {
      cascadingActiveRef.current = false;
      setIsCascadingLoading(false);
      onCascadingLoadingChange?.(false);
    }
  }, [anyLoading, onCascadingLoadingChange]);

  // Called by CrossFilterSelect when it triggers a cascade fetch.
  const startCascading = useCallback(() => {
    cascadingActiveRef.current = true;
    setIsCascadingLoading(true);
    onCascadingLoadingChange?.(true);
  }, [onCascadingLoadingChange]);

  return (
    <LoadingOverlay loader={isCascadingLoading} minHeight={200}>
      <div className={filtersContainerClass}>
        {crossFilterConfigs.map((cfg) => (
          <div key={cfg.paramName} className={filterItemClass}>
            <CrossFilterSelect
              filterConfig={cfg}
              initialValues={initialSelections?.[cfg.paramName]}
              onCascadingStart={startCascading}
            />
          </div>
        ))}
      </div>
    </LoadingOverlay>
  );
};

const MicroFilter = ({
  screenName,
  showMicroFilterStrip,
  microFilterDependency,
  setMicroFilterLoader,
  setMicroFilterDependency,
  setMicroFilterSelectedFilters,
  setMicroFilterConfig,
  setMicroFilterAppliedData,
  microStep1SelectedFilters,
  addSnack,
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [filters, setFilters] = useState([]);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [isCascadingLoading, setIsCascadingLoading] = useState(false);
  const [appliedChips, setAppliedChips] = useState([]);

  const microFilterClasses = microFilterStyles();
  const { t } = useTranslation();

  // Latest selections from the CrossFilterProvider (kept in a ref so the
  // Apply button — which lives outside the provider — can read them).
  const selectionsRef = useRef({});

  const displaySnackMessages = (message, variation) => {
    addSnack({ message, options: { variant: variation } });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    setMicroFilterLoader(false);
  };

  // Fetch the micro filter config on mount (same call as MicroFilterPanel).
  useEffect(() => {
    const fetchMicroFilterConfig = async () => {
      try {
        setMicroFilterLoader(true);
        setIsFilterLoading(true);
        const response = await fetchFilterConfig(MICRO_FILTER_CONFIG_NAME);
        // Append the non-cascaded "Review Status" filter with fixed options.
        const filtersWithReviewStatus = [
          ...(response || []),
          REVIEW_STATUS_CONFIG,
        ];
        setFilters(filtersWithReviewStatus);
        setMicroFilterConfig(filtersWithReviewStatus);
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        setMicroFilterLoader(false);
        setIsFilterLoading(false);
      }
    };
    fetchMicroFilterConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the cross-filter configs from the raw filter config response.
  // Only dropdown filters participate in cascading; order by display_order.
  const crossFilterConfigs = useMemo(() => {
    if (!filters || filters.length === 0) return [];
    return filters
      .filter(
        (f) =>
          f.display_type === "dropdown" && (f.column_name || f.attribute_name)
      )
      .map((f) => {
        const paramName = f.column_name || f.attribute_name;
        return {
          paramName,
          param_name: paramName,
          column_name: f.column_name || paramName,
          attribute_name: f.attribute_name || paramName,
          dimension: f.dimension || "product",
          display_type: f.display_type || "dropdown",
          display_order: f.display_order ?? f.ordering ?? 0,
          label: f.label || paramName,
          name: f.name || f.label || paramName,
          is_mandatory: f.is_mandatory || false,
          type: f.type || f.filter_type || "cascaded",
          options: f.options || null,
        };
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [filters]);

  // Only cascaded filters are given to the CrossFilterProvider — non-cascaded
  // filters (e.g. review_status) stay completely outside the cascading system:
  // never fetched, never included in dependency payloads, never cleared by
  // clear-downstream. The order in this array defines the cascade chain.
  const cascadedFilterConfigs = useMemo(
    () => crossFilterConfigs.filter((c) => c.type !== "non-cascaded"),
    [crossFilterConfigs]
  );

  // Restore previously applied selections from redux so dropdowns show the
  // saved selection when the panel is reopened.
  const crossFilterInitialSelections = useMemo(() => {
    const selections = {};
    crossFilterConfigs.forEach((cfg) => {
      const dep = (microFilterDependency || []).find(
        (d) =>
          (d.attribute_name || d.filter_id) === cfg.column_name ||
          (d.attribute_name || d.filter_id) === cfg.paramName
      );
      if (dep && Array.isArray(dep.values) && dep.values.length > 0) {
        selections[cfg.paramName] = dep.values
          .map((v) => (typeof v === "object" ? v?.value ?? v : v))
          .map(String);
      }
    });
    return selections;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossFilterConfigs, microFilterDependency]);

  // Keep the ref in sync with the latest selections coming from the provider.
  const handleSelectionChange = useCallback(
    (_paramName, _selectedValues, allSelections) => {
      selectionsRef.current = allSelections || {};
    },
    []
  );

  // Build the dependency array (raw selection format) from the current
  // selections, used both for the chips strip and the redux payload.
  const buildDependencyFromSelections = useCallback(
    (allSelections) => {
      return crossFilterConfigs
        .map((cfg) => {
          const values = allSelections?.[cfg.paramName] || [];
          if (!values || values.length === 0) return null;
          return {
            filter_id: cfg.column_name,
            attribute_name: cfg.column_name,
            dimension: cfg.dimension,
            filter_type: cfg.type || "cascaded",
            filter_name: cfg.label,
            values: values.map((v) => String(v)),
          };
        })
        .filter(Boolean);
    },
    [crossFilterConfigs]
  );

  // Build the chips for the FiltersStrip from a dependency array.
  const buildChips = useCallback((dependency) => {
    return (dependency || [])
      .filter((dep) => Array.isArray(dep.values) && dep.values.length > 0)
      .map((dep) => {
        const filterKey = dep.filter_id || dep.attribute_name;
        return {
          id: filterKey,
          label: dep.filter_name || dep.attribute_name,
          dimension: dep.dimension,
          required: MANDATORY_MICRO_FILTERS.includes(filterKey),
          values: dep.values.map((value) => {
            const displayValue =
              typeof value === "object"
                ? filterKey === "review_status"
                  ? REVIEW_STATUS_MAPPING[value.value]
                  : value?.label || value?.value
                : filterKey === "review_status"
                ? REVIEW_STATUS_MAPPING[value]
                : value;
            return {
              id: replaceSpecialCharacter(displayValue),
              label: replaceSpecialCharacter(displayValue),
              value: replaceSpecialCharacter(displayValue),
            };
          }),
        };
      });
  }, []);

  // Initialise the chips strip from the saved redux dependency on mount.
  useEffect(() => {
    setAppliedChips(buildChips(microFilterDependency || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => {
    const currentSelections = selectionsRef.current || {};
    const dependency = buildDependencyFromSelections(currentSelections);
    const payload = filtersPayload(filters, dependency, true, false, false);
    setMicroFilterDependency(dependency);
    setMicroFilterSelectedFilters(payload?.reqBody || dependency);
    setMicroFilterAppliedData({});
    setAppliedChips(buildChips(dependency));
    setShowPanel(false);
  };

  const handlePrimaryButtonClick = () => {
    handleApply();
  };

  const handleSecondaryButtonClick = () => {
    setShowPanel(false);
  };

  // The fetchOptionsFn bound to the current screen name + live selections
  // (selectionsRef is kept in sync via handleSelectionChange).
  const fetchOptionsFn = useCallback(
    (filterConfig, existingSelections, allFilters) =>
      fetchMicroFilterOptions(
        filterConfig,
        existingSelections,
        allFilters,
        screenName,
        () => selectionsRef.current,
        microStep1SelectedFilters
      ),
    [screenName, microStep1SelectedFilters]
  );

  // Initialise the selections ref with the restored selections so Apply
  // works even if the user never touches a dropdown.
  useEffect(() => {
    selectionsRef.current = crossFilterInitialSelections;
  }, [crossFilterInitialSelections]);

  return (
    <>
      {showMicroFilterStrip && (
        <FiltersStrip
          filterTags={appliedChips}
          filterButtonClick={() => setShowPanel(true)}
          filterButtonLabel={t("inventorysmart.s2sAllFilters")}
          hideSelectedFilterBadge
        />
      )}
      <Panel
        open={showPanel}
        anchor="right"
        customFooterContent={null}
        width={640}
        onClose={() => setShowPanel(false)}
        onPrimaryButtonClick={handlePrimaryButtonClick}
        onResize={function kY() {}}
        onSecondaryButtonClick={handleSecondaryButtonClick}
        primaryButtonLabel="Apply"
        primaryButtonProps={{
          disabled: isFilterLoading || isCascadingLoading,
        }}
        secondaryButtonLabel="Cancel"
        secondaryButtonProps={{
          disabled: isCascadingLoading,
        }}
        size="large"
        title={t("inventorysmart.s2sfilterSettings")}
      >
        {showPanel && crossFilterConfigs.length > 0 && (
          <CrossFilterProvider
            filters={cascadedFilterConfigs}
            fetchOptionsFn={fetchOptionsFn}
            initialSelections={crossFilterInitialSelections}
            fetchOnMount={false}
            onSelectionChange={handleSelectionChange}
            pruneStaleSelections
          >
            <div className={microFilterClasses.filterHeading}>
              {t("inventorysmart.hierarchyFilters")}
            </div>
            <MicroFilterPanelContent
              crossFilterConfigs={crossFilterConfigs}
              initialSelections={crossFilterInitialSelections}
              onCascadingLoadingChange={setIsCascadingLoading}
              filtersContainerClass={microFilterClasses.filtersContainer}
              filterItemClass={microFilterClasses.filterItem}
            />
          </CrossFilterProvider>
        )}
      </Panel>
    </>
  );
};

const mapStateToProps = (store) => ({
  microFilterDependency:
    store?.inventorysmartReducer?.createTransferRecommendationsService
      ?.microFilterDependency,
});

const mapDispatchToProps = (dispatch) => ({
  setMicroFilterLoader: (payload) => dispatch(setMicroFilterLoader(payload)),
  setMicroFilterDependency: (payload) =>
    dispatch(setMicroFilterDependency(payload)),
  setMicroFilterSelectedFilters: (payload) =>
    dispatch(setMicroFilterSelectedFilters(payload)),
  setMicroFilterConfig: (payload) => dispatch(setMicroFilterConfig(payload)),
  setMicroFilterAppliedData: (payload) =>
    dispatch(setMicroFilterAppliedData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(MicroFilter);
