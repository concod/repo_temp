import React, { useState } from "react";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useTranslation } from "impact-ui-v3";
import CustomChip from "core/commonComponents/CustomChip";
import "./CustomChipSet.css";

const useStyles = makeStyles((theme) => ({
  customChipSetContainer: {
    width: "100%",
  },
  customChipSetWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "12px",
  },
  customChipSetHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customChipSetLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1F2B4D",
  },
  customChipSetSelectAll: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#4259EE",
    cursor: "pointer",
    userSelect: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  customChipSetChipsContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
}));

/**
 * CustomChipSet - Renders selectable chips with checkmarks using CustomChip component
 * Works with data structure: [{key, label, visible, showError}, ...]
 * The 'visible' property drives chip selection state
 * The 'showError' property controls error icon display
 * Supports drag-and-drop reordering of chips
 */
const CustomChipSet = ({
  label,
  chipData,
  onChipToggle,
  onSelectAll,
  onLabelChange,
  onChipReorder,
  isDisabled,
  isRequired,
  showSelectAll = true,
  backgroundColor,
  editable = false,
  draggable = true,
}) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const allSelected =
    chipData.length > 0 &&
    chipData.every((chip) => chip.visible === true);

  const handleDragStart = (index) => (e) => {
    if (!draggable || isDisabled) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (index) => (e) => {
    if (!draggable || isDisabled || draggedIndex === null) {
      return;
    }
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (index) => (e) => {
    if (!draggable || isDisabled || draggedIndex === null || draggedIndex === index) {
      return;
    }
    e.preventDefault();

    const newChipData = [...chipData];
    const draggedItem = newChipData[draggedIndex];
    
    newChipData.splice(draggedIndex, 1);
    newChipData.splice(index, 0, draggedItem);

    if (onChipReorder) {
      onChipReorder(newChipData);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className={classes.customChipSetContainer}>
      {/* Chips Wrapper with Background */}
      <div 
        className={classes.customChipSetWrapper}
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        {/* Header with label and Select All */}
        {(label || showSelectAll) && (
          <div className={classes.customChipSetHeader}>
            {label && (
              <Typography className={classes.customChipSetLabel}>
                {label}
                {isRequired && <span style={{ color: "#E15554" }}> *</span>}
              </Typography>
            )}
            {showSelectAll && !isDisabled && (
              <span
                className={classes.customChipSetSelectAll}
                onClick={() => onSelectAll(!allSelected)}
              >
                {allSelected ? t("chips.deselectAll") : t("chips.selectAll")}
              </span>
            )}
          </div>
        )}

        <div className={classes.customChipSetChipsContainer}>
          {chipData.map((chip, index) => {
            const isSelected = chip.visible === true;
            const isDragging = draggedIndex === index;
            
            // Check for duplicate labels
            const hasDuplicateLabel = chipData.some((otherChip, otherIndex) => {
              if (otherIndex === index) return false; // Skip self
              return otherChip.label && chip.label && 
                     otherChip.label.trim().toLowerCase() === chip.label.trim().toLowerCase();
            });
            
            return (
              <CustomChip
                key={chip.key || index}
                label={chip.label}
                isActive={isSelected}
                onClick={(active) => !isDisabled && onChipToggle(chip.key, index)}
                onLabelChange={(newLabel) => {
                  if (onLabelChange && editable) {
                    onLabelChange(chip.key, index, newLabel);
                  }
                }}
                showError={chip.showError || hasDuplicateLabel}
                editable={editable && !isDisabled}
                draggable={draggable && !isDisabled}
                onDragStart={handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
                isDragging={isDragging}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomChipSet;
