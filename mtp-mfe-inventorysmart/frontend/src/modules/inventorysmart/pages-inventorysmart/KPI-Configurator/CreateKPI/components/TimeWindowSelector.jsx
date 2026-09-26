import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import { ButtonGroup, Select, Input, Checkbox, Switch } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import "../../KPIConfigurator.css";
import DatePickerWrapper from "core/commonComponents/filters/DatePicker/DatePicker";
import DateRangePicker from "core/commonComponents/dateRangePicker";
import moment from "moment";
import { timeWindowSelections } from "../../utils/constants";
import { normalizeDateValue, reconstructFiscalDateRange, getMaxCapForRollingPeriod, getFilteredUnitOptions, validateAndCapNumericInput } from "../../utils/helperFunctions";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";

const TimeWindowSelector = forwardRef(({
  selectedDataSource,
  onChange,
  initialValues = {},
  forecastDayLevel,
  fiscalCalendarData
}, ref) => {

  // Minimum date: January 1, 2025
  const minDate = new Date("2025-01-01");

  // Fiscal calendar state
  const [fiscalDateRange, setFiscalDateRange] = React.useState(undefined);

  // timeWindowSelections is now an array with embedded options
  // Filter options based on forecastDayLevel for Forecast data source and inventory restrictions
  const rollingPeriodOptions = React.useMemo(() => {
    const sourceValue = selectedDataSource?.value?.toLowerCase();
    
    // For Inventory: Only show Latest Available Date Anchors
    if (sourceValue === 'inventory') {
      return timeWindowSelections.filter(selection => selection.value === 'latest_available');
    }
    
    // For Forecast: Exclude Days, Quarters, and Years from rolling periods
    if (sourceValue === "forecast") {
      const result = timeWindowSelections.map(selection => {
        if (selection.value === "rolling") {
          // Exclude "Days", "Quarters", and "Years" options for rolling periods
          const filtered = {
            ...selection,
            options: selection.options.filter(opt => 
              opt.value !== "Days" && 
              opt.value !== "Quarters" && 
              opt.value !== "Years"
            )
          };
          return filtered;
        } else if (selection.value === "to_date" && !forecastDayLevel) {
          // Exclude "Week-to-Date" option for to-date periods when forecastDayLevel is false
          const filtered = {
            ...selection,
            options: selection.options.filter(opt => opt.value !== "week")
          };
          return filtered;
        }
        // Return other selections with copied options array
        return { ...selection, options: [...selection.options] };
      });
      return result;
    }
    return timeWindowSelections;
  }, [forecastDayLevel, selectedDataSource]);

  const globalClasses = globalStyles();

  // Internal state management
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(initialValues.selectedTimeWindow || "Dynamic");

  // Static time window state
  const [startDate, setStartDate] = useState(normalizeDateValue(initialValues.startDate));
  const [endDate, setEndDate] = useState(normalizeDateValue(initialValues.endDate));
  const [useLatestAvailableDate, setUseLatestAvailableDate] = useState(initialValues.useLatestAvailableDate || false);

  // Rolling periods state
  const [rollingPeriods, setRollingPeriods] = useState(initialValues.rollingPeriods || "rolling");
  const [numericInput, setNumericInput] = useState(initialValues.numericInput || "");
  const [selectedUnit, setSelectedUnit] = useState(initialValues.selectedUnit || "");
  const [unit, setUnit] = useState(initialValues.unit || "");
  const [unitLabel, setUnitLabel] = useState(initialValues.unitLabel || "");

  // State for Select components
  const [unitSelectOpen, setUnitSelectOpen] = useState(false);
  const [rollingPeriodSelectOpen, setRollingPeriodSelectOpen] = useState(false);

  const [enableNextToggle, setEnableNextToggle] = useState(false);

  const isLoadingRef = useRef(false);

  // Reset numeric input and unit when data source changes
  useEffect(() => {
    if (isLoadingRef.current) {
      isLoadingRef.current = false;
      return;
    }
    setNumericInput("");
    setSelectedUnit("");
    setEnableNextToggle(false);
    
    // For Inventory: Force Dynamic mode and select Latest Available Date Anchors
    if (selectedDataSource?.value?.toLowerCase() === 'inventory') {
      setSelectedTimeWindow("Dynamic");
      setRollingPeriods("latest_available");
    }
  }, [selectedDataSource?.value]);

  // Rule 3: When enableNextToggle changes, re-validate numeric input
  useEffect(() => {
    if (selectedUnit && numericInput) {
      const cappedValue = validateAndCapNumericInput(numericInput, selectedUnit, selectedDataSource, enableNextToggle);
      if (cappedValue !== numericInput) {
        setNumericInput(cappedValue);
      }
    }
  }, [enableNextToggle]);

  // Rule 3: When selectedUnit changes, validate and cap numeric input
  useEffect(() => {
    if (selectedUnit && numericInput) {
      const cappedValue = validateAndCapNumericInput(numericInput, selectedUnit, selectedDataSource, enableNextToggle);
      if (cappedValue !== numericInput) {
        setNumericInput(cappedValue);
      }
    }
  }, [selectedUnit]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getValues: () => {
      // Extract actual dates from fiscal calendar if fiscal calendar is being used
      let extractedStartDate = startDate;
      let extractedEndDate = endDate;
      
      // Only extract from fiscal calendar if it's active and has data
      if (!forecastDayLevel && fiscalDateRange?.fiscalInfoStartDate && fiscalDateRange?.fiscalInfoEndDate) {
        // For start date: use calendar_week_start_date (beginning of fiscal week)
        extractedStartDate = fiscalDateRange.fiscalInfoStartDate.calendar_week_start_date
          ? moment(fiscalDateRange.fiscalInfoStartDate.calendar_week_start_date)
          : null;
        
        // For end date: use fiscal_week_end_date (end of fiscal week)
        extractedEndDate = fiscalDateRange.fiscalInfoEndDate.fiscal_week_end_date
          ? moment(fiscalDateRange.fiscalInfoEndDate.fiscal_week_end_date)
          : null;
      }
      
      return {
        selectedTimeWindow,
        startDate: extractedStartDate,
        endDate: extractedEndDate,
        useLatestAvailableDate,
        rollingPeriods,
        numericInput,
        selectedUnit,
        unit,
        unitLabel,
        enableNextToggle
      };
    },
    reset: () => {
      setSelectedTimeWindow("Dynamic");
      setStartDate(null);
      setEndDate(null);
      setFiscalDateRange(undefined);
      setUseLatestAvailableDate(false);
      setRollingPeriods("rolling");
      setNumericInput("");
      setSelectedUnit("");
      setUnit("");
      setUnitLabel("");
      setEnableNextToggle(false);
    },
    loadValues: (values) => {
      isLoadingRef.current = true;
      setSelectedTimeWindow(values.selectedTimeWindow || "Dynamic");
      const normalizedStartDate = normalizeDateValue(values.startDate);
      const normalizedEndDate = normalizeDateValue(values.endDate);
      
      setStartDate(normalizedStartDate);
      setEndDate(normalizedEndDate);
      setUseLatestAvailableDate(values.useLatestAvailableDate || false);
      setRollingPeriods(values.rollingPeriods || "rolling");
      setNumericInput(values.numericInput || "");
      setSelectedUnit(values.selectedUnit || "");
      setUnit(values.unit || "");
      setUnitLabel(values.unitLabel || "");
      setEnableNextToggle(values.enableNextToggle || false);
      
      // Reconstruct fiscalDateRange if fiscal calendar is active and dates exist
      if (!forecastDayLevel && fiscalCalendarData?.data?.length > 0 && normalizedStartDate && normalizedEndDate && values.selectedTimeWindow === "Static") {
        const fiscalDateRange = reconstructFiscalDateRange(
          normalizedStartDate,
          normalizedEndDate,
          fiscalCalendarData.data
        );
        
        if (fiscalDateRange) {
          setFiscalDateRange(fiscalDateRange);
        }
      }
    },
    isValid: () => {
      if (selectedTimeWindow === "Dynamic") {
        // Rolling Periods: check numericInput and selectedUnit
        if (rollingPeriods === "rolling") {
          return numericInput && numericInput.trim() !== "" && selectedUnit && selectedUnit !== "";
        }
        // All other rolling types: check unit
        return unit && unit !== "";
      }
      if (selectedTimeWindow === "Static") {
        // Check if fiscal calendar is being used
        const isFiscalCalendarActive = !forecastDayLevel && fiscalCalendarData?.data?.length > 0 && !useLatestAvailableDate;
        
        if (isFiscalCalendarActive) {
          // For fiscal calendar, check if fiscalDateRange has valid data
          return !!(fiscalDateRange?.fiscalInfoStartDate && fiscalDateRange?.fiscalInfoEndDate);
        } else {
          // For regular date pickers
          const hasStartDate = !!startDate;
          if (!hasStartDate) return false;
          if (useLatestAvailableDate) return true;
          return !!endDate;
        }
      }
      return false;
    }
  }));

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange({
        selectedTimeWindow,
        startDate,
        endDate,
        useLatestAvailableDate,
        rollingPeriods,
        numericInput,
        selectedUnit,
        unit,
        unitLabel,
        enableNextToggle,
        fiscalDateRange
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTimeWindow,
    startDate,
    endDate,
    useLatestAvailableDate,
    rollingPeriods,
    numericInput,
    selectedUnit,
    unit,
    unitLabel,
    enableNextToggle,
    fiscalDateRange
  ]);

  useEffect(() => {
    if (selectedTimeWindow === "Static" && useLatestAvailableDate) {
      setEndDate(null);
    }
  }, [selectedTimeWindow, useLatestAvailableDate]);

  const timeWindowOptions = ["Dynamic", "Static"];


  // Helper function to get dynamic options and values based on rolling period type
  const getRollingPeriodConfig = () => {
    const handleChange = (selectedOption) => {
      setUnit(selectedOption.value);
      setUnitLabel(selectedOption.label);
    };

    // Find the selected rolling period configuration from rollingPeriodOptions (filtered) array
    const selectedConfig = rollingPeriodOptions.find(item => item.value === rollingPeriods);

    if (!selectedConfig || !selectedConfig.options) {
      return null;
    }

    return {
      options: selectedConfig.options,
      placeholder: `Select ${selectedConfig.label}`,
      value: unit,
      handleChange
    };
  };

  return (
    <div className={`${globalClasses.cardBg} ${globalClasses.evenPaddingAround} common-border`}>
      <div className={`${globalClasses.verticalLabel}`}>
        Select time window
      </div>
      <div className={globalClasses.marginBottom}>
        <ButtonGroup
          options={timeWindowOptions.map(option => ({
            label: option,
            value: option,
            disabled: option === "Static" && selectedDataSource?.value?.toLowerCase() === 'inventory'
          }))}
          selectedOption={selectedTimeWindow}
          onChange={(event, value) => setSelectedTimeWindow(value)}
          variant="outlined"
          size="small"
        />
      </div>

      {/* Static Time Window Date Selection - Disabled for Inventory */}
      {selectedTimeWindow === "Static" && selectedDataSource?.value?.toLowerCase() !== 'inventory' && (
        <div className={`${globalClasses.marginBottom} static-time-window`}>
          {/* Use Latest Available Date Toggle */}
          <div className={globalClasses.marginVertical}>

            <Checkbox
              label="Use Latest Available Date"
              checked={useLatestAvailableDate}
              onChange={(event) => {
                setUseLatestAvailableDate(event.target.checked);
              }}
            />

          </div>

          <div>
            {/* Show Fiscal Calendar when forecastDayLevel is not true and fiscal data exists */}
            {!forecastDayLevel && !useLatestAvailableDate && fiscalCalendarData?.data?.length > 0 ? (
              <NormalCalendarFiscalMapping
                label="Date Range"
                selectedDate={fiscalDateRange}
                onDateChange={(dateRange) => {
                  // Store the entire dateRange object as-is, just like HighLevelSummaryTable does
                  setFiscalDateRange(dateRange);
                }}
                fiscalCalendarData={fiscalCalendarData?.data || []}
                showClearDates={true}
                isMandatory={false}
                showDefaultLabel={false}
                disableFutureWeeks={false}
                disablePastWeeks={false}
                labelOrientation="top"
                displayRow={true}
                setValueOnBlur={false}
                resetOptions={true}
              />
            ) : (
              // Show regular date pickers when forecastDayLevel is true or no fiscal calendar data
              useLatestAvailableDate ? (
                <DatePickerWrapper
                  label="Start Date"
                  placeholder="Select start date"
                  selectedDate={startDate}
                  onPrimaryButtonClick={(date) => {
                    setStartDate(date);
                    setEndDate(null);
                  }}
                  clearable={true}
                  isRequired={false}
                  isOutsideRange={(date) => null}
                  minDate={minDate}
                />
              ) : (
                <DateRangePicker
                  label="Date Range"
                  placeholder="Select date range"
                  startDate={startDate}
                  endDate={endDate}
                  onDatesChange={(newStartDate, newEndDate) => {
                    setStartDate(newStartDate);
                    setEndDate(newEndDate);
                  }}
                  extra={{ autoApplyDateRange: true }}
                  disableType="customRange"
                  customOutsideRange={(day) => day.isBefore(moment(minDate), 'day')}
                />
              )
            )}
          </div>
        </div>
      )}

      {/* Rolling Periods */}
      {selectedTimeWindow === "Dynamic" && (
        <div>
          {/* Radio Button Options with inline inputs */}
          {rollingPeriodOptions.map((option) => (
            <div
              key={option.value}
              className={`rolling-period-option ${rollingPeriods === option.value ? 'selected' : 'unselected'}`}
            >
              {/* Radio Button */}
              <div
                className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.gapHalf} ${globalClasses.cursorPointer} rolling-period-radio-container ${rollingPeriods === option.value ? 'selected' : ''}`}
                onClick={() => setRollingPeriods(option.value)}
              >
                <input
                  type="radio"
                  id={`rolling-period-${option.value}`}
                  name="rolling-periods-radio-group"
                  checked={rollingPeriods === option.value}
                  onChange={() => setRollingPeriods(option.value)}
                  className="rolling-period-radio"
                />
                <label
                  htmlFor={`rolling-period-${option.value}`}
                  className="rolling-period-label"
                >
                  {option.label}
                </label>
              </div>

              {/* Conditional inputs directly below each radio button */}
              {rollingPeriods === option.value && (
                <div>
                  {/* Rolling Periods inputs */}
                  {option.value === "rolling" && (() => {
                    const unitOptions = option.options || [];
                    // Rule 1: Filter units based on numeric input
                    const filteredUnitOptions = getFilteredUnitOptions(unitOptions, numericInput, selectedDataSource, enableNextToggle);
                    
                    return (
                      <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf} ${globalClasses.verticalAlignCenter}`}>
                        {selectedDataSource?.value === "forecast" &&
                          <Switch
                            leftLabel="Last"
                            onChange={(e) => {
                              setEnableNextToggle(e.target.checked);
                            }}
                            value={enableNextToggle}
                            rightLabel="Next"
                          />}
                        {selectedDataSource?.value !== "forecast" && <div className="formula-canvas-error-text">Last</div>}
                        <Input
                          placeholder="0"
                          value={numericInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Rule 2: If unit is selected, cap the input
                            if (selectedUnit) {
                              const cappedValue = validateAndCapNumericInput(value, selectedUnit, selectedDataSource, enableNextToggle);
                              setNumericInput(cappedValue);
                            } else {
                              setNumericInput(value);
                            }
                          }}
                          className="rolling-period-input"
                          type="number"
                        />
                        <div className="divider-line"></div>
                        <Select
                          label="Select unit"
                          placeholder="Select"
                          isClearable={false}
                          isMulti={false}
                          isOpen={unitSelectOpen}
                          setIsOpen={setUnitSelectOpen}
                          currentOptions={filteredUnitOptions}
                          selectedOptions={filteredUnitOptions.find(opt => opt.value === selectedUnit)}
                          initialOptions={filteredUnitOptions}
                          handleChange={(option) => {
                            setSelectedUnit(option.value);
                            // Rule 2: When unit is selected, validate and cap existing numeric input
                            if (numericInput) {
                              const cappedValue = validateAndCapNumericInput(numericInput, option.value, selectedDataSource, enableNextToggle);
                              if (cappedValue !== numericInput) {
                                setNumericInput(cappedValue);
                              }
                            }
                          }}
                          setSelectedOptions={() => { }}
                          setCurrentOptions={() => { }}
                          // className="rolling-period-unit-select"
                          minWidth="184px"
                          labelOrientation="left"
                        />
                      </div>
                    );
                  })()}
                  {/* Common Select for all non-Rolling Periods options */}
                  {option.value !== "rolling" && (() => {
                    const config = getRollingPeriodConfig();
                    return config ? (
                      <Select
                        placeholder={config.placeholder}
                        isClearable={false}
                        isMulti={false}
                        isOpen={rollingPeriodSelectOpen}
                        setIsOpen={setRollingPeriodSelectOpen}
                        isSearchable={false}
                        isCloseWhenClickOutside={true}
                        currentOptions={config.options}
                        selectedOptions={config.options.find(opt => opt.value === config.value)}
                        initialOptions={config.options}
                        handleChange={config.handleChange}
                        setSelectedOptions={() => { }}
                        setCurrentOptions={() => { }}
                        className="rolling-period-select"
                        withPortal={true}
                      />
                    ) : null;
                  })()}

                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default TimeWindowSelector;
