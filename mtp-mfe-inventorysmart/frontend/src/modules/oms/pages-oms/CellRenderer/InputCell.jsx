import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Input } from "impact-ui-v3";
import { get } from "lodash";
import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useCellRendererEnv } from "./CellRendererEnvContext";
import {
  numberFormatter,
  getRoundedStringForEditing,
  formatPercentageValue,
  getFormattedValue,
  isCellLockedUtil,
} from "./cellRenderer.util";
import {
  GRAND_TOTAL_ACCESSOR,
  GRAND_TOTAL_KEY,
  PERCENTAGE,
  VARIANCE_ABSOLUTE_KEY,
  VARIANCE_PERCENT_KEY,
} from "./cellRenderer.constants";
import { clearCellsLockUnlockStatus } from "../OrderManagement/slices/edit.slice";

function InputCell(props) {
  const {
    onChange,
    inputRef,
    colDef,
    data,
    value: propValue,
    cellMetaData,
    metricKey,
    isCellBold,
    isContribution,
    isVariance,
    planKpiConfig,
    version,
    isLockable = true,
  } = props;

  const dispatch = useDispatch();
  const {
    pivotLockedCells = [],
    orderTableLoader = false,
    cellDisableLoader = false,
    isKPIWiseRows,
    pivotPayload,
  } = useCellRendererEnv();

  const value = get(props, "value.value", propValue);
  const { round_off = 0, type } = planKpiConfig?.[metricKey] ?? {};

  const isPercentageVariance = get(cellMetaData, VARIANCE_PERCENT_KEY, false);
  const isAbsoluteVariance = get(cellMetaData, VARIANCE_ABSOLUTE_KEY, false);
  const isPercentageCell =
    isPercentageVariance || isAbsoluteVariance || isContribution || type === PERCENTAGE;

  const [initialValue, setInitialValue] = useState(value);
  const [newValue, setNewValue] = useState(() =>
    isPercentageCell ? value : getRoundedStringForEditing(value, round_off)
  );
  const [isCellLocked, setIsCellLocked] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isEscapeKey, setIsEscapeKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setInitialValue(value);
    setNewValue(isPercentageCell ? value : getRoundedStringForEditing(value, round_off));
  }, [value, round_off, metricKey]);

  useEffect(() => {
    setIsCellLocked(isCellLockedUtil(cellMetaData?.pkey, pivotLockedCells));
  }, [pivotLockedCells, cellMetaData]);

  const isCellDisabled = useMemo(
    () => cellDisableLoader || (isLockable && isCellLocked),
    [cellDisableLoader, isLockable, isCellLocked]
  );

  const sendValue = (updatedValue) => {
    const { contribution_fix_to = 2, variance_fix_to = 2 } = planKpiConfig?.[metricKey] ?? {};
    const effectiveRoundOff = isPercentageCell
      ? isPercentageVariance ? variance_fix_to : contribution_fix_to
      : round_off;

    onChange(
      {
        user_entered_value: updatedValue,
        before_user_entered_value: initialValue,
        formatted_initial_value: isPercentageCell
          ? formatPercentageValue(initialValue, effectiveRoundOff)
          : numberFormatter(initialValue, round_off),
      },
      cellMetaData,
      props,
      pivotPayload
    );
  };

  const handleChange = (e) => {
    const currentInputValue = e.target.value;
    if (/^-?\d*\.?\d*$/.test(currentInputValue) || currentInputValue === "") {
      setNewValue(currentInputValue);
    }
    if (onChange) onChange(e);
  };

  const onKeyPress = (e) => {
    if (e.keyCode === 13) inputRef.current?.blur();
    else if (e.keyCode === 27) {
      setIsEscapeKey(true);
      setNewValue(value);
      setTimeout(() => inputRef.current?.blur(), 0);
    }
  };

  const onKeyUp = (e) => {
    if (e.keyCode === 13) inputRef.current?.blur();
  };

  const handleFocus = () => {
    setIsFocused(true);
    setIsEditing(true);
    if (isPercentageCell) {
      const { contribution_fix_to = 2, variance_fix_to = 2 } = planKpiConfig?.[metricKey] ?? {};
      const roundOff = isPercentageVariance ? variance_fix_to : contribution_fix_to;
      setNewValue(formatPercentageValue(String(value).replace(/,/g, ""), roundOff));
    }
    setTimeout(() => inputRef?.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsEditing(false);
    const { contribution_fix_to = 2, variance_fix_to = 2 } = planKpiConfig?.[metricKey] ?? {};
    const effectiveRoundOff = isPercentageCell
      ? isPercentageVariance ? variance_fix_to : contribution_fix_to
      : round_off;

    const currentRounded = numberFormatter(newValue, effectiveRoundOff);
    if (isContribution && currentRounded > 100) {
      setNewValue(isPercentageCell ? value : getRoundedStringForEditing(value, round_off));
      setIsEscapeKey(false);
      return;
    }
    if (!isEscapeKey && currentRounded !== numberFormatter(initialValue, effectiveRoundOff)) {
      sendValue(newValue);
    }
    setNewValue(isPercentageCell ? newValue : getRoundedStringForEditing(newValue, round_off));
    setIsEscapeKey(false);
  };

  const preventDropDrag = (e) => e.preventDefault();

  const handleCellLockToggle = () => {
    const isCurrentlyLocked = isCellLockedUtil(cellMetaData?.pkey, pivotLockedCells);
    const payload = {
      locked: !isCurrentlyLocked,
      pkey: cellMetaData?.pkey,
      kpi: metricKey,
    };
    dispatch(clearCellsLockUnlockStatus(payload));
  };

  const displayValue = isEditing
    ? newValue
    : getFormattedValue({ inputValue: isPercentageCell ? newValue : numberFormatter(newValue, round_off), version, planKpiConfig, metricKey, isContribution, cellMetaData });

  const showLockIcon = isLockable && !isContribution && !isVariance && (isCellLocked || orderTableLoader);

  return (
    <Input
      onDragStart={preventDropDrag}
      onDrop={preventDropDrag}
      inputProps={{ ref: inputRef }}
      isAgGridCellRenderer
      isDisabled={isCellDisabled}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={onKeyPress}
      onKeyUp={onKeyUp}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex="0"
      leftIcon={
        !isLockable ? (
          <LockOpenOutlinedIcon style={{ visibility: "hidden", pointerEvents: "none" }} />
        ) : showLockIcon ? (
          <LockOutlinedIcon onClick={!orderTableLoader ? handleCellLockToggle : undefined} />
        ) : (
          <LockOpenOutlinedIcon
            onClick={!orderTableLoader ? handleCellLockToggle : undefined}
            style={isContribution || isVariance ? { visibility: "hidden", pointerEvents: "none" } : undefined}
          />
        )
      }
      iconClickOnDisabled={isCellDisabled}
    />
  );
}

InputCell.propTypes = {
  inputRef: PropTypes.object,
  onChange: PropTypes.func,
  colDef: PropTypes.object,
  data: PropTypes.object,
  planKpiConfig: PropTypes.object,
  isContribution: PropTypes.bool,
  isVariance: PropTypes.bool,
  isCellBold: PropTypes.bool,
  metricKey: PropTypes.string,
  version: PropTypes.string,
  value: PropTypes.number,
  isLockable: PropTypes.bool,
};

function areInputCellPropsEqual(prev, next) {
  return (
    prev.value === next.value &&
    prev.colDef?.accessor === next.colDef?.accessor &&
    prev.data?.unique_id === next.data?.unique_id &&
    prev.cellMetaData?.pkey === next.cellMetaData?.pkey &&
    prev.metricKey === next.metricKey &&
    prev.version === next.version &&
    prev.isCellBold === next.isCellBold &&
    prev.isContribution === next.isContribution &&
    prev.isVariance === next.isVariance &&
    prev.isLockable === next.isLockable &&
    prev.onChange === next.onChange
  );
}

export default React.memo(InputCell, areInputCellPropsEqual);
