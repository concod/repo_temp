import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Select } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { fetchStoreTransferFilterValues } from "modules/inventorysmart/services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import {
  buildPoolStoreGroupCacheKey,
  buildPoolStoreGroupFilterPayload,
  extractStoreTransferFilterValues,
  mapStoreTransferFilterOptions,
} from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const PoolStoreGroupSelectField = ({
  generalInfoStoreGroup = [],
  selectedStoreGroup = [],
  onStoreGroupChange,
  width = "332px",
  isDisabled = false,
}) => {
  const dispatch = useDispatch();
  const classes = useCreateRuleFlowStyles();
  const [storeGroupOptions, setStoreGroupOptions] = useState([]);
  const [originalStoreGroupOptions, setOriginalStoreGroupOptions] = useState(
    []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const fetchInFlightRef = useRef(false);
  const optionsCacheKeyRef = useRef(null);
  const previousCacheKeyRef = useRef(undefined);

  const cacheKey = useMemo(
    () => buildPoolStoreGroupCacheKey(generalInfoStoreGroup),
    [generalInfoStoreGroup]
  );

  const fetchStoreGroupOptions = useCallback(async () => {
    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setIsLoading(true);

    try {
      const payload = buildPoolStoreGroupFilterPayload(generalInfoStoreGroup);
      const response = await dispatch(fetchStoreTransferFilterValues(payload));

      if (response?.data?.status) {
        const options = mapStoreTransferFilterOptions(
          extractStoreTransferFilterValues(response?.data)
        );
        setStoreGroupOptions(options);
        setOriginalStoreGroupOptions(options);
        optionsCacheKeyRef.current = cacheKey;
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
      setStoreGroupOptions([]);
      setOriginalStoreGroupOptions([]);
    } finally {
      fetchInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [cacheKey, dispatch, generalInfoStoreGroup]);

  useEffect(() => {
    // First mount: keep hydrated selections; only clear when context actually changes later.
    if (previousCacheKeyRef.current === undefined) {
      previousCacheKeyRef.current = cacheKey;
      return;
    }

    if (previousCacheKeyRef.current === cacheKey) {
      return;
    }

    previousCacheKeyRef.current = cacheKey;
    optionsCacheKeyRef.current = null;
    setStoreGroupOptions([]);
    setOriginalStoreGroupOptions([]);
    setIsSelectAll(false);
    onStoreGroupChange?.([]);
  }, [cacheKey, onStoreGroupChange]);

  useEffect(() => {
    if (!selectedStoreGroup.length || !storeGroupOptions.length) {
      setIsSelectAll(false);
      return;
    }

    setIsSelectAll(selectedStoreGroup.length === storeGroupOptions.length);
  }, [selectedStoreGroup, storeGroupOptions]);

  const handleDropdownOpen = () => {
    if (optionsCacheKeyRef.current !== cacheKey && !isLoading) {
      fetchStoreGroupOptions();
    }
  };

  const handleChange = (options) => {
    onStoreGroupChange?.(options || []);
  };

  const selectOptions = useMemo(() => {
    if (!selectedStoreGroup?.length) {
      return storeGroupOptions;
    }

    const optionValues = new Set(
      storeGroupOptions.map((option) => option.value)
    );
    const missingSelected = selectedStoreGroup.filter(
      (option) => !optionValues.has(option.value)
    );

    return missingSelected.length
      ? [...missingSelected, ...storeGroupOptions]
      : storeGroupOptions;
  }, [selectedStoreGroup, storeGroupOptions]);

  return (
    <div className={classes.poolSelectField} style={{ width, maxWidth: "100%" }}>
      <p className={classes.fieldLabel}>Store group</p>
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
        initialOptions={
          originalStoreGroupOptions.length
            ? originalStoreGroupOptions
            : selectOptions
        }
        selectedOptions={selectedStoreGroup}
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

export default PoolStoreGroupSelectField;
