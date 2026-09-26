import React, { useEffect, useState } from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import { Input } from "impact-ui-v3";
import { isOrderQtyCellEditable } from "../utils/orderQtyEditability.util.js";

function LegacyOrderQtyInputCell(params) {
  const {
    periodId,
    fiscalView,
    editableFromLevel,
    viewMode,
    pivotOrder,
  } = params;

  const displayValue = params.valueFormatted ?? params.value ?? "";
  const canEditValue = isOrderQtyCellEditable(params, {
    editableFromLevel,
    viewMode,
    pivotOrder,
    periodId,
    fiscalView,
  });

  const isPeriodMode = Boolean(periodId);
  const periodEntry = isPeriodMode
    ? (params.data?.[fiscalView === "month" ? "monthData" : "weekData"] || []).find(
        (entry) => entry.periodId === periodId
      )
    : null;

  const isLocked = isPeriodMode
    ? periodEntry?.isLocked === true
    : params.data?.order_qty?.isLocked === true;
  const showLockIcon = !params.data?.meta?.__isGrandTotal;

  const [inputValue, setInputValue] = useState(String(displayValue ?? ""));

  useEffect(() => {
    setInputValue(String(displayValue ?? ""));
  }, [displayValue, editableFromLevel, viewMode, pivotOrder]);

  const isInputDisabled = !canEditValue || isLocked;

  const commitOrderQtyValue = () => {
    if (!canEditValue || isLocked) return;
    const numericValue = Number(inputValue);
    if (Number.isNaN(numericValue)) return;
    if (String(displayValue ?? "") === String(inputValue)) return;
    if (typeof params.onOrderQtyCommit === "function") {
      params.onOrderQtyCommit({
        node: params.node,
        data: params.data,
        newValue: numericValue,
        periodId,
        fiscalView,
      });
    }
  };

  const handleBlur = () => {
    commitOrderQtyValue();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitOrderQtyValue();
    }
  };

  const handleLockClick = (event) => {
    event?.stopPropagation?.();
    if (!showLockIcon) return;
    const nextLocked = !isLocked;
    if (typeof params.onToggleLock === "function") {
      params.onToggleLock({
        node: params.node,
        data: params.data,
        nextLocked,
        periodId,
        fiscalView,
      });
    }
  };

  const iconWrapperStyle = {
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
  };

  const lockIconNode = showLockIcon ? (
    <span
      role="button"
      aria-label={isLocked ? "Unlock cell" : "Lock cell"}
      onClick={handleLockClick}
      style={iconWrapperStyle}
    >
      {isLocked ? <LockOutlinedIcon /> : <LockOpenOutlinedIcon />}
    </span>
  ) : null;

  return (
    <Input
      value={inputValue}
      onChange={(event) => setInputValue(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      leftIcon={lockIconNode}
      iconClickOnDisabled={showLockIcon && isLocked}
      isDisabled={isInputDisabled}
    />
  );
}

export default LegacyOrderQtyInputCell;
