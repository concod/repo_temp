import { useCallback, useEffect, useRef, useState } from "react";
import { Select } from "impact-ui-v3";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext, setPersistedFormValues } from "core/actions/smartBotActions";
import { isEmpty } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useCrossFilterContext } from "core/commonComponents/crossFilterCascading";

const INITIAL_DISPLAY_COUNT = 100;
const LOAD_MORE_COUNT = 100;
const SEARCH_DISPLAY_LIMIT = 500;

const formatOption = (option) => ({
  ...option,
  label: replaceSpecialCharacter(option.label.toString()),
});

const formatSlice = (options, start, end) => {
  return options.slice(start, end).map(formatOption);
};

const SelectContent = ({ bodyText, isFormDisabled = false, messageIndex }) => {
  const formKey = `${messageIndex}_${bodyText?.paramName}`;
  const {
    header,
    inputPosition,
    labelOrientation,
    label,
    options,
    isRequired,
    isDisabled,
    isMulti,
    paramName
  } = bodyText;
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  const persistedFormValues = useSelector(
    (state) => state.smartBotReducer.persistedFormValues
  );
  const [currentSelectedOptions, setCurrentSelectedOptions] = useState(
    persistedFormValues?.[formKey] || []
  );
  const selectAllKey = `${formKey}__selectAllCount`;
  const [isAllSelected, setIsAllSelected] = useState(() => {
    return (persistedFormValues?.[selectAllKey] || 0) > 0;
  });
  const [initialOptions, setInitialOptions] = useState([]);
  const allOptionsRef = useRef([]);
  const isSearchActiveRef = useRef(false);
  const searchTermRef = useRef("");
  const selectAllCountRef = useRef(
    persistedFormValues?.[selectAllKey] || 0
  );
  const chatbotContext = useSelector(
    (state) => state.smartBotReducer.chatbotContext
  );
  const chatbotContextRef = useRef(chatbotContext);
  chatbotContextRef.current = chatbotContext;
  const heirarchyKeyValuePairs = useSelector(
    (state) => state.smartBotReducer.heirarchyKeyValuePairs
  );
  const dispatch = useDispatch();

  // Cross-filter cascading context (optional — graceful fallback when not wrapped)
  const crossFilterCtx = useCrossFilterContext();
  const isCascading = crossFilterCtx?.isEnabled && paramName;
  const isMountedRef = useRef(false);

  if (isEmpty(bodyText)) return null;

  const onChange = (selectedOptions) => {
    try {
      let value;
      if (Array.isArray(selectedOptions)) {
        value = selectedOptions.map((selectedValue) => selectedValue.value);
      } else {
        value = selectedOptions.value;
      }
      const latestContext = chatbotContextRef.current;
      const updatedContext = {
        ...latestContext,
        [bodyText?.paramName]: {
          ...latestContext?.[bodyText?.paramName],
          [bodyText?.paramName]: value,
          updated: true,
        },
      };
      // chatbotContext.select = {
      //   ...chatbotContext?.select,
      //   [bodyText?.paramName]: selectedOptions,
      //   updated: true
      // };
      dispatch(setChatbotContext(updatedContext));
      dispatch(setPersistedFormValues({ [formKey]: Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions] }));

      // Notify cross-filter context if cascading is active
      if (isCascading) {
        crossFilterCtx.onFilterChange(paramName, Array.isArray(value) ? value : [value]);
      }
    } catch (error) {
      console.error("Error in select handleChange", error);
    }
  };

  useEffect(() => {
    const persisted = persistedFormValues?.[formKey];
    if (!persisted || (Array.isArray(persisted) && persisted.length === 0)) {
      setCurrentSelectedOptions([]);
    }
  }, [persistedFormValues, formKey]);

  // When cross-filter context provides new options for this filter, update local state
  useEffect(() => {
    if (isCascading && crossFilterCtx.optionsMap[paramName]) {
      const cascadedOptions = crossFilterCtx.optionsMap[paramName];
      allOptionsRef.current = cascadedOptions;
      const initialSlice = formatSlice(cascadedOptions, 0, INITIAL_DISPLAY_COUNT);
      setInitialOptions(initialSlice);
      setCurrentOptions(initialSlice);
    }
  }, [isCascading, crossFilterCtx?.optionsMap?.[paramName]]);

  // When cascading resets downstream selections, clear local selection
  // Skip on initial mount to avoid clearing persisted values when context reinitializes
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (isCascading) {
      const cascadedSelection = crossFilterCtx.selectionsMap[paramName];
      if (cascadedSelection && cascadedSelection.length === 0 && currentSelectedOptions.length > 0) {
        setCurrentSelectedOptions([]);
        setIsAllSelected(false);
        // Also clear from chatbotContext and persistedFormValues
        const ctx = chatbotContextRef.current;
        dispatch(setChatbotContext({
          ...ctx,
          [bodyText?.paramName]: {
            ...ctx?.[bodyText?.paramName],
            [bodyText?.paramName]: [],
            updated: true,
          },
        }));
        dispatch(setPersistedFormValues({ [formKey]: [] }));
      }
    }
  }, [isCascading, crossFilterCtx?.selectionsMap?.[paramName]]);

  useEffect(() => {
    // Only use static options from bodyText if NOT in cascading mode
    if (!isCascading) {
      allOptionsRef.current = options;
      const initialSlice = formatSlice(options, 0, INITIAL_DISPLAY_COUNT);
      setInitialOptions(initialSlice);
      setCurrentOptions(initialSlice);
    }
  }, [isCascading])

  // Custom search handler: searches ALL options (not just the loaded chunk)
  // Supports comma-separated values for multi-search
  const handleSearch = useCallback((event) => {
    const rawInput = event?.target?.value || "";
    searchTermRef.current = rawInput;
    const trimmed = rawInput.trim();

    if (!trimmed) {
      // Reset to initial lazy-loaded chunk
      isSearchActiveRef.current = false;
      const resetSlice = formatSlice(allOptionsRef.current, 0, INITIAL_DISPLAY_COUNT);
      setCurrentOptions(resetSlice);
      setInitialOptions(resetSlice);
      setIsAllSelected(false);
      return;
    }

    isSearchActiveRef.current = true;

    // Parse comma-separated terms
    const terms = trimmed
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    // Search across ALL options, not just the loaded chunk
    const allRaw = allOptionsRef.current;
    const filtered = allRaw.filter((option) => {
      const labelLower = option.label?.toString().toLowerCase() || "";
      const valueLower = option.value?.toString().toLowerCase() || "";
      return terms.some(
        (term) => labelLower.includes(term) || valueLower.includes(term)
      );
    });

    // Format and cap the results to avoid UI freeze
    const formatted = filtered.slice(0, SEARCH_DISPLAY_LIMIT).map(formatOption);
    setCurrentOptions(formatted);
    setInitialOptions(formatted);
    setIsAllSelected(false);
  }, []);

  return (
    <div style={{ width: "100%", marginTop: "10px" }}>
      <Select
        currentOptions={currentOptions}
        setCurrentOptions={setCurrentOptions}
        label={heirarchyKeyValuePairs[paramName] || label}
        labelOrientation={labelOrientation}
        // inputPosition={inputPosition}
        // header={header}
        isRequired={isRequired}
        isDisabled={isDisabled || isFormDisabled}
        isClearable={!(isDisabled || isFormDisabled)}
        onClearAll={() => {
          setCurrentSelectedOptions([]);
          setIsAllSelected(false);
          const ctx1 = chatbotContextRef.current;
          dispatch(setChatbotContext({
            ...ctx1,
            [bodyText?.paramName]: {
              ...ctx1?.[bodyText?.paramName],
              [bodyText?.paramName]: [],
              updated: true,
            },
          }));
          dispatch(setPersistedFormValues({ [formKey]: [], [selectAllKey]: 0 }));
          // Notify cross-filter context to clear downstream filters
          if (isCascading) {
            crossFilterCtx.onFilterChange(paramName, []);
          }
        }}
        handleChange={(selected) => onChange(selected)}
        isCloseWhenClickOutside
        setIsOpen={(open) => {
          setIsOpen(open);
          // When dropdown closes after a search-filtered select-all on a subset,
          // reset the isAllSelected flag since only a subset was selected
          if (!open && isAllSelected && isSearchActiveRef.current) {
            setIsAllSelected(false);
          }
          if (isCascading) {
            if (open) {
              // Lazy fetch: trigger cross-filter API call when dropdown opens for the first time
              if ((!crossFilterCtx.optionsMap[paramName] || crossFilterCtx.optionsMap[paramName].length === 0) && !crossFilterCtx.loadingMap[paramName]) {
                crossFilterCtx.fetchOptions(paramName);
              }
            } else {
              // On dropdown close: if there's a selection, pre-fetch related filter options
              const currentSelection = crossFilterCtx.selectionsMap[paramName];
              if (currentSelection && currentSelection.length > 0) {
                // Only fetch downstream if no downstream filter already has selections
                // (avoids clearing user's existing lower-hierarchy choices)
                const hasDownstreamSelections = Object.keys(crossFilterCtx.selectionsMap).some((key) => {
                  if (key === paramName) return false;
                  const vals = crossFilterCtx.selectionsMap[key];
                  return vals && vals.length > 0;
                });
                if (!hasDownstreamSelections) {
                  crossFilterCtx.fetchDownstreamOptions(paramName);
                }
                crossFilterCtx.fetchUpstreamOptions(paramName);
              }
            }
          }
        }}
        isOpen={isOpen}
        selectedOptions={currentSelectedOptions}
        setSelectedOptions={setCurrentSelectedOptions}
        initialOptions={initialOptions}
        isMulti={isMulti}
        isSelectAll={isAllSelected}
        setIsSelectAll={setIsAllSelected}
        toggleSelectAll={true}
        isLoading={isCascading ? crossFilterCtx.loadingMap[paramName] : false}
        emptyMessage={isCascading && crossFilterCtx.loadingMap[paramName] ? "Loading values..." : "No options available"}
        isWithSearch={isMulti ? true : false}
        onSearch={handleSearch}
        onMenuScrollToBottom={() => {
          // Only allow scroll-to-load-more when NOT in search mode
          if (isSearchActiveRef.current) return;
          const allRaw = allOptionsRef.current;
          if (allRaw.length > 0 && currentOptions.length < allRaw.length) {
            const nextCount = Math.min(currentOptions.length + LOAD_MORE_COUNT, allRaw.length);
            const newBatch = formatSlice(allRaw, currentOptions.length, nextCount);
            const nextOptions = [...currentOptions, ...newBatch];
            setCurrentOptions(nextOptions);
            setInitialOptions(nextOptions);
            // When all are selected, mark newly loaded items as selected too
            // so they render with checkmarks in the dropdown
            if (isAllSelected) {
              setCurrentSelectedOptions(nextOptions);
            }
          }
        }}
        onSelectAll={(e) => {
          if (e && e.target.checked) {
            // When search is active, select only the filtered/visible options
            // When no search is active, select ALL options from the full dataset
            // but only render the currently visible chunk to avoid 100k+ DOM nodes
            let valuesToDispatch;
            if (isSearchActiveRef.current) {
              // Search-filtered select all: only select the visible filtered options
              valuesToDispatch = currentOptions.map((opt) => opt.value);
              setCurrentSelectedOptions([...currentOptions]);
              selectAllCountRef.current = currentOptions.length;
            } else {
              // Full select all: select all options but only render the visible chunk
              valuesToDispatch = allOptionsRef.current.map((opt) => opt.value);
              setCurrentSelectedOptions([...currentOptions]);
              selectAllCountRef.current = allOptionsRef.current.length;
            }
            setIsAllSelected(true);
            const ctx2 = chatbotContextRef.current;
            dispatch(setChatbotContext({
              ...ctx2,
              [bodyText?.paramName]: {
                ...ctx2?.[bodyText?.paramName],
                [bodyText?.paramName]: valuesToDispatch,
                updated: true,
              },
            }));
            // Persist only the currently visible options (not all 100k+) to avoid Redux memory bloat
            dispatch(setPersistedFormValues({
              [formKey]: [...currentOptions],
              [selectAllKey]: selectAllCountRef.current,
            }));
            // Notify cross-filter context if cascading is active
            if (isCascading) {
              crossFilterCtx.onFilterChange(paramName, valuesToDispatch);
            }
          } else {
            setCurrentSelectedOptions([]);
            setIsAllSelected(false);
            const ctx3 = chatbotContextRef.current;
            dispatch(setChatbotContext({
              ...ctx3,
              [bodyText?.paramName]: {
                ...ctx3?.[bodyText?.paramName],
                [bodyText?.paramName]: [],
                updated: true,
              },
            }));
            dispatch(setPersistedFormValues({ [formKey]: [], [selectAllKey]: 0 }));
            // Notify cross-filter context of deselection
            if (isCascading) {
              crossFilterCtx.onFilterChange(paramName, []);
            }
          }
        }}
        customPlaceholderAfterSelect={
          isAllSelected
            ? selectAllCountRef.current
            : currentSelectedOptions.length > 0
              ? currentSelectedOptions.length
              : null
        }
      />
    </div>
  );
};

export default SelectContent;
