import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Select } from "impact-ui-v3";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { GRADE_FILTER_FIELD } from "../constants";
import {
  buildAttributeFilterCrossFilterPayload,
  getAttributeFilterOptionsFromResponse,
  mapAttributeFilterChipOptions,
} from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const GradeFilterSelectField = ({
  attributeFilters = [],
  attributeTransferRestrictions = [],
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

  const attributeColumn = attributeFilters[0]?.column;
  const hasRestrictedGradeOptions = attributeTransferRestrictions.length > 0;
  const restrictedOptions = useMemo(
    () => mapAttributeFilterChipOptions(attributeTransferRestrictions),
    [attributeTransferRestrictions]
  );

  const fetchGradeFilterOptions = useCallback(async () => {
    if (!attributeColumn || fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setIsLoading(true);

    try {
      const payload = buildAttributeFilterCrossFilterPayload(attributeColumn);
      const response = await getCombinedCrossDimensionFiltersData(payload)();
      const values = response?.data?.data?.[attributeColumn] || [];
      const nextOptions = getAttributeFilterOptionsFromResponse(values);

      setOptions(nextOptions);
      setOriginalOptions(nextOptions);
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
  }, [attributeColumn, dispatch]);

  useEffect(() => {
    if (hasRestrictedGradeOptions) {
      setOptions(restrictedOptions);
      setOriginalOptions(restrictedOptions);
      return;
    }

    setOptions([]);
    setOriginalOptions([]);
    setIsSelectAll(false);
  }, [attributeColumn, hasRestrictedGradeOptions, restrictedOptions]);

  useEffect(() => {
    if (!selectedOptions.length || !options.length) {
      setIsSelectAll(false);
      return;
    }

    setIsSelectAll(selectedOptions.length === options.length);
  }, [selectedOptions, options]);

  const handleDropdownOpen = () => {
    // When GI "Restricts transfers within the selection" has values,
    // Grade options are limited to those selections (no cross-filter call).
    if (hasRestrictedGradeOptions) {
      setOptions(restrictedOptions);
      setOriginalOptions(restrictedOptions);
      return;
    }

    if (originalOptions.length === 0 && !isLoading) {
      fetchGradeFilterOptions();
    }
  };

  const handleChange = (nextOptions) => {
    onChange?.(nextOptions || []);
  };

  return (
    <div className={classes.poolSelectField} style={{ width, maxWidth: "100%" }}>
      <p className={classes.fieldLabel}>{GRADE_FILTER_FIELD.label}</p>
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
        currentOptions={options}
        initialOptions={originalOptions}
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

export default GradeFilterSelectField;
