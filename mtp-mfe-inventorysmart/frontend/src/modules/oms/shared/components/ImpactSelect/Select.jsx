
import React, { useState, useEffect, useCallback } from "react";
import { Select as ImpactSelect } from "impact-ui-v3";
import PropTypes from "prop-types";

function Select({
  options: optionsProp = [],
  value,
  selectedOptions: selectedOptionsProp,
  onChange,
  handleChange: handleChangeProp,
  setSelectedOptions: setSelectedOptionsProp,
  isMulti = false,
  isGrouped = false,
  placeholder = "Select...",
  isDisabled = false,
  label,
  isLoading = false,
  ...rest
}) {
  const [initialOptions, setInitialOptions] = useState(optionsProp);
  const [currentOptions, setCurrentOptions] = useState(optionsProp);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);

  // Derive the initial selected value from either the controlled prop or `value`
  const getInitialSelected = () => {
    if (selectedOptionsProp !== undefined) return selectedOptionsProp;
    if (isMulti) return Array.isArray(value) ? value : value ? [value] : [];
    return value || {};
  };
  const [selectedOptions, setSelectedOptions] = useState(getInitialSelected);

  // --------------------------------------------------------------------------
  // Sync when options prop changes (e.g. after API fetch returns mock data)
  // --------------------------------------------------------------------------
  useEffect(() => {
    setCurrentOptions(optionsProp);
    setInitialOptions(optionsProp);
  }, [optionsProp]);

  // Sync selectedOptions when the controlled value changes
  useEffect(() => {
    if (selectedOptionsProp !== undefined) {
      setSelectedOptions(selectedOptionsProp);
      return;
    }
    if (value !== undefined) {
      if (isMulti) {
        setSelectedOptions(Array.isArray(value) ? value : value ? [value] : []);
      } else {
        setSelectedOptions(value || {});
      }
    }
  }, [value, selectedOptionsProp, isMulti]);

  // --------------------------------------------------------------------------
  // Change handler — normalises to callers' convention then calls back
  // --------------------------------------------------------------------------
  const handleSelect = useCallback(
    (next) => {
      setSelectedOptions(next);
      const effectiveHandler = handleChangeProp || onChange;
      if (typeof effectiveHandler === "function") {
        // Always pass an array for isMulti callers, single object for single-select
        if (isMulti) {
          effectiveHandler(Array.isArray(next) ? next : next ? [next] : []);
        } else {
          effectiveHandler(Array.isArray(next) ? (next[0] ?? {}) : (next ?? {}));
        }
      }
      if (typeof setSelectedOptionsProp === "function") {
        setSelectedOptionsProp(next);
      }
    },
    [handleChangeProp, onChange, setSelectedOptionsProp, isMulti]
  );

  const handleClearAll = useCallback(() => {
    const empty = isMulti ? [] : {};
    setSelectedOptions(empty);
    setIsSelectAll(false);
    const effectiveHandler = handleChangeProp || onChange;
    if (typeof effectiveHandler === "function") effectiveHandler(empty);
    if (typeof setSelectedOptionsProp === "function") setSelectedOptionsProp(empty);
  }, [handleChangeProp, onChange, setSelectedOptionsProp, isMulti]);

  const handleSelectAll = useCallback(
    (event) => {
      const flatOptions = isGrouped && Array.isArray(currentOptions)
        ? currentOptions.flatMap((group) => (Array.isArray(group.options) ? group.options : []))
        : currentOptions;

      if (event?.target?.checked) {
        setIsSelectAll(true);
        const existing = Array.isArray(selectedOptions) ? selectedOptions : [];
        const additional = flatOptions.filter(
          (opt) => !existing.some((sel) => sel.value === opt.value)
        );
        const next = [...existing, ...additional];
        setSelectedOptions(next);
        const effectiveHandler = handleChangeProp || onChange;
        if (typeof effectiveHandler === "function") effectiveHandler(next);
        if (typeof setSelectedOptionsProp === "function") setSelectedOptionsProp(next);
      } else {
        handleClearAll();
      }
    },
    [currentOptions, selectedOptions, handleChangeProp, onChange, setSelectedOptionsProp, isGrouped, handleClearAll]
  );

  const handleSearch = useCallback(
    (event) => {
      const term = event.target.value.trim().toLowerCase();
      if (!term) {
        setCurrentOptions(initialOptions);
        return;
      }
      if (isGrouped && Array.isArray(initialOptions)) {
        const filtered = initialOptions
          .map((group) => ({
            ...group,
            options: (group.options || []).filter((opt) =>
              opt.label?.toString().toLowerCase().includes(term)
            ),
          }))
          .filter((group) => group.options.length > 0);
        setCurrentOptions(filtered);
      } else {
        setCurrentOptions(
          (initialOptions || []).filter((opt) =>
            opt.label?.toString().toLowerCase().includes(term)
          )
        );
      }
    },
    [initialOptions, isGrouped]
  );

  return (
    <ImpactSelect
      initialOptions={initialOptions}
      currentOptions={currentOptions}
      setCurrentOptions={setCurrentOptions}
      selectedOptions={selectedOptions}
      setSelectedOptions={setSelectedOptions}
      handleChange={handleSelect}
      onSelectAll={handleSelectAll}
      onClearAll={handleClearAll}
      onSearch={handleSearch}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      isSelectAll={isSelectAll}
      setIsSelectAll={setIsSelectAll}
      isMulti={isMulti}
      isGrouped={isGrouped}
      placeholder={placeholder}
      isDisabled={isDisabled}
      label={label}
      isLoading={isLoading}
      captureMenuScroll={false}
      {...rest}
    />
  );
}

Select.propTypes = {
  options: PropTypes.array,
  selectedOptions: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  handleChange: PropTypes.func,
  setSelectedOptions: PropTypes.func,
  onChange: PropTypes.func,
  isMulti: PropTypes.bool,
  isGrouped: PropTypes.bool,
  placeholder: PropTypes.string,
  isDisabled: PropTypes.bool,
  label: PropTypes.string,
  isLoading: PropTypes.bool,
};

export default Select;
