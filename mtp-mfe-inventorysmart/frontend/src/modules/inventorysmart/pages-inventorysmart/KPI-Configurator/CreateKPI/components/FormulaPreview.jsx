import React, { useState, useEffect } from "react";
import { Chip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Select, Button, Tooltip } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { formatOptions } from "../../utils/constants";
import SampleCalculation from "./SampleCalculation/SampleCalculation";
import { formatDate } from "core/commonComponents/filters/filterChips";

const FormulaPreview = ({
  formulaComponents = [],
  kpiName,
  kpiDescription,
  formatType,
  setFormatType,
  decimalPlaces,
  setDecimalPlaces,
  aggregateFunction,
  setAggregateFunction,
  formulaValidation,
  isEditMode,
}) => {
  const { formatTypeOptions, aggregateFunctionOptions } = formatOptions

  const globalClasses = globalStyles();

  // State for Select components
  const [formatTypeOpen, setFormatTypeOpen] = useState(false);
  const [decimalPlacesOpen, setDecimalPlacesOpen] = useState(false);
  const [aggregateFunctionOpen, setAggregateFunctionOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // Generate decimal place options using for loop
  const generateDecimalPlaceOptions = () => {
    const options = [];
    for (let i = 0; i <= 4; i++) {
      options.push({ label: i.toString(), value: i.toString() });
    }
    return options;
  };

  useEffect(() => {
    // Only set default values in create mode, not in edit mode
    if(!isEditMode && formatTypeOptions?.length) {
      setFormatType(formatTypeOptions?.[0]?.value);
      setDecimalPlaces(generateDecimalPlaceOptions()?.[0]?.value);
      setAggregateFunction(aggregateFunctionOptions?.[0]?.value);
    }
  }, [formatTypeOptions, isEditMode]);

  // Select configurations
  const selectConfigs = [
    {
      label: "Format type",
      value: formatType,
      setValue: setFormatType,
      options: formatTypeOptions,
      isOpen: formatTypeOpen,
      setIsOpen: setFormatTypeOpen
    },
    {
      label: "Decimal places",
      value: decimalPlaces,
      setValue: setDecimalPlaces,
      options: generateDecimalPlaceOptions(),
      isOpen: decimalPlacesOpen,
      setIsOpen: setDecimalPlacesOpen
    },
    {
      label: "Aggregate function",
      value: aggregateFunction,
      setValue: setAggregateFunction,
      options: aggregateFunctionOptions,
      isOpen: aggregateFunctionOpen,
      setIsOpen: setAggregateFunctionOpen
    }
  ];

  // Generate time window text for formula
  const generateTimeWindowText = (component) => {
    if (component.timeWindow === "Dynamic") {
      const rollingType = component.rollingPeriods;

      // Rolling Periods: use "Last/Next N Units" format (e.g. "Last 3 Weeks", "Next 2 Days")
      if (rollingType === "rolling") {
        if (
          component.numericInput &&
          component.selectedUnit &&
          component.numericInput.toString().trim() &&
          component.selectedUnit.toString().trim()
        ) {
          const direction = component.enableNextToggle ? "Next" : "Last";
          return `${direction} ${component.numericInput} ${component.selectedUnit}`;
        }
        return "";
      }

      // For all other rolling types (To-Date, Latest Anchor, Relative), use the unitLabel for display
      return component.unitLabel || "";
    }

    // Static time window - show actual dates
    if (component.timeWindow === "Static") {
      const startDateStr = component.startDate ? formatDate(component.startDate) : "";
      
      if (component.useLatestAvailableDate) {
        // Case 2: Start date with "Latest Available"
        return startDateStr ? `${startDateStr} - Latest Available` : "Latest Available";
      } else {
        // Case 1: Both start and end dates (hyphen separated)
        const endDateStr = component.endDate ? formatDate(component.endDate) : "";
        if (startDateStr && endDateStr) {
          return `${startDateStr} - ${endDateStr}`;
        } else if (startDateStr) {
          return startDateStr;
        }
      }
    }

    return component.timeWindow || "";
  };

  // Generate formula preview text
  const generateFormulaPreview = () => {
    const formulaText = formulaComponents.map(comp => {
      switch (comp.type) {
        case 'component':
          const timeWindowText = generateTimeWindowText(comp);

          // Format location filter to show actual selected locations
          let locationText = comp.locationFilter || 'Location';
          if (comp.selectedLocations && comp.selectedLocations.length > 0) {
            locationText = comp.selectedLocations.join(', ');
          } else if (comp.locationFilter && comp.locationFilter !== 'All') {
            locationText = comp.locationFilter;
          }

          // Build formula parts
          const parts = [`${comp.function.label}([${comp.field.label}]`];

          // Add time window only if it exists
          if (timeWindowText) {
            parts.push(timeWindowText);
          }

          // Add location
          parts.push(locationText);

          return parts.join(', ') + ')';
        case 'operator':
          return ` ${comp.value} `;
        case 'parenthesis':
          return comp.value;
        case 'constant':
          return comp.value;
        default:
          return '';
      }
    }).join('');

    // Append * 100 when format type is Percentage
    if (formatType === 'Percentage' && formulaText) {
      return `(${formulaText}) * 100`;
    }

    return formulaText;
  };


  return (
    <div>
      {/* Format and Display Options & Aggregate Function - Single Container */}
      <div className={`${globalClasses.marginTop} ${globalClasses.evenPaddingAround} common-border format-display-options-container`}>
        <div className={`${globalClasses.flexRow} ${globalClasses.gap} format-display-options-wrapper`}>
          {/* Format and Display Options - Left Section */}
          <div className="format-display-options-section">
            <div className={`${globalClasses.marginBottom}`}>
              <div className="formula-preview-format-title" style={{ color: '#000000' }}>
                Format and display options
              </div>
            </div>

            <div className={`${globalClasses.flexRow} ${globalClasses.gap} format-display-fields`}>
              <Select
                label="Format type "
                placeholder="Select"
                isClearable={false}
                isMulti={false}
                isOpen={formatTypeOpen}
                setIsOpen={setFormatTypeOpen}
                currentOptions={formatTypeOptions}
                selectedOptions={formatTypeOptions.find(opt => opt.value === formatType)}
                initialOptions={formatTypeOptions}
                handleChange={(option) => setFormatType(option.value)}
                setSelectedOptions={() => { }}
                setCurrentOptions={() => { }}
                fontSize="12px"
                isRequired={true}
                minWidth="200px"
              />
              <Select
                label="Decimal places "
                placeholder="Select"
                isClearable={false}
                isMulti={false}
                isOpen={decimalPlacesOpen}
                setIsOpen={setDecimalPlacesOpen}
                currentOptions={generateDecimalPlaceOptions()}
                selectedOptions={generateDecimalPlaceOptions().find(opt => opt.value === decimalPlaces)}
                initialOptions={generateDecimalPlaceOptions()}
                handleChange={(option) => setDecimalPlaces(option.value)}
                setSelectedOptions={() => { }}
                setCurrentOptions={() => { }}
                fontSize="12px"
                isRequired={true}
                minWidth="200px"
              />
            </div>
          </div>

          {/* Aggregate Function - Right Section */}
          <div className="aggregate-function-section">
            <div className={`${globalClasses.marginBottom}`}>
              <div 
                className="formula-preview-format-title" 
                style={{ 
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Aggregate function
                <Tooltip 
                  title="Select how to aggregate the calculated values. SUM adds all values, AVG calculates the average, COUNT counts the number of records, MIN finds the minimum value, and MAX finds the maximum value."
                  orientation="right"
                  variant="tertiary"
                >
                  <InfoOutlinedIcon 
                    style={{ 
                      fontSize: '16px', 
                      color: '#60697D', 
                      cursor: 'pointer'
                    }} 
                  />
                </Tooltip>
              </div>
            </div>

            <div className="aggregate-function-field">
              <Select
                label="Aggregate "
                placeholder="Select"
                isClearable={false}
                isMulti={false}
                isOpen={aggregateFunctionOpen}
                setIsOpen={setAggregateFunctionOpen}
                currentOptions={aggregateFunctionOptions}
                selectedOptions={aggregateFunctionOptions.find(opt => opt.value === aggregateFunction)}
                initialOptions={aggregateFunctionOptions}
                handleChange={(option) => setAggregateFunction(option.value)}
                setSelectedOptions={() => { }}
                setCurrentOptions={() => { }}
                fontSize="12px"
                isRequired={true}
                minWidth="200px"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Formula Preview Section */}
      <div className={globalClasses.marginTop}>
        <div className={`${globalClasses.evenPaddingAround} formula-preview-content-container`}>
          <div className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.marginBottom}`}>
            <h6>
              📋 Formula preview
            </h6>
            <Button
              disabled={!formulaComponents.length || !formulaValidation?.isValid}
              onClick={() => setShowPanel(true)}
              variant="secondary"
            >
              Show Sample Calculations
            </Button>
          </div>
          {formulaComponents.length > 0 && (
            <Chip
              label={generateFormulaPreview()}
              className="formula-preview-chip"
            />
          )}
        </div>
      </div>
      <SampleCalculation
        closePanel={() => setShowPanel(false)}
        showPanel={showPanel}
        kpiName={kpiName}
        kpiDescription={kpiDescription}
        formulaComponents={formulaComponents}
      />
    </div>
  );
};

export default FormulaPreview;
