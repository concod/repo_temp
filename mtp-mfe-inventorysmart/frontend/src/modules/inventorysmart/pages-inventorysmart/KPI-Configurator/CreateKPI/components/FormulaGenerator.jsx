import React, { useState, useRef } from "react";
import { Button, Input } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import FormulaDisplay from "./FormulaDisplay";

const FormulaGenerator = ({
  formulaComponents,
  setFormulaComponents,
  onEditComponent,
  editingComponent,
  setFormulaValidation
}) => {
  const globalClasses = globalStyles();
  const [constantInput, setConstantInput] = useState("");
  const [constantInputError, setConstantInputError] = useState("");
  const [selectedComponentIndex, setSelectedComponentIndex] = useState(null);
  const [selectedComponentType, setSelectedComponentType] = useState(null);

  const canvasRef = useRef(null);

  // Clear selected component highlight when editing is finished
  React.useEffect(() => {
    if (!editingComponent) {
      setSelectedComponentIndex(null);
      setSelectedComponentType(null);
    }
  }, [editingComponent]);

  // Add operator at specific position
  const addOperatorAtPosition = (operator, position) => {
    const newOperator = {
      id: Date.now(),
      type: 'operator',
      value: operator
    };
    const newComponents = [...formulaComponents];
    newComponents.splice(position, 0, newOperator);
    setFormulaComponents(newComponents);
  };

  // Add operator at the end of formula
  const handleAddOperator = (operator) => {
    // If user has selected an operator chip, replace it
    if (selectedComponentType === 'operator' && selectedComponentIndex !== null) {
      setFormulaComponents((prev) => {
        const updated = [...prev];
        if (updated[selectedComponentIndex] && updated[selectedComponentIndex].type === 'operator') {
          updated[selectedComponentIndex] = {
            ...updated[selectedComponentIndex],
            value: operator
          };
        }
        return updated;
      });

      setSelectedComponentIndex(null);
      setSelectedComponentType(null);
      return;
    }

    addOperatorAtPosition(operator, formulaComponents.length);
  };

  // Add parenthesis
  const addParenthesis = (type, position = null) => {
    const newParenthesis = {
      id: Date.now(),
      type: 'parenthesis',
      value: type === 'open' ? '(' : ')'
    };

    if (position !== null) {
      const newComponents = [...formulaComponents];
      newComponents.splice(position, 0, newParenthesis);
      setFormulaComponents(newComponents);
    } else {
      // Auto-add '+' operator before opening parenthesis if needed
      setFormulaComponents(prev => {
        const newComponents = [...prev];
        
        if (type === 'open' && newComponents.length > 0) {
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
        
        newComponents.push(newParenthesis);
        return newComponents;
      });
    }
  };

  // Add parenthesis at the end of formula
  const handleAddParenthesis = (type) => {
    addParenthesis(type);
  };

  const isValidNumber = (value) => {
    if (!value || !value.trim()) return false;
    return /^-?\d*\.?\d+$/.test(value.trim());
  };

  const handleConstantInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setConstantInput(value);
      setConstantInputError('');
    } else {
      setConstantInputError('Enter a valid numeric value');
    }
  };

  // Add constant
  const addConstant = (value) => {
    if (value && value.trim() && isValidNumber(value)) {
      const newConstant = {
        id: Date.now(),
        type: 'constant',
        value: value.trim()
      };
      
      // Auto-add '+' operator before constant if needed
      setFormulaComponents(prev => {
        const newComponents = [...prev];
        
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
        
        newComponents.push(newConstant);
        return newComponents;
      });
    }
  };

  const handleAddConstant = () => {
    if (constantInput.trim() && isValidNumber(constantInput)) {
      // If user selected an existing constant, replace it
      if (selectedComponentType === 'constant' && selectedComponentIndex !== null) {
        setFormulaComponents((prev) => {
          const updated = [...prev];
          if (updated[selectedComponentIndex] && updated[selectedComponentIndex].type === 'constant') {
            updated[selectedComponentIndex] = {
              ...updated[selectedComponentIndex],
              value: constantInput.trim()
            };
          }
          return updated;
        });
        setConstantInput("");
        setSelectedComponentIndex(null);
        setSelectedComponentType(null);
        return;
      }

      addConstant(constantInput.trim());
      setConstantInput("");
    }
  };

  // Delete component
  const deleteComponent = (index) => {
    setFormulaComponents((prev) => {
      const newComponents = [...prev];

      if (!newComponents[index]) {
        return newComponents;
      }

      const itemToDelete = newComponents[index];

      // If the component being deleted is currently being edited, clear the editing state
      if (itemToDelete.type === 'component' && editingComponent && itemToDelete.id === editingComponent.id) {
        if (onEditComponent) {
          onEditComponent(null);
        }
      }

      // If a component, constant, or closing parenthesis is removed, handle adjacent operators
      if (
        itemToDelete.type === 'component' || 
        itemToDelete.type === 'constant' || 
        itemToDelete.type === 'field' ||
        (itemToDelete.type === 'parenthesis' && itemToDelete.value === ')')
      ) {
        // Priority: remove the PRECEDING operator first (Block1 + Block2 / Block3 → remove Block2 → Block1 / Block3)
        if (index > 0 && newComponents[index - 1].type === 'operator') {
          // Remove the preceding operator and the item
          newComponents.splice(index - 1, 2);
        }
        // If this is the first operand, check if there's an operator after it
        else if (index < newComponents.length - 1 && newComponents[index + 1].type === 'operator') {
          // Remove the item and the next operator
          newComponents.splice(index, 2);
        }
        else {
          // No adjacent operator, just remove the item
          newComponents.splice(index, 1);
        }
      } else {
        newComponents.splice(index, 1);
      }

      // Issue 2: Clean up empty parentheses pairs — e.g. ( ) left after removing the only content inside
      let cleaned = true;
      while (cleaned) {
        cleaned = false;
        for (let i = 0; i < newComponents.length - 1; i++) {
          if (
            newComponents[i]?.type === 'parenthesis' && newComponents[i]?.value === '(' &&
            newComponents[i + 1]?.type === 'parenthesis' && newComponents[i + 1]?.value === ')'
          ) {
            // Remove the empty parentheses pair
            newComponents.splice(i, 2);
            // Also remove any dangling operator adjacent to the removed parentheses
            if (i > 0 && i < newComponents.length && newComponents[i - 1]?.type === 'operator') {
              newComponents.splice(i - 1, 1);
            } else if (i < newComponents.length && newComponents[i]?.type === 'operator') {
              newComponents.splice(i, 1);
            }
            cleaned = true;
            break; // restart scan after modification
          }
        }
      }

      // Remove trailing operator if the formula now ends with one
      while (newComponents.length > 0 && newComponents[newComponents.length - 1]?.type === 'operator') {
        newComponents.pop();
      }

      return newComponents;
    });
  };

  // Handle component click for editing
  const handleComponentClick = (component, index) => {
    if (!component) return;

    setSelectedComponentIndex(index);
    setSelectedComponentType(component.type);

    if (component.type === 'component') {
      if (onEditComponent) {
        onEditComponent(component);
      }
      return;
    }

    if (component.type === 'constant') {
      setConstantInput(component.value?.toString?.() ?? "");
    }
  };

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

    return component.timeWindow || "";
  };

  // Handle Enter key for constants
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddConstant();
    }
  };

  return (
    <div className={`${globalClasses.marginHorizontal}`}>
      {/* Control Panel */}
      <div className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginBottom} ${globalClasses.paddingVertical}`}>
        {/* Operators */}
        <div>
          <div variant="subtitle2" className="formula-generator-section-title">
            Operators
          </div>
          <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf}`}>
            {['+', '−', '×', '/'].map((operator) => (
              <Button
                key={operator}
                variant="outlined"
                size="small"
                onClick={() => handleAddOperator(operator)}
                className="formula-generator-operator-button"
              >
                {operator}
              </Button>
            ))}
          </div>
        </div>

        {/* Parentheses */}
        <div>
          <div variant="subtitle2" className="formula-generator-section-title">
            Parentheses
          </div>
          <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf}`}>
            {[
              { symbol: '(', type: 'open' },
              { symbol: ')', type: 'close' }
            ].map((paren) => (
              <Button
                key={paren.symbol}
                variant="outlined"
                size="small"
                onClick={() => handleAddParenthesis(paren.type)}
                className="formula-generator-parenthesis-button"
              >
                {paren.symbol}
              </Button>
            ))}
          </div>
        </div>

        {/* Add Constants */}
        <div className={`${globalClasses.flex}`}>
          <div variant="subtitle2" className="formula-generator-section-title">
            Add constants
          </div>
          <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf} ${globalClasses.verticalAlignCenter}`}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="Enter numeric value"
                value={constantInput}
                onChange={handleConstantInputChange}
                onKeyPress={handleKeyPress}
                error={!!constantInputError}
              />
              {constantInputError && (
                <div style={{ color: '#d32f2f', fontSize: '12px', marginTop: '4px' }}>
                  {constantInputError}
                </div>
              )}
            </div>
            <Button
              variant="text"
              size="large"
              disabled={!constantInput.trim()}
              onClick={() => {
                setConstantInput("");
                setConstantInputError("");
              }}
            >
              Clear
            </Button>
            <Button
              variant="outlined"
              size="large"
              disabled={!constantInput.trim() || !isValidNumber(constantInput)}
              onClick={handleAddConstant}
            >
              {selectedComponentType === 'constant' && selectedComponentIndex !== null ? 'Edit' : 'Add'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Formula Canvas */}
      <div className={globalClasses.marginBottom}>
        <FormulaDisplay
          formulaComponents={formulaComponents}
          setFormulaValidation={setFormulaValidation}
          onDeleteComponent={deleteComponent}
          selectedComponentIndex={selectedComponentIndex}
          selectedComponentType={selectedComponentType}
          onComponentClick={handleComponentClick}
          generateTimeWindowText={generateTimeWindowText}
          emptyMessage="Click to add formula components"
        />
      </div>
    </div>
  );
};

export default FormulaGenerator;
