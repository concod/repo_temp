import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Select } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { fetchStoreTransferFilterValues } from "modules/inventorysmart/services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import {
  buildPoolFilterByAttributeContextKey,
  buildPoolFilterByAttributePayload,
  extractStoreTransferFilterValues,
  mapStoreTransferFilterOptions,
} from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const PoolFilterByAttributeSelectField = ({
  label,
  column,
  generalInfoTab,
  poolStoreGroup = [],
  generalInfoStoreGroup = [],
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  useGeneralInfoSgCodesOnly = false,
  selectedOptions = [],
  onChange,
  width = "332px",
  isDisabled = false,
}) => {
  const dispatch = useDispatch();
  const classes = useCreateRuleFlowStyles();
  const [options, setOptions] = useState([]);
  const [originalOptions, setOriginalOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const fetchInFlightRef = useRef(false);
  const optionsCacheKeyRef = useRef(null);

  const contextKey = useMemo(
    () =>
      buildPoolFilterByAttributeContextKey({
        generalInfoTab,
        poolStoreGroup,
        generalInfoStoreGroup,
        poolHierarchyFilters,
        poolHierarchySelections,
        generalInfoHierarchyFilters,
        generalInfoHierarchySelections,
        useGeneralInfoSgCodesOnly,
      }),
    [
      generalInfoStoreGroup,
      generalInfoTab,
      poolHierarchyFilters,
      poolHierarchySelections,
      generalInfoHierarchyFilters,
      generalInfoHierarchySelections,
      poolStoreGroup,
      useGeneralInfoSgCodesOnly,
    ]
  );

  const fetchFilterOptions = useCallback(async () => {
    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setIsLoading(true);

    try {
      const payload = buildPoolFilterByAttributePayload({
        generalInfoTab,
        column,
        poolStoreGroup,
        generalInfoStoreGroup,
        poolHierarchyFilters,
        poolHierarchySelections,
        generalInfoHierarchyFilters,
        generalInfoHierarchySelections,
        useGeneralInfoSgCodesOnly,
      });
      const response = await dispatch(fetchStoreTransferFilterValues(payload));

      if (response?.data?.status) {
        const nextOptions = mapStoreTransferFilterOptions(
          extractStoreTransferFilterValues(response?.data)
        );
        setOptions(nextOptions);
        setOriginalOptions(nextOptions);
        optionsCacheKeyRef.current = contextKey;
        return;
      }

      dispatch(
        addSnack({
          message: response?.data?.message || ERROR_MESSAGE,
          options: { variant: "error" },
        })
      );
    } catch (error) {
      const errObj = error?.response?.data;
      dispatch(
        addSnack({
          message: errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          options: { variant: "error" },
        })
      );
      setOptions([]);
      setOriginalOptions([]);
    } finally {
      fetchInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [
    column,
    contextKey,
    dispatch,
    generalInfoStoreGroup,
    generalInfoTab,
    poolHierarchyFilters,
    poolHierarchySelections,
    generalInfoHierarchyFilters,
    generalInfoHierarchySelections,
    poolStoreGroup,
    useGeneralInfoSgCodesOnly,
  ]);

  useEffect(() => {
    if (optionsCacheKeyRef.current !== contextKey) {
      optionsCacheKeyRef.current = null;
      setOptions([]);
      setOriginalOptions([]);
      setIsSelectAll(false);
    }
  }, [contextKey]);

  useEffect(() => {
    if (!selectedOptions.length || !options.length) {
      setIsSelectAll(false);
      return;
    }

    setIsSelectAll(selectedOptions.length === options.length);
  }, [selectedOptions, options]);

  const handleDropdownOpen = () => {
    if (optionsCacheKeyRef.current !== contextKey && !isLoading) {
      fetchFilterOptions();
    }
  };

  const handleChange = (nextOptions) => {
    onChange?.(nextOptions || []);
  };

  const selectOptions = useMemo(() => {
    if (!selectedOptions?.length) {
      return options;
    }

    const optionValues = new Set(options.map((option) => option.value));
    const missingSelected = selectedOptions.filter(
      (option) => !optionValues.has(option.value)
    );

    return missingSelected.length ? [...missingSelected, ...options] : options;
  }, [options, selectedOptions]);

  return (
    <div className={classes.poolSelectField} style={{ width, maxWidth: "100%" }}>
      <p className={classes.fieldLabel}>{label}</p>
      <Select
        placeholder="Select"
        isMulti
        isClearable
        isWithSearch
        withPortal
        toggleSelectAll
        isDisabled={isDisabled}
        isOpen={isDisabled ? false : isOpen}
        setIsOpen={setIsOpen}
        onDropdownOpen={handleDropdownOpen}
        isLoading={isLoading}
        currentOptions={selectOptions}
        initialOptions={originalOptions.length ? originalOptions : selectOptions}
        selectedOptions={selectedOptions}
        setSelectedOptions={handleChange}
        handleChange={handleChange}
        isSelectAll={isSelectAll}
        setIsSelectAll={setIsSelectAll}
        minWidth={width}
        width="100%"
      />
    </div>
  );
};

export default PoolFilterByAttributeSelectField;
