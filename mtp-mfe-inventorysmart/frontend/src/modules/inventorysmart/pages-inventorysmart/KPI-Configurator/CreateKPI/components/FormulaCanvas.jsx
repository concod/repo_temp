import React, { useState, useEffect, useRef } from "react";
import {
  Divider,
} from "@mui/material";
import { Tooltip } from "impact-ui-v3";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import globalStyles from "core/Styles/globalStyles";
import FormulaGenerator from "./FormulaGenerator";
import FormulaPreview from "./FormulaPreview";
import "../../KPIConfigurator.css";
import ModuleMapping from "./ModuleMapping";
import Loader from "core/Utils/Loader/loader";
import ErrorBanner from "./ErrorBanner";

const FormulaCanvas = ({ 
  onEditComponent, 
  editingComponent, 
  onComponentUpdate,
  formulaComponents,
  setFormulaComponents,
  kpiName,
  kpiDescription,
  formatType,
  setFormatType,
  decimalPlaces,
  setDecimalPlaces,
  aggregateFunction,
  setAggregateFunction,
  moduleMapping,
  setModuleMapping,
  formulaValidation,
  setFormulaValidation,
  modules,
  moduleMappingLoader,
  isEditMode
}) => {
  const globalClasses = globalStyles();

  // Error banner visibility
  const [showErrorBanner, setShowErrorBanner] = useState(true);
  const lastFormulaSignatureRef = useRef("");

  // Reset banner visibility when validation state or formula changes
  useEffect(() => {
    const signature = JSON.stringify(
      formulaComponents.map((comp) => ({ type: comp.type, value: comp.value, id: comp.id }))
    );
    const prevSignature = lastFormulaSignatureRef.current;

    // Always show when formula is empty or valid
    if (!formulaValidation || formulaComponents.length === 0 || formulaValidation.isValid) {
      setShowErrorBanner(true);
    } else if (!showErrorBanner && signature !== prevSignature) {
      // If user changed the formula after closing and it is still invalid, show again
      setShowErrorBanner(true);
    }

    lastFormulaSignatureRef.current = signature;
  }, [formulaValidation, formulaComponents, showErrorBanner]);

  // Add component to formula
  const addComponent = (component, isUpdate = false, currentEditingComponent = null) => {
    // Validate component
    if (!component || typeof component !== 'object') {
      return;
    }

    // UPDATE OPERATION: Replace existing component
    if (isUpdate) {
      if (currentEditingComponent) {
        // Update existing component
        const updatedComponents = [...formulaComponents];
        const index = updatedComponents.findIndex(comp => comp.id === currentEditingComponent.id);
        if (index !== -1) {
          updatedComponents[index] = { ...component, type: 'component', id: currentEditingComponent.id };
          setFormulaComponents(updatedComponents);
        }
      }
      return; // Exit after update, don't continue to add logic
    }

    // ADD OPERATION: Insert new component
    const newComponent = {
      ...component,
      type: 'component',
      id: component.id || Date.now() + Math.random() // Ensure unique id
    };

    setFormulaComponents((prev) => {
      const newComponents = [...prev];

      // If currentEditingComponent exists, insert after it; otherwise append to end
      if (currentEditingComponent) {
        const editingIndex = newComponents.findIndex(comp => comp.id === currentEditingComponent.id);
        
        if (editingIndex !== -1) {
          // Insert operator after the editing component
          const autoOperator = {
            id: Date.now() + Math.random(),
            type: 'operator',
            value: '+'
          };
          
          // Insert operator and new component right after the editing component
          newComponents.splice(editingIndex + 1, 0, autoOperator, newComponent);
          return newComponents;
        }
      }

      // Default behavior: append to end
      if (newComponents.length > 0) {
        const last = newComponents[newComponents.length - 1];

        if (last && (
          last.type === 'component' || 
          last.type === 'constant' || 
          (last.type === 'parenthesis' && last.value === ')')
        )) {
          const autoOperator = {
            id: Date.now() + Math.random(),
            type: 'operator',
            value: '+'
          };
          newComponents.push(autoOperator);
        }
      }

      newComponents.push(newComponent);
      return newComponents;
    });
  };

  // Expose addComponent method to parent
  useEffect(() => {
    if (onComponentUpdate) {
      onComponentUpdate({ addComponent });
    }
  }, [onComponentUpdate]);

  return (
    <>
      <div className={`common-border`}>
        <div className={`${globalClasses.flexRow}`}>
          <div 
            className={`formula-preview-format-title ${globalClasses.evenPaddingAround}`}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Formula canvas
            <Tooltip 
              title="Build your KPI formula by adding fields, functions, operators, and time windows. Drag and drop components or use the field selector to construct complex calculations."
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
          {showErrorBanner && formulaComponents.length > 0 && formulaValidation && !formulaValidation.isValid &&
            formulaValidation.errors && formulaValidation.errors.length > 0 && (
              <ErrorBanner
                errors={formulaValidation.errors}
                onClose={() => setShowErrorBanner(false)}
              />
            )}
        </div>
        <Divider />


        {/* Formula Generator Component */}
        <FormulaGenerator
          formulaComponents={formulaComponents}
          setFormulaComponents={setFormulaComponents}
          onEditComponent={onEditComponent}
          editingComponent={editingComponent}
          setFormulaValidation={setFormulaValidation}
        />
      </div>

      {/* Formula Preview Component */}
      <FormulaPreview
        formulaComponents={formulaComponents}
        kpiName={kpiName}
        kpiDescription={kpiDescription}
        formatType={formatType}
        setFormatType={setFormatType}
        decimalPlaces={decimalPlaces}
        setDecimalPlaces={setDecimalPlaces}
        aggregateFunction={aggregateFunction}
        setAggregateFunction={setAggregateFunction}
        formulaValidation={formulaValidation}
        isEditMode={isEditMode}
      />
      <Loader
        loader={moduleMappingLoader}
        text="Loading modules..."
      >
      <ModuleMapping 
        mapping={modules}
        selectedItems={moduleMapping}
        setSelectedItems={setModuleMapping}
      />
      </Loader>

    </>
  );
};

export default FormulaCanvas;
