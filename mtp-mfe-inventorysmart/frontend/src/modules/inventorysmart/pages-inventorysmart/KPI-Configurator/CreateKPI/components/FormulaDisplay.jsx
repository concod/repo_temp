import React from "react";
import { Chip } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";

/**
 * FormulaDisplay - A lightweight component that displays formula components and validates them
 * Used when you want to manage operators/constants/parentheses externally
 */
const FormulaDisplay = ({
  formulaComponents,
  setFormulaValidation,
  onDeleteComponent,
  selectedComponentIndex,
  selectedComponentType,
  onComponentClick,
  generateTimeWindowText,
  emptyMessage = "Click to add formula components",
  isCalculatedField = false
}) => {
  const globalClasses = globalStyles();

  // Formula validation
  const validateFormula = () => {
    const errors = [];
    let openParentheses = 0;
    let hasComponents = false;

    for (let i = 0; i < formulaComponents.length; i++) {
      const component = formulaComponents[i];
      const nextComponent = formulaComponents[i + 1];
      const prevComponent = formulaComponents[i - 1];

      switch (component.type) {
        case 'component':
        case 'field':
          hasComponents = true;
          // Check if component is followed by another component without operator
          if (nextComponent && (nextComponent.type === 'component' || nextComponent.type === 'field')) {
            errors.push('Components must be separated by operators');
          }
          break;
        case 'operator':
          // Check if operator is at the beginning or end
          if (i === 0 || i === formulaComponents.length - 1) {
            errors.push('Operators cannot be at the beginning or end of formula');
          }
          // Check if operator is followed by another operator
          if (nextComponent && nextComponent.type === 'operator') {
            errors.push('Operators cannot be consecutive');
          }
          // Check if operator is immediately after opening parenthesis
          if (prevComponent && prevComponent.type === 'parenthesis' && prevComponent.value === '(') {
            errors.push('Operators cannot appear immediately after opening parenthesis');
          }
          // Check if operator is immediately before closing parenthesis
          if (nextComponent && nextComponent.type === 'parenthesis' && nextComponent.value === ')') {
            errors.push('Operators cannot appear immediately before closing parenthesis');
          }
          break;
        case 'parenthesis':
          if (component.value === '(') {
            openParentheses++;
          } else {
            openParentheses--;
            if (openParentheses < 0) {
              errors.push('Unmatched closing parenthesis');
            }

            // Disallow empty parentheses "()" with nothing between them
            if (prevComponent && prevComponent.type === 'parenthesis' && prevComponent.value === '(') {
              errors.push('Parentheses must enclose a valid expression');
            }
          }
          break;
      }
    }

    if (openParentheses > 0) {
      errors.push('Unmatched opening parenthesis');
    }

    if (!hasComponents && formulaComponents.length > 0) {
      errors.push('Formula must contain at least one component');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Get formula validation status
  const formulaValidation = validateFormula();
  
  // Update parent's validation state when it changes
  React.useEffect(() => {
    if (setFormulaValidation) {
      setFormulaValidation(formulaValidation);
    }
  }, [JSON.stringify(formulaValidation)]);

  return (
    <div
      className={`${globalClasses.evenPaddingAround} ${globalClasses.subLabel} formula-generator-canvas common-border ${formulaValidation && !formulaValidation.isValid ? 'invalid' : 'valid'}`}
    >
      {formulaComponents.length === 0 ? (
        <div>
          {emptyMessage}
        </div>
      ) : (
        <div className={`${globalClasses.flexRow} ${globalClasses.flexWrap} ${globalClasses.gapHalf}`}>
          {formulaComponents.map((component, index) => {
            // Ensure component has required properties
            if (!component || typeof component !== 'object') {
              console.warn('Invalid component at index', index, component);
              return null;
            }

            const componentKey = component.id || `component-${index}-${component.type || 'unknown'}`;

            return (
              <React.Fragment key={componentKey}>
                {/* Component Block (for KPI components) */}
                {component.type === 'component' && (
                  <Chip
                    label={(() => {
                      // Generate full formula for chip label
                      const timeWindowText = generateTimeWindowText ? generateTimeWindowText(component) : '';

                      // Format location filter to show actual selected locations
                      let locationText = component.locationFilter || 'Location';
                      if (component.selectedLocations && component.selectedLocations.length > 0) {
                        locationText = component.selectedLocations.join(', ');
                      } else if (component.locationFilter && component.locationFilter !== 'All') {
                        locationText = component.locationFilter;
                      }

                      // Build formula parts
                      const fieldLabel = component.field?.label || component.field || 'Unknown';
                      const parts = [`${component.function?.label || 'Unknown'}([${fieldLabel}]`];

                      // Add time window only if it exists
                      if (timeWindowText) {
                        parts.push(timeWindowText);
                      }

                      // Add location
                      parts.push(locationText);

                      return parts.join(', ') + ')';
                    })()}
                    onClick={() => onComponentClick && onComponentClick(component, index)}
                    onDelete={() => onDeleteComponent && onDeleteComponent(index)}
                    color={selectedComponentIndex === index ? 'primary' : 'default'}
                    variant={selectedComponentIndex === index ? 'filled' : 'outlined'}
                    sx={selectedComponentIndex === index ? { '& .MuiChip-label': { color: 'white' } } : {}}
                    className="formula-generator-component-chip formula-preview-format-title"
                  />
                )}

                {/* Field Block (for calculated fields) */}
                {component.type === 'field' && (
                  <Chip
                    label={isCalculatedField ? (component.value || 'Unknown') : `[${component.value || 'Unknown'}]`}
                    onClick={() => onComponentClick && onComponentClick(component, index)}
                    onDelete={() => onDeleteComponent && onDeleteComponent(index)}
                    color={selectedComponentIndex === index ? 'primary' : 'default'}
                    variant={selectedComponentIndex === index ? 'filled' : 'outlined'}
                    sx={selectedComponentIndex === index ? { '& .MuiChip-label': { color: 'white' } } : {}}
                    className="formula-generator-component-chip formula-preview-format-title"
                  />
                )}

                {/* Operator */}
                {component.type === 'operator' && (
                  <Chip
                    label={component.value || '?'}
                    onClick={() => onComponentClick && onComponentClick(component, index)}
                    onDelete={() => onDeleteComponent && onDeleteComponent(index)}
                    color={selectedComponentIndex === index && selectedComponentType === 'operator' ? 'primary' : 'default'}
                    variant={selectedComponentIndex === index && selectedComponentType === 'operator' ? 'filled' : 'outlined'}
                    size="small"
                    sx={selectedComponentIndex === index ? { '& .MuiChip-label': { color: 'white' } } : {}}
                    className="formula-generator-symbol-chip formula-preview-format-title"
                  />
                )}

                {/* Parenthesis */}
                {component.type === 'parenthesis' && (
                  <Chip
                    label={component.value || '?'}
                    onDelete={() => onDeleteComponent && onDeleteComponent(index)}
                    color="default"
                    variant="outlined"
                    size="small"
                    sx={selectedComponentIndex === index ? { '& .MuiChip-label': { color: 'white' } } : {}}
                    className="formula-generator-symbol-chip formula-preview-format-title"
                  />
                )}

                {/* Constant */}
                {component.type === 'constant' && (
                  <Chip
                    label={component.value || '?'}
                    onClick={() => onComponentClick && onComponentClick(component, index)}
                    onDelete={() => onDeleteComponent && onDeleteComponent(index)}
                    color={selectedComponentIndex === index && selectedComponentType === 'constant' ? 'primary' : 'default'}
                    variant={selectedComponentIndex === index && selectedComponentType === 'constant' ? 'filled' : 'outlined'}
                    size="small"
                    sx={selectedComponentIndex === index ? { '& .MuiChip-label': { color: 'white' } } : {}}
                    className="formula-generator-component-chip formula-preview-format-title"
                  />
                )}
              </React.Fragment>
            );
          }).filter(Boolean)}
        </div>
      )}
    </div>
  );
};

export default FormulaDisplay;
