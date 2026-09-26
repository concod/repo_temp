import React, { useState, useEffect } from "react";
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
import { connect, useSelector } from "react-redux";
import colours from "core/Styles/colours";
// import { getBudgetTableFormattingAttributes } from "../../../../modules/plansmart/pages-plansmart/plansmart-utility";
import { useRef } from "react";

const useStyles = makeStyles((theme) => ({
  symbolStyle: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: theme.typography.pxToRem(38),
    padding: theme.typography.pxToRem(6),
  },
  inputStyle: {
    height: "100%",
    alignItems: "center",
  },
  numberFieldAttribute: {
    width: "100%",
    "& .MuiFormControl-root": {
      width: "100%",
    },
    "& .MuiOutlinedInput-adornedEnd": {
      padding: "0px",
    },
    "& .MuiInputBase-root.MuiOutlinedInput-root": {
      paddingLeft: "5px",
      backgroundColor: (props) => {
        // temperory fix for locked cell background color
        return (
          props?.node?.data?.cellLocked?.[props?.column?.colId] &&
          colours.aluminium
        );
      },
    },
    "& .MuiOutlinedInput-input": {
      padding: (props) => {
        if (props.api.gridOptionsWrapper.gridOptions.enableCustomRowHeight)
          return "2px";
      },
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
  } = instance;

  const inputCellRef = useRef(null);
  const lockCellCustomConditionFn =
    instance.api.gridOptionsWrapper.gridOptions?.lockCellCustomConditionFn;

  const lockCellIfNoValue =
    instance.api.gridOptionsWrapper.gridOptions?.lockCellIfNoValue;

  const defaultTextFieldViewOnly =
    instance.api.gridOptionsWrapper.gridOptions?.defaultTextFieldViewOnly;

  const [inputValue, setInputValue] = useState(null);
  const classes = useStyles(instance);
  const [inputTypeAdornment, setInputTypeAdornment] = useState();
  const [isCellInFocus, setIsCellInFocus] = useState(false);
  const globalClasses = globalStyles();

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
      if (formatVal === undefined) {
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
      setIsCellInFocus(false);
      setShowLock(false);
    }
  }, [instance?.data?.cellLocked?.[instance?.column?.colId]]);

  const LockCell = () => (
    <IconButton>
      {showLock && (
        <LockOpenIcon
          onClick={() => {
            setCellLock(true);
            handleCellLock(true);
          }}
          fontSize={"small"}
        />
      )}
    </IconButton>
  );
  const UnlockCell = () => (
    <IconButton
      onClick={() => {
        setCellLock(false);
        handleCellLock(false);
      }}
    >
      {showLock && <LockIcon fontSize={"small"} />}
    </IconButton>
  );

  function isValidExpression(expr) {
    const validRegex =
      /(?:(?:^|[-+_*/])(?:\s*-?\d+(\.\d+)?(?:[eE][+-]?\d+)?\s*))+$/;
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
    if (isNaN(x)) {
      return "";
    }
    if (x === undefined || x === null) {
      return x;
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  if (defaultTextFieldViewOnly && !isCellInFocus) {
    let val = inputValue !== value ? inputValue : value;
    return (
      <p
        className={disabled ? "" : globalClasses.fakeInputStyle}
        onClick={() => {
          if (disabled) return;
          setIsCellInFocus(true);
          inputCellRef?.current?.focus();
        }}
      >
        {numberFormattingWithCommas(val)}
      </p>
    );
  }

  return (
    <div
      className={`${globalClasses.flexRow} ${classes.inputStyle}`}
      title={titleText || ""}
    >
      <TextField
        autoFocus={defaultTextFieldViewOnly}
        id={`${instance?.column?.colId + instance?.data?.rowId}`}
        inputRef={inputCellRef}
        error={error}
        variant="outlined"
        className={`${classes.numberFieldAttribute}`}
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
        type={!column.isExpression ? type || "text" : "text"}
        size="small"
        min={!column.isExpression ? (type === "number" ? 0 : "") : ""}
        InputProps={{
          inputProps: styleInputText(value),
          classes: {
            input: classes.inputField,
          },
          startAdornment: (
            <InputAdornment position="start">
              {isCellLockable && (cellLock ? UnlockCell() : LockCell())}
              {inputTypeAdornment === "dollar" && <span>$ </span>}
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

            if (onInputChange && !dynamicMinMaxOnBlur) {
              if (
                budgetTableInputValidation &&
                !budgetTableInputValidation(type, inputType, newValue)
              ) {
                return;
              }

              onInputChange(newValue, type);
            }
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
      />
    </div>
  );
});

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(InputCell);
