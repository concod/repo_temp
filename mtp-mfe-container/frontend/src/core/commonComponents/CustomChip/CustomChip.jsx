import React, { useState, useRef, useEffect } from "react";
import "./CustomChip.css";
import DragIcon from "coreAssets/chip-drag-icon.svg?url";
import CheckIcon from "coreAssets/chip-check-icon.svg?url";
import ErrorIcon from "coreAssets/chip-error-icon.svg?url";

const CustomChip = ({
  label = "",
  isActive = false,
  onClick = () => {},
  onLabelChange = () => {},
  showError = false,
  editable = true,
  draggable = false,
  onDragStart = () => {},
  onDragEnd = () => {},
  onDragOver = () => {},
  onDrop = () => {},
  isDragging = false,
  ...props
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(label);
  const inputRef = useRef(null);

  useEffect(() => {
    setCurrentLabel(label);
  }, [label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Removed .select() to prevent auto-highlighting text
    }
  }, [isEditing]);

  const handleChipClick = (e) => {
    e.stopPropagation();
    onClick(!isActive);
  };

  const handleLabelClick = (e) => {
    e.stopPropagation();
    if (editable) {
      setIsEditing(true);
    }
  };

  const handleLabelBlur = () => {
    setIsEditing(false);
    if (currentLabel.trim() !== label) {
      onLabelChange(currentLabel.trim());
    }
  };

  const handleLabelKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setCurrentLabel(label);
      setIsEditing(false);
    }
  };

  const handleInputChange = (e) => {
    setCurrentLabel(e.target.value);
  };

  const handleDragIconMouseDown = (e) => {
    e.stopPropagation();
  };

  const handleChipDragStart = (e) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    onDragStart(e);
  };

  const handleChipDragEnd = (e) => {
    e.stopPropagation();
    onDragEnd(e);
  };

  const handleChipDragOver = (e) => {
    if (draggable) {
      e.preventDefault();
      e.stopPropagation();
      onDragOver(e);
    }
  };

  const handleChipDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e);
  };

  return (
    <div
      className={`custom-chip ${isActive ? "custom-chip--active" : ""} ${isDragging ? "custom-chip--dragging" : ""}`}
      onClick={handleChipClick}
      draggable={draggable}
      onDragStart={handleChipDragStart}
      onDragEnd={handleChipDragEnd}
      onDragOver={handleChipDragOver}
      onDrop={handleChipDrop}
      {...props}
    >
      <div
        className="custom-chip__drag-icon"
        onMouseDown={handleDragIconMouseDown}
      >
        <img src={DragIcon} alt="" />
      </div>

      <div className="custom-chip__check-icon">
        <img src={CheckIcon} alt="" />
      </div>

      <div 
        className={`custom-chip__label-field ${isEditing ? "custom-chip__label-field--editing" : ""} ${showError ? "custom-chip__label-field--error" : ""}`}
        onClick={handleLabelClick}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={currentLabel}
            onChange={handleInputChange}
            onBlur={handleLabelBlur}
            onKeyDown={handleLabelKeyDown}
            className="custom-chip__label-input"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="custom-chip__label-text">
            {currentLabel || label}
          </span>
        )}
      </div>

      {showError && (
        <div className="custom-chip__error-icon">
          <img src={ErrorIcon} alt="" />
        </div>
      )}
    </div>
  );
};

export default CustomChip;
