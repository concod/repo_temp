import React, { useState, useEffect, useCallback } from "react";
import {
  InputAdornment,
  inputAdornmentClasses,
  TextField,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";

import IconButton from "@mui/material/IconButton";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { addSnack } from "core/actions/snackbarActions";
import { connect, useSelector, useDispatch } from "react-redux";
// import { getBudgetTableFormattingAttributes } from "../../../../modules/plansmart/pages-plansmart/plansmart-utility";
import { useRef } from "react";
import { SET_EDITABLE_CELL_FOCUS } from "core/actions/types";
import { NUMBER_CELL_TYPES } from "../constants";
import { Tooltip } from "impact-ui-v3";
const useStyles = makeStyles((theme) => ({
  symbolStyle: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: theme.typography.pxToRem(38),
    padding: theme.typography.pxToRem(6),
  },
  inputStyle: {
    alignItems: "center",
    height: (props) => props?.compactRowHeight ? theme.typography.pxToRem(24) : theme.typography.pxToRem(32),
    font: `500 ${theme.typography.pxToRem(14)} Manrope`,
    color: theme?.palette?.textColours?.lightNeutrals,
    borderRadius: theme.typography.pxToRem(8),
    backgroundColor: theme?.palette?.common?.white,
  },
  disabledInputStyle: {
    background: theme?.palette?.colours?.athensGray1,
    height: (props) => props?.compactRowHeight ? theme.typography.pxToRem(24) : theme.typography.pxToRem(32),
    font: `500 ${theme.typography.pxToRem(14)} Manrope`,
    color: theme?.palette?.textColours?.lightNeutrals,
    borderRadius: theme.typography.pxToRem(8),
  },
  numberFieldAttribute: {
    width: "100%",
    "& fieldset": {
      border: "none!important",
    },
    "& .MuiFormControl-root": {
      width: "100%",
    },
    "& .MuiOutlinedInput-adornedEnd": {
      padding: "0px",
    },
    "& .MuiInputBase-root.MuiOutlinedInput-root": {
      paddingLeft: theme.typography.pxToRem(5),
      borderRadius: theme.typography.pxToRem(8),
      maxHeight: (props) => props?.compactRowHeight ? theme.typography.pxToRem(20) : theme.typography.pxToRem(30),
      overflowY: "hidden",
      overflowX: "hidden",
    },
    "& .Mui-disabled": {
      background: `${theme?.palette?.colours?.athensGray1} !important`,
    },
    "& .MuiOutlinedInput-input": {
      padding: (props) => {
        if (props.api.gridOptionsWrapper.gridOptions.enableCustomRowHeight)
          return "2px";
      },
    },
  },
  iconButton: {
    padding: theme.typography.pxToRem(5),
    pointerEvents: "auto"
  },
  rightAlignInputValue: {
    "& .MuiInputBase-input": {
      textAlign: "right",
    },
    "& .MuiInputBase-input::-webkit-outer-spin-button": {
      marginLeft: "6px",
    },
    "& .MuiInputBase-input::-webkit-inner-spin-button": {
      marginLeft: "6px",
    },
  },
}));

