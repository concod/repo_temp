import React, { useState, useRef } from "react";
import { Typography, Paper } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { useTranslation } from "impact-ui-v3";
import FieldFunctionSelector from "./components/FieldFunctionSelector";
import FormulaCanvas from "./components/FormulaCanvas";
import "../KPIConfigurator.css";

const CreateKPI = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const [loading, setLoading] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const formulaCanvasRef = useRef(null);

  // Handle adding component to canvas
  const handleAddToCanvas = (component, isUpdate = false, contextComponent = null) => {
    if (formulaCanvasRef.current && formulaCanvasRef.current.addComponent) {
      formulaCanvasRef.current.addComponent(component, isUpdate, contextComponent);
      
      // Clear editing state after successful add/update
      setEditingComponent(null);
      
    }
  };

  // Handle editing component
  const handleEditComponent = (component) => {
    setEditingComponent(component);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingComponent(null);
  };

  // Handle component update from FormulaCanvas
  const handleComponentUpdate = (canvasMethods) => {
    formulaCanvasRef.current = canvasMethods;
  };

  return (
    <div className={`${globalClasses.pageContainer} ${globalClasses.paddingAround}`}>
      <Typography variant="h4">
        {t("inventorysmart.kpiConfiguratorTitle")}
      </Typography>
      
      <div className={`${globalClasses.flexRow} ${globalClasses.verticalAlignStart} ${globalClasses.fullWidth} ${globalClasses.gap}`}>
        {/* Left Panel - Field & Function Selector */}
        <div className={`${globalClasses.shrink0}`}>
          <FieldFunctionSelector
            onAddToCanvas={handleAddToCanvas}
            editingComponent={editingComponent}
            onCancelEdit={handleCancelEdit}
          />
        </div>

        {/* Right Panel - Formula Canvas */}
        <div className={`${globalClasses.flex}`}>
          <FormulaCanvas
            onEditComponent={handleEditComponent}
            editingComponent={editingComponent}
            onComponentUpdate={handleComponentUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateKPI;
