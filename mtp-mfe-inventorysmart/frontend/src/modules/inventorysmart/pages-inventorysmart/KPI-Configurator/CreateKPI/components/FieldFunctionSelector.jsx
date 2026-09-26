import React, { useState, useEffect, useRef, useMemo } from "react";
import { Divider } from "@mui/material";
import { Button, Select, RadioButtonGroup } from "impact-ui-v3";
import VectorIcon from "assets/IS_icons/IS_VectorInfo.svg";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import CreateCalculatedField from "../../components/CreateField";
import TimeWindowSelector from "./TimeWindowSelector";
import "../../KPIConfigurator.css";
import { filterOptions, dataAvailabilityText } from "../../utils/constants";
import {
  getAllFilters
} from "core/actions/filterAction";
import { toTitleCase } from "../../utils/helperFunctions";

const FieldFunctionSelector = (props) => {

  const { onAddToCanvas, editingComponent, onCancelEdit, fields } = props;

  const globalClasses = globalStyles();
  const timeWindowRef = useRef();

  // Track the component that was clicked for insertion position
  const [insertAfterComponent, setInsertAfterComponent] = useState(null);

  // Internal state management
  const [selectedValue, setSelectedValue] = useState({
    data_source: null,
    field: null,
    function: null
  });
  const [selectedLocationFilter, setSelectedLocationFilter] = useState("Store");

  // State for Select components
  const [filterOpenState, setFilterOpenState] = useState({
    data_source: false,
    field: false,
    function: false,
  });
  const [showCalculatedFieldPanel, setShowCalculatedFieldPanel] = useState(false);
  const [timeWindowValid, setTimeWindowValid] = useState(false);
  const [options, setOptions] = useState({});
  const [filterMeta, setFilterMeta] = useState([]);
  const [fieldCurrentOptions, setFieldCurrentOptions] = useState([]);
  const [fieldAllOptions, setFieldAllOptions] = useState([]);
  const [isDataAvailabilityExpanded, setIsDataAvailabilityExpanded] = useState(false);

  useEffect(() => {
    // Initialize fieldsData when component mounts
    const getFilters = async () => {
      try {
        // props.setLoader({ name: "fieldsLoader", value: true });
        let l_response = await getAllFilters("KPI Configurator")();
        if (l_response.data.status) {
          setFilterMeta(l_response.data.data || []);
          setSelectedValue(prev => ({ ...prev, data_source: l_response?.data?.data?.[0]?.extra?.options?.[0] || null }));
        }
      } catch (e) {
        const errObj = e?.response?.data;
        if (errObj?.show_message)
          displaySnackMessages(errObj?.message, "error");
        else displaySnackMessages("Error fetching filter", "error");
      } finally {
        props.setLoader({ name: "fieldsLoader", value: false });
      }
    };
    getFilters()
  }, []);

  // Handle data source change with full reset of other selections


  // Process fields data only when fields prop changes
  useEffect(() => {
    if (fields?.length > 0) {
      const processedFields = {};
      fields.map(item => {
        if (processedFields[item.source]) {
          processedFields[item.source].push({
            label: item.field_label,
            displayLabel: `${item.field_label} (${toTitleCase(item.data_type || "integer")})`,
            value: item.field_name,
            dataType: item.data_type,
            isDerived: item.is_derived || false
          });
        } else {
          processedFields[item.source] = [{
            label: item.field_label,
            displayLabel: `${item.field_label} (${toTitleCase(item.data_type || "integer")})`,
            value: item.field_name,
            dataType: item.data_type,
            isDerived: item.is_derived || false
          }];
        }
      });
      setOptions(prev => ({ ...prev, field: processedFields }));
    }
  }, [fields]);

  // Initialize field options when data source or field options change
  useEffect(() => {
    if (selectedValue?.data_source?.value && options?.field) {
      const dataSourceValue = selectedValue.data_source.value;
      const allFieldOptions = options.field[dataSourceValue] || [];
      setFieldAllOptions(allFieldOptions);
      setFieldCurrentOptions(allFieldOptions);
    } else {
      setFieldAllOptions([]);
      setFieldCurrentOptions([]);
    }
  }, [selectedValue?.data_source?.value, options?.field]);

  // Get available functions based on selected field's data type
  useEffect(() => {
    if (!selectedValue?.field) {
      return;
    }
    const functionsList = filterOptions.functions[selectedValue.field.dataType]?.map(func => ({ label: func, value: func })) || filterOptions.functions.integer?.map(func => ({ label: func, value: func }));
    setOptions(prev => ({ ...prev, function: functionsList }));
  }, [selectedValue?.field]);


  //Setting state value for the current filter and resetting the downstream filters
  const handleFilterChange = (columnName, value) => {
    setSelectedValue((prev) => {
      const next = { ...prev, [columnName]: value };
      const changedIndex = filterMeta.findIndex((f) => f.column_name === columnName);
      if (changedIndex === -1) return next;

      for (let i = changedIndex + 1; i < filterMeta.length; i += 1) {
        const downstreamColumn = filterMeta[i]?.column_name;
        if (downstreamColumn) {
          next[downstreamColumn] = null;
        }
      }
      return next;
    });
  };

  // Memoized filter configuration that updates with state changes
  const filterConfig = useMemo(() => {
    if (selectedValue) {
      return filterMeta.map(item => {
        const itemOptions = item.extra?.options || (item.extra?.key && selectedValue?.[item.extra.key]?.value ? options?.[item.column_name]?.[selectedValue?.[item.extra.key]?.value] : (options?.[item.column_name] ? options[item.column_name] : [])) || [];
        return {
          ...item,
          placeholder: `Select ${item.label}`,
          isOpen: filterOpenState[item.column_name] || false,
          setIsOpen: (open) => {
            setFilterOpenState(prev => ({ ...prev, [item.column_name]: open }));
            // Reset search when field dropdown opens or closes
            if (item.column_name === "field") {
              setFieldCurrentOptions(fieldAllOptions);
            }
          },
          isRequired: item.is_required,
          selectedValue: selectedValue[item.column_name]?.value,
          handleChange: (value) => handleFilterChange(item.column_name, value),
          options: itemOptions
        }
      });
    }
  }, [filterMeta, filterOpenState, selectedValue, options, fieldAllOptions]);

  // Memoized validation - only recalculates when dependencies change
  const isFormValid = useMemo(() => {
    const hasValidLocationFilter = selectedLocationFilter !== "" && selectedLocationFilter !== null;

    const hasValidDataSource = !!selectedValue?.data_source?.value;
    const hasValidField = !!selectedValue?.field?.value;
    const hasValidFunction = !!selectedValue?.function?.value;

    return hasValidDataSource &&
      hasValidField &&
      hasValidFunction &&
      timeWindowValid &&
      hasValidLocationFilter;
  }, [selectedValue, selectedLocationFilter, timeWindowValid]);

  // Load component data for editing
  const loadComponentForEditing = (component) => {
    const dataSourceValue =
      component?.dataSource?.value ||
      component?.dataSource ||
      selectedValue?.data_source?.value ||
      null;

    // Find the full field object when loading for editing
    // component.field is an object with {label, value, dataType} OR a string
    const fieldValue = component?.field?.value || component?.field;
    const fieldObj = dataSourceValue ? options.field?.[dataSourceValue]?.find((f) => f.value === fieldValue) : null;

    const dataSourceObj =
      typeof component?.dataSource === "object" && component?.dataSource
        ? component.dataSource
        : dataSourceValue
          ? { label: dataSourceValue.charAt(0).toUpperCase() + dataSourceValue.slice(1), value: dataSourceValue }
          : null;

    const functionObj =
      typeof component?.function === "object" && component?.function
        ? component.function
        : component?.function
          ? { label: component.function, value: component.function }
          : null;

    setSelectedValue({
      data_source: dataSourceObj,
      field: fieldObj || component.field || null,
      function: functionObj
    });
    // Handle both array and string formats for locationFilter
    if (component.selectedLocations && Array.isArray(component.selectedLocations)) {
      // If it's an array, take the first value (for backward compatibility)
      setSelectedLocationFilter(component.selectedLocations[0] || "Store");
    } else if (component.locationFilter) {
      // If it's a string, use it directly
      setSelectedLocationFilter(component.locationFilter);
    } else {
      setSelectedLocationFilter("Store");
    }

    // Load time window values
    if (timeWindowRef.current) {
      timeWindowRef.current.loadValues({
        selectedTimeWindow: component.timeWindow,
        startDate: component.startDate,
        endDate: component.endDate,
        useLatestAvailableDate: component.useLatestAvailableDate,
        rollingPeriods: component.rollingPeriods,
        numericInput: component.numericInput,
        selectedUnit: component.selectedUnit,
        unit: component.unit,
        unitLabel: component.unitLabel,
        enableNextToggle: component.enableNextToggle
      });
    }
  };

  // Effect to load component data when editing
  useEffect(() => {
    if (editingComponent) {
      loadComponentForEditing(editingComponent);
      // Store the component for insertion position
      setInsertAfterComponent(editingComponent);
    } else {
      // Clear form after successful add/update so selector resets
      clearForm();
    }
  }, [editingComponent]);

  // Handle add to canvas
  const handleAddToCanvas = (isUpdate) => {
    if (!isFormValid) return;

    const timeWindowValues = timeWindowRef.current?.getValues() || {};

    const component = {
      dataSource: selectedValue?.data_source,
      field: selectedValue?.field || "",
      function: selectedValue?.function || "",
      locationFilter: selectedLocationFilter,
      selectedLocations: [selectedLocationFilter],
      // Time window data from TimeWindowSelector
      timeWindow: timeWindowValues.selectedTimeWindow,
      rollingPeriods: timeWindowValues.rollingPeriods,
      numericInput: timeWindowValues.numericInput && timeWindowValues.numericInput.trim() ? timeWindowValues.numericInput : null,
      selectedUnit: timeWindowValues.selectedUnit && timeWindowValues.selectedUnit.trim() ? timeWindowValues.selectedUnit : null,
      unit: timeWindowValues.unit,
      unitLabel: timeWindowValues.unitLabel,
      enableNextToggle: timeWindowValues.enableNextToggle,
      startDate: timeWindowValues.startDate,
      endDate: timeWindowValues.useLatestAvailableDate ? null : timeWindowValues.endDate,
      useLatestAvailableDate: timeWindowValues.useLatestAvailableDate,
      id: isUpdate ? editingComponent?.id : Date.now()
    };

    // Call parent callback to add/update component
    if (onAddToCanvas) {
      // Pass insertAfterComponent for insertion position (for "Add to Formula")
      // Pass editingComponent for update operation (for "Update to Formula")
      const contextComponent = isUpdate ? editingComponent : insertAfterComponent;
      onAddToCanvas(component, isUpdate, contextComponent);
    }

    // Clear form immediately after add/update
    clearForm();
    
    // Clear insertAfterComponent after add/update operation
    setInsertAfterComponent(null);
  };

  // Clear form function
  const clearForm = () => {
    setSelectedValue({ data_source: { label: "Transaction", value: "transaction" } });
    setSelectedLocationFilter("Store");
    setTimeWindowValid(false);
    if (timeWindowRef.current) {
      timeWindowRef.current.reset();
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
    clearForm();
  };

  // Handle calculated field panel
  const handleOpenCalculatedField = () => {
    setShowCalculatedFieldPanel(true);
  };

  const handleCloseCalculatedField = () => {
    setShowCalculatedFieldPanel(false);
  };

  // Handle field search
  const handleFieldSearch = (e) => {
    const searchValue = e?.target?.value || "";
    if (searchValue?.trim() === "") {
      setFieldCurrentOptions(fieldAllOptions);
    } else {
      const filtered = fieldAllOptions.filter((option) =>
        option.label?.toLowerCase()?.includes(searchValue.toLowerCase())
      );
      setFieldCurrentOptions(filtered);
    }
  };

  // Generate filters function similar to ReviewForecastPanel
  const generateFilters = () => {
    if (!filterConfig?.length) return null;

    return filterConfig?.map((filter) => {
      const safeOptions = Array.isArray(filter.options) ? filter.options : [];

      const addFieldOption =
        filter.column_name === "field"
          ? {
              label: (
                <div className="add-fields-wrapper">
                  <Divider />
                  <Button variant="url">+ Add Calculated Field</Button>
                </div>
              ),
              value: "add_field"
            }
          : null;
      
      // Use fieldCurrentOptions for field selector, otherwise use safeOptions
      const baseOptions = filter.column_name === "field" 
        ? fieldCurrentOptions.map(opt => ({
            ...opt,
            label: opt.isDerived ? (
              <span style={{ color: colours.cornflowerBlue }}>{opt.displayLabel}</span>
            ) : opt.displayLabel
          }))
        : safeOptions;
      
      const finalOptions =
        filter.column_name === "field"
          ? [...baseOptions, addFieldOption]
          : baseOptions;

      return (
        <Select
          label={filter.label}
          placeholder={filter.placeholder}
          isClearable={false}
          isMulti={false}
          isOpen={filter.isOpen}
          setIsOpen={filter.setIsOpen}
          currentOptions={finalOptions}
          selectedOptions={finalOptions.length ? finalOptions.find(opt => opt.value === filter.selectedValue) : null}
          initialOptions={finalOptions}
          handleChange={(value) => {
            if (value?.value === "add_field") {
              filter.setIsOpen(false);
              handleOpenCalculatedField();
              return;
            }
            // For field selector, extract the original option to avoid storing React elements
            if (filter.column_name === "field") {
              const originalOption = fieldCurrentOptions.find(opt => opt.value === value?.value);
              filter.handleChange(originalOption || value);
            } else {
              filter.handleChange(value);
            }
          }}
          setSelectedOptions={() => { }}
          setCurrentOptions={filter.column_name === "field" ? setFieldCurrentOptions : () => { }}
          minWidth="180px"
          fontSize="12px"
          isRequired={filter.isRequired}
          isWithSearch={filter.column_name === "field"}
          onSearch={filter.column_name === "field" ? handleFieldSearch : undefined}
        />
      );
    });
  };

  const addFieldOption = (option) => {
    const dataSource = selectedValue?.data_source?.value;
    if (!dataSource || !option?.value) return;

    const normalizedOption = {
      label: option?.label,
      displayLabel: `${option?.label} (${toTitleCase(option?.dataType || "integer")})`,
      value: option?.value,
      dataType: option?.dataType || "integer",
      isDerived: true
    };

    setOptions((prev) => {
      const prevFieldOptions = prev?.field || {};
      const currentSourceOptions = Array.isArray(prevFieldOptions[dataSource])
        ? prevFieldOptions[dataSource]
        : [];

      if (currentSourceOptions.some((o) => o?.value === normalizedOption.value)) {
        return prev;
      }

      return {
        ...prev,
        field: {
          ...prevFieldOptions,
          [dataSource]: [...currentSourceOptions, normalizedOption]
        }
      };
    });

    setSelectedValue((prev) => ({
      ...prev,
      field: normalizedOption
    }));
  };

  return (
    <div className={`${globalClasses.marginBottom} field-function-selector-color common-border`}>
      <div className={`formula-preview-format-title ${globalClasses.evenPaddingAround}`}>
        Field & function selector
      </div>
      <Divider />
      <div className={`${globalClasses.marginBottom} ${globalClasses.evenPaddingAround}`}>

        {/* Data Source, Field, and Function Selection - Same Row */}
        <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf} ${globalClasses.verticalAlignEnd} ${globalClasses.marginBottom}`}>
          {generateFilters()}
        </div>

         {/* Data Availability Info - Collapsible */}
         <div className={`${globalClasses.evenPaddingAround} ${globalClasses.marginBottom} common-border data-availability-info ${isDataAvailabilityExpanded ? 'expanded' : 'collapsed'}`}>
          <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
            <VectorIcon />
            <div className="data-availability-content-wrapper">
            <div 
                className={`formula-preview-format-title ${globalClasses.verticalLabel} data-availability-header`}
                onClick={() => setIsDataAvailabilityExpanded(!isDataAvailabilityExpanded)}
              >
                <span>Data availability and restrictions</span>
                <span className="data-availability-toggle-icon">
                  {isDataAvailabilityExpanded ? '▼' : '▲'}
                </span>
              </div>
              {isDataAvailabilityExpanded && (
                <div className="data-availability-text-container">
                  {
                    dataAvailabilityText.map((text, index) => (
                      <div className="data-availability-text" key={index}>
                        {text}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location Filter - Single-select */}
        <div className={globalClasses.verticalLabel}>
          Location filter
        </div>
        <div className={`${globalClasses.marginBottom} ${globalClasses.marginLeft1rem}`}>
          <RadioButtonGroup
            options={filterOptions.locationFilterOptions}
            selectedOption={selectedLocationFilter}
            onChange={(event) => { setSelectedLocationFilter(event.target.value) }}
            orientation="row"
          />
        </div>

        {/* Time Window Selection */}
        <TimeWindowSelector
          ref={timeWindowRef}
          selectedDataSource={selectedValue.data_source}
          onChange={() => {
            // Update validation state when time window changes
            const isValid = timeWindowRef.current?.isValid() || false;
            setTimeWindowValid(isValid);
          }}
          forecastDayLevel={props.forecastDayLevel}
          fiscalCalendarData={props.fiscalCalendarData}
        />

        {/* Add to Formula Canvas Button */}
        <div className={`${globalClasses.marginTop} add-to-canvas-section`}>
          <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
            <Button
              variant="secondary"
              disabled={!isFormValid}
              onClick={() => handleAddToCanvas(false)}
            >
              Add to Formula
            </Button>
            {editingComponent &&
            <Button
              variant="secondary"
              disabled={!isFormValid}
              onClick={() => handleAddToCanvas(true)}
            >
              Update Formula
            </Button>
            }

            {editingComponent && (
              <Button
                variant="secondary"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Calculated Field Panel */}
      <CreateCalculatedField
        open={showCalculatedFieldPanel}
        onClose={handleCloseCalculatedField}
        preSelectedDataSource={selectedValue.data_source}
        addFieldOption={addFieldOption}
      />
    </div>
  );
};

export default FieldFunctionSelector;