const InputCell = React.memo(({ addSnack, ...instance }) => {
  const {
    row,
    column,
    value,
    max,
    isCeil,
    onInputChange,
    className,
    titleText,
    disabled = false,
    onBlur,
    isCellLockable,
    handleCellLock,
    dynamicMinMaxOnBlur,
    compactRowHeight = false,
    autoFocus = false,
    onKeyDown,
    handleEscapeKeyUpdate = false, // Opt-in flag for Escape key handling
    onEscapeKey, // Callback to notify parent when Escape is pressed
    placeholder
  } = instance;

  const inputCellRef = useRef(null);
  const dispatch = useDispatch();
  const lockCellCustomConditionFn =
    instance.api.gridOptionsWrapper.gridOptions?.lockCellCustomConditionFn;

  const lockCellIfNoValue =
    instance.api.gridOptionsWrapper.gridOptions?.lockCellIfNoValue;

  const defaultTextFieldViewOnly = instance?.colDef?.extra?.defaultTextFieldViewOnly ?? 
    instance.api.gridOptionsWrapper.gridOptions?.defaultTextFieldViewOnly;
  const escapeListenerAttached = useRef(false);
  
  // Ref callback to attach Escape listener when input element is created
  const inputRefCallback = useCallback((element) => {
    inputCellRef.current = element;
    if (element) {
      const handleArrowKeys = (e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.stopImmediatePropagation();
        }
      };
      element.addEventListener('keydown', handleArrowKeys);
      element._arrowKeyCleanup = () => {
        element.removeEventListener('keydown', handleArrowKeys);
      };
    } else if (inputCellRef.current?._arrowKeyCleanup) {
      inputCellRef.current._arrowKeyCleanup();
    }

    
    // Only attach Escape key handler if explicitly enabled via handleEscapeKeyUpdate prop
    if (element && !escapeListenerAttached.current && handleEscapeKeyUpdate) {
      const handleEscapeKey = (e) => {
        // Check if the event target is this specific input element
        if (e.key === 'Escape' && e.target === element) {
          // Stop the event from propagating further
          e.stopImmediatePropagation();
          e.preventDefault();
          // Blur the input FIRST to trigger onBlur which calls updateTableData
          element.blur();
          // Then notify parent to exit edit mode after blur completes
          setTimeout(() => {
            if (onEscapeKey) {
              onEscapeKey();
            }
          }, 50);
        }
      };
      
      // Attach to DOCUMENT with capture phase to intercept at the earliest possible moment
      document.addEventListener('keydown', handleEscapeKey, true);
      escapeListenerAttached.current = true;
      
      // Store cleanup function
      element._escapeKeyCleanup = () => {
        document.removeEventListener('keydown', handleEscapeKey, true);
        escapeListenerAttached.current = false;
      };
    } else if (!element && inputCellRef.current?._escapeKeyCleanup) {
      // Element is being unmounted, cleanup
      inputCellRef.current._escapeKeyCleanup();
    }
  }, [handleEscapeKeyUpdate]);
  
  // Focus the input when autoFocus is true
  useEffect(() => {
    if ((autoFocus || defaultTextFieldViewOnly) && inputCellRef.current) {
      // Small delay to ensure input is fully rendered
      const timer = setTimeout(() => {
        if (inputCellRef.current) {
          inputCellRef.current.focus();
          if (inputCellRef.current.select) {
            inputCellRef.current.select();
          }
        }
      }, 10);
      
      return () => clearTimeout(timer);
    }
  }, [autoFocus, defaultTextFieldViewOnly]);
  const [inputValue, setInputValue] = useState(value ?? "");
  const classes = useStyles(instance);
  const [inputTypeAdornment, setInputTypeAdornment] = useState();
  const [isCellInFocus, setIsCellInFocus] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const globalClasses = globalStyles();
  const activeEditableCell = useSelector(
    (state) => state.tableReducer.activeEditableCell
  );

  let type = instance.type;
  let inputType = instance.inputType;
  let roundOffTo = instance.roundOffTo;
  let min = instance.min;

  // logic for plansmart budget table formatting
  const applyBudgetTableFormatting =
    instance.api.gridOptionsWrapper.gridOptions?.applyBudgetTableFormatting;
  const budgetTableInputValidation =
    instance.api.gridOptionsWrapper.gridOptions?.budgetTableInputValidation;
  const applyFormatOnfocus =
    instance.api.gridOptionsWrapper.gridOptions?.applyFormatOnfocus;

  // if (applyBudgetTableFormatting) {
  //   // get type, inputType, roundOffTo for current KPI
  //   const attributes = getBudgetTableFormattingAttributes(instance);

  //   type = attributes.type;
  //   inputType = attributes.inputType;
  //   roundOffTo = attributes.roundOffTo;
  //   if (inputType === "int") {
  //     min = -Infinity;
  //   }
  // }

  const styleInputText = (value) => {
    let cellColorValues = instance?.data;
    let rowsWithDifferentCellStyle = ["variance"];
    let style = {};
    if (rowsWithDifferentCellStyle.indexOf(cellColorValues?.reference) > -1) {
      if (
        value >= cellColorValues?.min_val &&
        value <= cellColorValues?.max_val
      ) {
        style.color = cellColorValues?.max_color;
      } else if (!isNaN(value)) {
        style.color = cellColorValues?.min_color;
      }
      return { style };
    }
  };

  // const getFormatedNumber = (temp) => {
  //   let formatedValue = parseFloat(temp);
  //   if (isRoundOffTwoDecimals) {
  //     //isRoundOffTwoDecimals is used when need value to be rounded off to 2 decimals
  //     formatedValue = Math.round(temp * 100) / 100;
  //     // ADA Visual needs value to be rounded off to 3 decimal places(it's configured via backend)
  //     let roundOffTo = instance?.colDef?.extra?.roundOffTo;
  //     if (instance?.colDef?.extra?.hasOwnProperty("roundOffTo")) {
  //       let roundOffNumber = +("1" + "0".repeat(roundOffTo));
  //       formatedValue = Math.round(temp * roundOffNumber) / roundOffNumber;
  //     }
  //   } else if (isWhole) {
  //     //isWhole is used when we need value to be a whole number (without decimals)
  //     formatedValue = Math.round(temp);
  //   } else if (isCeil) {
  //     //isCeil is used when we need value to be a whole number without rounding off (without decimals)
  //     formatedValue = parseInt(temp);
  //   } else if (inputType === "dollar" && isRoundOffTwoDecimals) {
  //     //if the input type is dollar then the value should always have 2 decimals like 0.00
  //     //columns like aur, aic
  //     formatedValue = parseFloat(temp).toFixed(2);
  //   }
  //   return formatedValue;
  // };

  const getFormatedNumber = (temp, toFix) => {
    let formatedValue = parseFloat(temp);
    //deciding multiplier based on the number of decimals needed
    let multiplier = 1;
    if (toFix === 1) {
      multiplier = 10;
    } else if (toFix === 2) {
      multiplier = 100;
    } else if (toFix === 3) {
      multiplier = 1000;
    }
    if (toFix === 2) {
      //roundOffTo is used when need value to be rounded off to 1 or 2 or 3 decimals
      formatedValue = Math.round(temp * multiplier) / multiplier;
      // ADA Visual needs value to be rounded off to 3 decimal places(it's configured via backend)
      let roundOffTo = instance?.colDef?.extra?.roundOffTo;
      if (
        instance?.colDef?.extra?.hasOwnProperty("roundOffTo") &&
        !instance?.data?.roundOffTo
      ) {
        let roundOffNumber = +("1" + "0".repeat(roundOffTo));
        formatedValue = Math.round(temp * roundOffNumber) / roundOffNumber;
      }
    } else if (toFix === 0) {
      //roundOffTo = 0 is used when we need value to be a whole number (without decimals)
      formatedValue = Math.round(temp);
    } else if (isCeil) {
      //isCeil is used when we need value to be a whole number without rounding off (without decimals)
      formatedValue = parseInt(temp);
    } else if (inputType === "dollar" && toFix > 0) {
      //if the input type is dollar then the value should always have 2 decimals like 0.00
      //columns like aur, aic
      formatedValue = parseFloat(Math.round(temp * multiplier) / multiplier);
    } else if (toFix > 0) {
      formatedValue = Math.round(temp * multiplier) / multiplier;
    }
    return isCellInFocus ? formatedValue : formatedValue.toFixed(toFix);
  };
  const getFormattedText = (formatText, roundOffTo) => {
    if (
      (typeof formatText == Number ||
        (formatText && !isNaN(Number(formatText)))) &&
      !column?.id?.includes("date") &&
      inputType !== "text"
    ) {
      //if the value is of type number and  not nan then we are converting it to whole number and adding commas
      let newvaluefor =
        Number(formatText) < 0 && !applyBudgetTableFormatting // to allow negative values in plansmart budget table
          ? 0
          : new Intl.NumberFormat("en-US", {
              minimumFractionDigits: roundOffTo,
              maximumFractionDigits: roundOffTo,
            }).format(Number(formatText).toFixed(0)); //Intl.NumberFormat enables language-sensitive number formatting
      setInputValue(newvaluefor);
    } else {
      //To include commas inside Input columns like quantity etc.
      //if the value is of type string
      let temp = formatText;
      let letters = /[a-zA-Z]/g;
      // adding this condition to return "-" on rows disabled
      if (formatText && formatText !== "-" && inputType !== "text") {
        if (!formatText.match(letters)) {
          //value doesn't have any alphabets then replace comma and convert to whole number
          temp = temp.replaceAll(",", "");
          temp = Math.round(temp) < 0 ? 0 : Math.round(temp);
        }
        //adding commas to value
        let newvaluefor1 = new Intl.NumberFormat("en-US", {
          minimumFractionDigits: roundOffTo,
          maximumFractionDigits: roundOffTo,
        }).format(temp.toString()); //Intl.NumberFormat enables language-sensitive number formatting
        setInputValue(newvaluefor1);
      } else {
        setInputValue(formatText);
      }
    }
  };

  const formatInputValue = (formatVal) => {
    let formatedValue = formatVal;
    if (type === "number") {
      if (formatVal === undefined || formatVal === "") {
        return formatedValue;
      }
      //Displaying Null as empty
      if (formatVal === null && instance?.colDef?.extra?.showNullAsEmpty) {
        return formatedValue;
      }
      //roundOffTo is used to fix it to 2 or 0 or 1 like that
      let temp = formatVal;
      // removed  "formatVal < 0" condition to have negative values fixed to.
      if (!formatVal) {
        temp = 0?.toFixed(roundOffTo);
      }
      if (temp) {
        roundOffTo = instance?.data?.roundOffTo || instance.roundOffTo; // adding this line to change the round off value of specific rows
        formatedValue = getFormatedNumber(temp, roundOffTo); //here
      }
      if (column.isExpression) {
        setExpression(formatedValue);
        // setInputValue(formatedValue);
      } else {
        setInputValue(formatedValue);
      }
    } else if (
      type === "text" &&
      formatVal !== null &&
      (!isCellInFocus || applyBudgetTableFormatting || applyFormatOnfocus) // to format text onChange in plansmart budget table
    ) {
      getFormattedText(formatedValue, roundOffTo); //here
    } else setInputValue(formatVal);
    return formatedValue;
  };
  const displaySnackMessages = (message, variance) => {
    addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getNewValue = (p_value) => {
    try {
      // if user tries to remove value in cell, earlier we were setting to min value of the cell or 0 by default, with this condition we are allowing user to enter no value ("") in input cell.
      if (p_value === "") {
        return p_value;
      } else if (!Number.isInteger(parseInt(p_value)) && inputType !== "text") {
        return p_value;
      } else if (inputType === "int" && p_value) {
        return Math.min(
          Math.max(
            parseInt(Number(parseFloat(p_value.replace(/,/g, "")))),
            min
          ),
          max
        );
      } else if (inputType === "dollar" && p_value) {
        return parseFloat(p_value.replace(/,/g, ""));
      }
      return p_value;
    } catch {
      return p_value;
    }
  };

  // function to auto update the user edited values in input cell based on min anx max values
  // ex: if we have 2 columns Min and Max in the table and both of them are type int
  // then if user inputs value 10 in Min column and tries to input less than 10 in Max column then onBlur this function would updates the value equals to 10 and vice versa for max.
  // to enable this feature add dynamicMinMaxOnBlur key in extra property.
  const getUpdatedValueOnBlur = (p_value) => {
    if (inputType === "int" && p_value && dynamicMinMaxOnBlur) {
      return Math.min(
        Math.max(parseInt(Number(parseFloat(p_value.replace(/,/g, "")))), min),
        max
      );
    }
  };

  useEffect(() => {
    setInputTypeAdornment(inputType);
  }, []);

  /**
   * @function
   * @description Update inputValue everytime user focus in and out of field or onValue change
   */
  useEffect(() => {
    formatInputValue(value);
  }, [value, isCellInFocus]);

  const [showLock, setShowLock] = useState(false);
  const [cellLock, setCellLock] = useState(false);
  const [expression, setExpression] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (
      lockCellCustomConditionFn &&
      setCellLock(lockCellCustomConditionFn(instance))
    );
  }, [instance]);

  useEffect(() => {
    if (instance?.data?.cellLocked?.[instance?.column?.colId]) {
      setShowLock(true);
    } else {
      setShowLock(false);
    }
  }, [instance?.data?.cellLocked?.[instance?.column?.colId]]);

  const LockCell = () => (
    <IconButton
      className={classes.iconButton}
      disableRipple
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        setCellLock(true);
        handleCellLock(true);
      }}
    >
      {showLock && <LockOpenIcon sx={{ fontSize: "16px" }} />}
    </IconButton>
  );
  const UnlockCell = () => (
    <IconButton
      className={classes.iconButton}
      disableRipple
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        setCellLock(false);
        handleCellLock(false);
        if (defaultTextFieldViewOnly) setIsCellInFocus(false);
      }}
    >
      {showLock && <LockIcon sx={{ fontSize: "16px" }} />}
    </IconButton>
  );

  function isValidExpression(expr) {
    const validRegex = /(?:(?:^|[-+_*/])(?:\s*-?\d+(\.\d+)?(?:[eE][+-]?\d+)?\s*))+$/;
    if (validRegex.test(expr)) {
      setExpression(eval(expression));
      setInputValue(eval(expression));
      if (onInputChange) {
        onInputChange(eval(expression), type);
      }
      setInputTypeAdornment(inputTypeAdornment);
      setError(false);
      onBlur(eval(expression));
    } else {
      displaySnackMessages("Invalid Expression", "error");
      setError(true);
    }
  }
  const cellIdentifier = `id-${(
    instance?.column?.colId +
    instance?.node?.rowIndex +
    instance?.api?.gridOptionsWrapper?.domDataKey
  )?.replace(/['"\/\\`~!@#$%^&*()=+{}\[\]|:;<>?,.\t\s]/g, "")}`;
  useEffect(() => {
    if (defaultTextFieldViewOnly) {
      if (disabled) return;
      if (!activeEditableCell) {
        setIsCellInFocus(false);
        inputCellRef?.current?.blur();
        return;
      }
      if (activeEditableCell === cellIdentifier) {
        setIsCellInFocus(true);
      }
    } else {
      if (activeEditableCell === cellIdentifier) {
        inputCellRef.current.focus();
      } else if (inputCellRef?.current?.blur) {
        inputCellRef.current.blur();
        setIsCellInFocus(true);
      }
    }
  }, [activeEditableCell]);

  useEffect(() => {
    if (
      isCellInFocus &&
      defaultTextFieldViewOnly &&
      activeEditableCell === cellIdentifier
    ) {
      inputCellRef?.current?.focus();
    }
  }, [isCellInFocus]);

  useEffect(() => {
    const ancestorDiv = document
      ?.querySelector(`#${cellIdentifier}`)
      ?.closest("div.ag-cell");
    if (!cellLock) {
      ancestorDiv?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.shiftKey) {
          setCellLock(false);
          handleCellLock(false);
          inputCellRef.current.focus();
        }
      });
    } else {
      ancestorDiv?.removeEventListener("keydown", () => {});
    }
  }, [cellLock]);

  const getFieldWidth = () => {
    if (
      ["int", "float", "dollar", "percentage"].includes(inputType) &&
      !column.colDef?.extra?.fullWidth
    ) {
      let width = inputValue?.toString().length * 6 + 32;
      if (inputType === "percentage" || inputType === "dollar") width += 5;
      if (isCellLockable) width += 40;
      if (width) {
        return width;
      }
      return 50;
    }
    return "100%";
  };

  function numberFormattingWithCommas(x) {
    if (x === undefined || x === null || x === "") {
      return "";
    }
    const sanitizedValue = x.toString().replace(/,/g, "");

    if (isNaN(sanitizedValue)) {
      return "";
    }

    return sanitizedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  useEffect(() => {
    const checkOverflow = () => {
      if (inputCellRef.current) {
        const overflowing =
          inputCellRef.current.scrollWidth > inputCellRef.current.clientWidth;
        setIsOverflowing(overflowing);
      }
    };
    checkOverflow();
    const gridApi = instance?.api;
    gridApi?.addEventListener?.("columnResized", checkOverflow);
    return () => {
      gridApi?.removeEventListener?.("columnResized", checkOverflow);
    };
  }, [inputValue, value, expression, instance?.eGridCell?.clientWidth]);

  if (defaultTextFieldViewOnly && !isCellInFocus) {
    let val = inputValue !== value ? inputValue : value;
    return (
      <div
        className={`ag-input-cell ${
          disabled ||
          cellLock ||
          (lockCellIfNoValue && inputValue === undefined)
          ? classes.disabledInputStyle
          : `${globalClasses.flexRow} ${classes.inputStyle}`
        }`}
        title={titleText || ""}
      >
        <TextField
          className={`${classes.numberFieldAttribute} ${
            NUMBER_CELL_TYPES.indexOf(inputType || instance?.type) > -1 &&
            classes.rightAlignInputValue
          }`}
          id={cellIdentifier}
          onClick={() => {
            if (disabled) return;
            inputCellRef?.current?.focus();
          }}
          disabled={
            disabled ||
            cellLock ||
            (lockCellIfNoValue && inputValue === undefined)
          }
          value={
            !column.isExpression
              ? isCellInFocus
                ? inputValue
                : numberFormattingWithCommas(val)
              : expression
          }
          InputProps={{
            startAdornment: (
              <InputAdornment
                position="start"
                sx={{
                  "&.MuiInputAdornment-root": {
                    maxWidth: "24px",
                  },
                }}
              >
                {instance?.customStartAdornment ? <>{instance?.customStartAdornment}</> : <>
                  {showLock &&
                    isCellLockable &&
                    (cellLock ? UnlockCell() : LockCell())}
                  {inputTypeAdornment === "dollar" && <span>$ </span>}</>
                }
              </InputAdornment>
            ),
          }}
          onFocus={() => {
            setIsCellInFocus(true);
          }}
          onMouseEnter={() => {
            setShowLock(true);
          }}
          onMouseLeave={() => {
            if (!cellLock) setShowLock(false);
          }}
          onBlur={() => {
            setIsCellInFocus(false);
          }}
          size="small"
          placeholder={placeholder}
        ></TextField>
      </div>
    );
  }

  const notifyInputChangeOrInvalid = (type, inputType, newValue) => {
    if (onInputChange && !dynamicMinMaxOnBlur) {
      if (
        budgetTableInputValidation &&
        !budgetTableInputValidation(type, inputType, newValue)
      ){
        return;
      }
      onInputChange(newValue, type);
    }
  }
  const renderEditableTextfield = () => {
    return (
      <TextField
        autoFocus={autoFocus || defaultTextFieldViewOnly}
        id={cellIdentifier}
        inputRef={inputRefCallback}
        error={error}
        variant="outlined"
        className={`${classes.numberFieldAttribute} ${
          NUMBER_CELL_TYPES.indexOf(inputType || instance?.type) > -1 &&
          classes.rightAlignInputValue
        }`}
        value={
          !column.isExpression
            ? inputValue !== value
              ? inputValue
              : value
            : expression
        }
        disabled={
          disabled ||
          cellLock ||
          (lockCellIfNoValue && inputValue === undefined)
        }
        autoComplete={
          column?.colDef?.extra?.autoComplete
            ? column?.colDef?.extra?.autoComplete
            : null
        }
        type={
          !column?.isExpression
            ? NUMBER_CELL_TYPES.includes(type)
              ? "number"
              : type ?? "text"
            : "text"
        }
        size="small"
        placeholder={placeholder}
        min={!column.isExpression ? (type === "number" ? 0 : "") : ""}
        InputProps={{
          inputProps: styleInputText(value),
          classes: {
            input: classes.inputField,
          },
          startAdornment: (
            <InputAdornment
              position="start"
              sx={{
                "&.MuiInputAdornment-root": {
                  marginRight: "unset",
                  maxWidth: "24px",
                },
              }}
            >
              {instance?.customStartAdornment ? <>{instance?.customStartAdornment}</> : <>
                {isCellLockable && (cellLock ? UnlockCell() : LockCell())}
                {inputTypeAdornment === "dollar" && <span>$ </span>}
              </>}
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment
              position="end"
              sx={{
                "&.MuiInputAdornment-root": {
                  marginRight: "-12px",
                },
              }}
            >
              {inputTypeAdornment === "percentage" && (
                <span className="endAdornment">% </span>
              )}
            </InputAdornment>
          ),
        }}
        onChange={(e) => {
          const input = e.target;
          if (!column.isExpression && input.value.includes(",")) {
            const rawValue = input.value.replace(/,/g, "");
            let newValue = dynamicMinMaxOnBlur
              ? rawValue
              : getNewValue(rawValue);
            // to check for keys
            if (column.onlyPositiveNumbers && newValue < 0) {
              return;
            }
            const formattedValue =
              newValue !== "" && !isNaN(newValue)
                ? newValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                : newValue;
            setInputValue(formattedValue);

            notifyInputChangeOrInvalid(type, inputType, newValue)
            setInputTypeAdornment(inputTypeAdornment);
            const cursor = input.selectionStart;
            requestAnimationFrame(() => {
              input.setSelectionRange(cursor, cursor);
            });
            return;
          }
          if (!column.isExpression) {
            // don't update user entered value if dynamicMinMaxOnBlur is true as we are doing that onBlur
            let newValue = dynamicMinMaxOnBlur
              ? e.target.value
              : getNewValue(e.target.value);
            // to check for keys
            if (column.onlyPositiveNumbers && newValue < 0) {
              return;
            }

            setInputValue(newValue);

            notifyInputChangeOrInvalid(type, inputType, newValue);
            setInputTypeAdornment(inputTypeAdornment);
          } else {
            setExpression(e.target.value);
          }
        }}
        //Prevent change of value on mouse scoll in input field
        onWheel={(event) => event.target.blur()}
        onBlur={(e) => {
          let newValue = getUpdatedValueOnBlur(e.target.value);
          newValue && setInputValue(newValue);
          if (column.isExpression) {
            isValidExpression(expression);
          } else {
            onBlur(e, newValue);
          }
          // Added condition to hide the lock button which stays in focus on tab move - MTP-22626,
          // solves only for key board events.
          setIsCellInFocus(false);
          setShowLock(false);
          const inputField = document?.querySelector(`#${cellIdentifier}`);
          const ancestorDiv = inputField?.closest("div.ag-cell");
          ancestorDiv?.focus();
          dispatch({
            type: SET_EDITABLE_CELL_FOCUS,
            payload: false,
          });
        }}
        onFocus={() => {
          setShowLock(true);
          setIsCellInFocus(true);
        }}
        onMouseEnter={() => {
          setShowLock(true);
        }}
        onMouseLeave={() => {
          if (!cellLock) setShowLock(false);
        }}
        onDoubleClick={() => inputCellRef.current.select()}
        style={{ width: "100%", minWidth: 50 }}
        onKeyDown={(e) => {
          // console.log("🚀 ~ renderEditableTextfield ~ e:", e);
          if (e.key === "Tab") {
            e.preventDefault();
          }
          if (isCellLockable && e.key === "Enter" && e.shiftKey) {
            setCellLock(true);
            handleCellLock(true);
            const inputField = document?.querySelector(`#${cellIdentifier}`);
            inputField?.closest("div.ag-cell")?.focus();
          }
          
          // Call parent's onKeyDown handler for Escape key handling
          // This must be called AFTER our handlers to ensure Escape works properly
          if (onKeyDown) {
            onKeyDown(e);
          }
        }}
      />
    );
  };
  return (
    <div
      className={`ag-input-cell ${
        disabled ||
        cellLock ||
        (lockCellIfNoValue &&
          inputValue === undefined &&
          classes.disabledInputStyle)
      } ${globalClasses.flexRow} ${classes.inputStyle} ${
        instance?.colDef?.wrapText && "renderer-contains-wrap-text"
      }`}
      title={titleText || ""}
    >
      {!isCellInFocus && isOverflowing ? (
        <Tooltip
          orientation="right"
          title={
            !column.isExpression
              ? inputValue !== value
                ? inputValue
                : value
              : expression
          }
          variant="tertiary"
        >
          {renderEditableTextfield()}
        </Tooltip>
      ) : (
        <>{renderEditableTextfield()}</>
      )}
    </div>
  );
});

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(InputCell);
