import { useState, useEffect } from "react";
import { Input, Select, Slider } from "impact-ui-v3";
import RangePicker from "../../../../dateRangePicker/index.jsx";
import moment from "moment";

/**
 * Component to render filter value input based on display_type
 * This component handles different field types similar to form/index.jsx
 */
const FilterValueInput = ({
  filterConfig,
  value,
  onChange,
  options = [],
  isLoading = false,
  isMulti = false,
  selectedOptions = [],
  setSelectedOptions,
}) => {
  // Extract value - handle both string and object formats
  const getStringValue = () => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      // If it's an object, try to extract a string value
      if (value.label) return value.label;
      if (value.value !== undefined) return String(value.value);
    }
    return "";
  };

  // Extract numeric value for sliderRange
  const getNumericValue = () => {
    if (typeof value === "number") return value;
    if (value && typeof value === "object") {
      if (value.value !== undefined) return Number(value.value);
      if (typeof value === "object" && "value" in value) return Number(value.value);
    }
    return null;
  };

  const displayType = filterConfig?.display_type || "dropdown";
  const isSliderRange = displayType === "sliderRange";
  
  const [localValue, setLocalValue] = useState(
    isSliderRange ? getNumericValue() : getStringValue()
  );

  useEffect(() => {
    if (isSliderRange) {
      const numValue = getNumericValue();
      const defaultValue = filterConfig?.range_min || filterConfig?.extra?.min || 0;
      setLocalValue(numValue !== null ? numValue : defaultValue);
    } else {
      setLocalValue(getStringValue());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (newValue) => {
    if (isSliderRange) {
      // For slider, newValue might be an object with value property, or just a number
      const sliderVal = typeof newValue === "object" && newValue.value !== undefined 
        ? newValue.value 
        : (typeof newValue === "number" ? newValue : Number(newValue));
      setLocalValue(sliderVal);
      onChange(newValue); // Pass the full object for slider
    } else {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const extra = filterConfig?.extra || {};

  switch (displayType) {
    case "TextField":
      // Get props from extra object
      const inputType = extra.inputType || extra.type || "text";
      const placeholder = extra.placeholder || `Enter ${filterConfig?.label || "value"}`;
      const maxLength = extra.maxLength || extra.maxLengthLimit;
      const minLength = extra.minLength;
      const isRequired = extra.isRequired !== undefined ? extra.isRequired : (filterConfig?.is_mandatory || filterConfig?.is_required);
      const isDisabled = extra.isDisabled !== undefined ? extra.isDisabled : isLoading;
      
      return (
        <Input
          label={filterConfig?.label || extra.label || "Enter value"}
          type={inputType}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          isDisabled={isDisabled}
          placeholder={placeholder}
          isRequired={isRequired}
          inputProps={{
            maxLength: maxLength,
            minLength: minLength,
          }}
        />
      );

    case "dropdown":
      return (
        <Select
          currentOptions={options.length > 0 ? options : []}
          setCurrentOptions={() => {}}
          initialOptions={options.length > 0 ? options : []}
          placeholder={
            isLoading
              ? "Loading values..."
              : `Select ${filterConfig?.label || "values"}...`
          }
          handleChange={(selectedOption) => {
            if (isMulti) {
              const newSelections = Array.isArray(selectedOption)
                ? selectedOption
                : [selectedOption];
              const validSelections = newSelections.filter(
                (opt) => opt && opt.label
              );
              setSelectedOptions(validSelections);
              onChange(validSelections);
            } else {
              setSelectedOptions([selectedOption]);
              onChange(selectedOption);
            }
          }}
          isOpen={true}
          setIsOpen={() => {}}
          selectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          isCloseWhenClickOutside={false}
          isWithSearch={true}
          isMulti={isMulti}
          disabled={isLoading}
          isLoading={isLoading}
          emptyMessage={
            isLoading ? "Loading values..." : "No options available"
          }
          dropdownPosition="bottom"
        />
      );

    case "sliderRange":
      // Get props from extra object
      const sliderMin = extra.min || filterConfig?.range_min || 0;
      const sliderMax = extra.max || filterConfig?.range_max || 100;
      const sliderStep = extra.step || extra.step_value || 1;
      
      // Ensure sliderValue is a number
      let sliderValue = sliderMin;
      if (typeof localValue === "number") {
        sliderValue = localValue;
      } else if (localValue !== null && localValue !== undefined) {
        if (typeof localValue === "object" && localValue.value !== undefined) {
          sliderValue = Number(localValue.value);
        } else {
          sliderValue = Number(localValue);
        }
      }
      
      // Clamp value between min and max
      sliderValue = Math.max(sliderMin, Math.min(sliderMax, sliderValue));
      
      return (
        <Slider
          header={filterConfig?.label || extra.label || "Select range"}
          label={filterConfig?.label || extra.label || "Range"}
          max={sliderMax}
          min={sliderMin}
          disabled={extra.isDisabled !== undefined ? extra.isDisabled : isLoading}
          required={extra.isRequired !== undefined ? extra.isRequired : (filterConfig?.is_mandatory || filterConfig?.is_required)}
          onChange={(e) => {
            const newValue = Number(e.target.value);
            // Update local state immediately for responsive UI
            setLocalValue(newValue);
            // Call onChange with the object format
            handleChange({
              value: newValue,
              range_min: sliderMin,
              range_max: sliderMax,
            });
          }}
          value={sliderValue}
          variant={extra.variant || "range"}
          inputProps={{
            step: sliderStep,
          }}
        />
      );

    case "rangePicker":
      // Get props from extra object
      const dateFormat = extra.dateFormat || "MM-DD-YYYY";
      const disableType = extra.disableType || extra.disablePast ? "disablePast" : null;
      const startYear = extra.startYear;
      
      return (
        <RangePicker
          label={filterConfig?.label || extra.label || "Select date range"}
          startDateId={extra.startDateId || "start_date_id"}
          endDateId={extra.endDateId || "end_date_id"}
          showMonthYearSelect={extra.showMonthYearSelect !== false}
          startDate={
            localValue?.[0]
              ? moment.isMoment(localValue[0])
                ? localValue[0]
                : moment(localValue[0]).isValid()
                ? moment(localValue[0])
                : null
              : null
          }
          endDate={
            localValue?.[1]
              ? moment.isMoment(localValue[1])
                ? localValue[1]
                : moment(localValue[1]).isValid()
                ? moment(localValue[1])
                : null
              : null
          }
          disabled={extra.isDisabled !== undefined ? extra.isDisabled : isLoading}
          isRequired={extra.isRequired !== undefined ? extra.isRequired : (filterConfig?.is_mandatory || filterConfig?.is_required)}
          disableType={disableType}
          startYear={startYear}
          onDatesChange={(start, end) => {
            handleChange([start, end]);
          }}
          dateFormat={dateFormat}
          noPortal={extra.noPortal !== undefined ? extra.noPortal : false}
        />
      );

    case "DateTimeField":
      // Get props from extra object
      const dateInputType = extra.inputType || extra.type || "date";
      const datePlaceholder = extra.placeholder || `Select ${filterConfig?.label || "date"}`;
      const dateFormatStr = extra.dateFormat;
      
      return (
        <Input
          label={filterConfig?.label || extra.label || "Select date"}
          type={dateInputType}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          isDisabled={extra.isDisabled !== undefined ? extra.isDisabled : isLoading}
          placeholder={datePlaceholder}
          isRequired={extra.isRequired !== undefined ? extra.isRequired : (filterConfig?.is_mandatory || filterConfig?.is_required)}
        />
      );

    case "BooleanField":
      return (
        <div style={{ padding: "10px" }}>
          <label>
            <input
              type="checkbox"
              checked={typeof localValue === "boolean" ? localValue : (localValue === "true" || localValue === true)}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={extra.isDisabled !== undefined ? extra.isDisabled : isLoading}
            />
            {filterConfig?.label || extra.label || "Enable"}
          </label>
        </div>
      );

    default:
      // Default to dropdown for unknown types
      return (
        <Select
          currentOptions={options.length > 0 ? options : []}
          setCurrentOptions={() => {}}
          initialOptions={options.length > 0 ? options : []}
          placeholder={
            isLoading
              ? "Loading values..."
              : `Select ${filterConfig?.label || "values"}...`
          }
          handleChange={(selectedOption) => {
            if (isMulti) {
              const newSelections = Array.isArray(selectedOption)
                ? selectedOption
                : [selectedOption];
              const validSelections = newSelections.filter(
                (opt) => opt && opt.label
              );
              setSelectedOptions(validSelections);
              onChange(validSelections);
            } else {
              setSelectedOptions([selectedOption]);
              onChange(selectedOption);
            }
          }}
          isOpen={true}
          setIsOpen={() => {}}
          selectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          isCloseWhenClickOutside={false}
          isWithSearch={true}
          isMulti={isMulti}
          disabled={isLoading}
          isLoading={isLoading}
          emptyMessage={
            isLoading ? "Loading values..." : "No options available"
          }
          dropdownPosition="bottom"
        />
      );
  }
};

export default FilterValueInput;

