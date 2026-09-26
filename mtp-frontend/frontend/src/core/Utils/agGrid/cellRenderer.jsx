import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { Checkbox, Link, TextField } from "@mui/material";
import { Switch } from "impact-ui";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import CloseIcon from "assets/closeIcon.svg";
import InputCell from "./cellsToBeRendered/inputCell";
import DeleteCell from "./cellsToBeRendered/deleteCell";
import EditCell from "./cellsToBeRendered/editCell";
import ChartCell from "./cellsToBeRendered/chartCell";
import ReviewCell from "./cellsToBeRendered/reviewCell";
import LockableCell from "./cellsToBeRendered/lockableCell";
import ReactSelect from "../select";
import CalendarCell from "./cellsToBeRendered/calendarCell";
import ReviewButtonCell from "./cellsToBeRendered/ReviewButtonCell";
import DownloadCell from "./cellsToBeRendered/downloadCell";
import moment from "moment-timezone";
import { addSnack } from "core/actions/snackbarActions";
import { numbersWithComma } from "core/Utils/formatter";
import { END_DATE } from "config/constants";
import { replaceSpecialCharacter ,getCurrentDatePluseOne} from "core/Utils/functions/utils";
import RangeSlider from "./cellsToBeRendered/rangeSliderCell";
import { DEFAULT_ROUNDOFF } from "./constants";
import DateRangePickerCell from "./cellsToBeRendered/dateRangePickerCell";
import MultipleDateRangePicker from "./cellsToBeRendered/multipleDateRangePicker/multipleDateRangePicker";
import ImageCell from "./cellsToBeRendered/imageCell";

const useStyles = makeStyles((theme) => ({
  textField: {
    width: "100%",
    "& .MuiFormControl-root": {
      width: "100 %",
    },
    "& .MuiOutlinedInput-adornedEnd": {
      padding: "0px",
    },
  },
  checkbox: {
    padding: "0px",
    verticalAlign: "sub",
  },
  link: {
    cursor: "pointer",
    margin: "1rem",
  },
  linkDisabled: {
    pointerEvents: "none",
    color: theme.palette.action.disabled,
    margin: "1rem",
  },
  datePicker: {
    width: "100%",
    margin: "1px 0",
    "& .MuiInputBase-input": {
      padding: "10px",
    },
  },
  date_containers__button_add: {
    display: "flex",
    align_items:"center",

    svg :{
        width: "10px",
        height: "10px",
        cursor: "pointer"
    }}
}));
const CellRenderers = (props) => {
  const classes = useStyles();
  const {
    value,
    data, // used instead of row
    column,
    colDef,
    wholeData,
    typeFormat,
    // This is a custom function that we supply to our table instance
  } = props.cellData;
  // Custom functions being passed to table are set witin gridOptions of ag grid instance
  const onEditClick =
    props.cellData.api.gridOptionsWrapper.gridOptions.onEditClick;
  const isEditDisabled =
    props.cellData.api.gridOptionsWrapper.gridOptions.isEditDisabled;
  const callDeleteApi =
    props.cellData.api.gridOptionsWrapper.gridOptions.callDeleteApi;
  const isDeleteDisabled =
    props.cellData.api.gridOptionsWrapper.gridOptions.isDeleteDisabled;
  const onChartClick =
    props.cellData.api.gridOptionsWrapper.gridOptions.onChartClick;
  const onReviewClick =
    props.cellData.api.gridOptionsWrapper.gridOptions.onReviewClick;
  const onBlur = props.cellData.api.gridOptionsWrapper.gridOptions.onBlur;
  const onToggleChange =
    props.cellData.api.gridOptionsWrapper.gridOptions.onToggleChange;
  const onCheckBoxChange =
    props.cellData.api.gridOptionsWrapper.gridOptions.onCheckBoxChange;
  const onDownloadClick =
    props.cellData.api.gridOptionsWrapper.gridOptions.onDownloadClick;
  const onRangeSliderChange =
    props.cellData.api.gridOptionsWrapper.gridOptions.onRangeSliderChange;
  const btnVariant =
    props.cellData.api.gridOptionsWrapper.gridOptions.btnVariant;

  const [initValue, setInitValue] = useState({ value });
  const [initialValue, setInitialValue] = useState();
  const [initialLoad, setInitialLoad] = useState(true);
  const [isChanged, setIsChanged] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  const [isExp, setIsExp] = useState(false);
  const onApplyCalendarDates =
    props.cellData.api.gridOptionsWrapper.gridOptions.onApplyCalendarDates;
  const lockCellApi =
    props.cellData.api.gridOptionsWrapper.gridOptions?.lockCellApi;
  const callBackOnChangeCustomFunction =
    props.cellData.api.gridOptionsWrapper.gridOptions
      .callBackOnChangeCustomFunction;
  // custom functions to update on change data of table instance
  useEffect(() => {
    if (initialLoad || !isChanged) {
      setInitialValue(value);
      setInitialLoad(false);
    }
    setInitValue(value);
  }, [value]);
  useEffect(() => {
    if (column?.isExpression) {
      setIsExp(column.isExpression);
    } else {
      setIsExp(false);
    }
  }, [column.isExpression]);
  const setDropdownValues = (node, colId, colType, value) => {
    if (node?.group) {
      const children = Object.keys(node.childrenMapped);
      if (children.length === 0) {
        node?.allLeafChildren?.forEach((child) =>
          setDropdownValues(child, colId, colType, value)
        );
      } else {
        children.forEach((childNode) => {
          return setDropdownValues(
            node.childrenMapped[childNode],
            colId,
            colType,
            value
          );
        });
      }
    }
    if (colType === "dynamic-list") {
      setIsChanged(true);
      let l_cellData = props.column.is_multi ? value : [value];
      node.setDataValue(colId, l_cellData);
    } else {
      if (column.colDef.isMulti) {
        let newValue = value.map((opt) => opt.value);
        setInitValue([...newValue]);
        node.setDataValue(colId, value);
      } else {
        setInitValue(value.value);
        node.setDataValue(colId, value.value);
      }
    }
  };
  const handleDropDown = (e, p_colType = "", extra = {}) => {
    let cellNode = props.cellData.node;
    let colId = props.cellData.column.colId;
    let toUpdateDropDown = extra?.onChangeCustomFunction
      ? callBackOnChangeCustomFunction(cellNode, colId, p_colType, e)
      : true;
    if (toUpdateDropDown) {
      setDropdownValues(cellNode, colId, p_colType, e);
    }
  };
  const onBlurChangeHandler = (e, p_changedValue) => {
    // update agGrid instance onBlur if dynamicMinMaxOnBlur is true
    if (p_changedValue) {
      let colId = props.cellData.column.colId;
      props.cellData.node.setDataValue(colId, p_changedValue);
    }
    let newVal = isExp ? e : initValue;
    let preValue = value;
    let val = isExp ? newVal : value; // Previous value
    let initialVal = isExp ? preValue : initialValue; // Old value
    let initVal = isExp ? newVal : initValue;
    if (onBlur) {
      onBlur(
        e,
        data,
        column,
        isChanged,
        val, // previous value
        initialVal, // old Value
        props.cellData,
        initVal, // New value
        previousValue
      );
    }
    setIsChanged(false);
    setInitialValue(value);
  };
  const onChangeHandler = (e) => {
    setIsChanged(false);
    if (onToggleChange) {
      onToggleChange(e, data, column, isChanged, value);
    }
  };
  const handleChangeToggle = (e) => {
    let checked = e.target.checked;
    let colId = props.cellData.column.colId;
    setInitValue(checked);
    props.cellData.node.setDataValue(colId, checked);
    if (onCheckBoxChange) {
      onCheckBoxChange(e.target.checked, data, column);
    }
  };
  const handleChange = (p_changedValue, type) => {
    if (type === "number") {
      p_changedValue = parseFloat(p_changedValue);
    }
    if(type === "datetime"){
      p_changedValue = p_changedValue;
      let colId = props.cellData.column.colId;
      setInitValue(p_changedValue);
      props.cellData.node.setDataValue(colId, p_changedValue);
      setIsChanged(true);
    }
    else{
    let colId = props.cellData.column.colId;
    setInitValue(p_changedValue);
    // this func get's executed when user edits cell with type float
    // p_changedValue is of type string
    // issue: search would not work for updated value in numeric search column
    // solution: casting p_changedValue value from string to number
    props.cellData.node.setDataValue(colId, +p_changedValue);
    setIsChanged(true);
    }
  };
  const setDates = (node, colId, value) => {
    if (node.group) {
      let children = Object.keys(node.childrenMapped);
      if (children.length === 0) {
        node.allLeafChildren?.forEach((child) => setDates(child, colId, value));
      } else {
        children.forEach((childNode) => {
          return setDates(node.childrenMapped[childNode], colId, value);
        });
      }
    }
    return node.setDataValue(colId, value);
  };
  const handleChangeDate = (e, item) => {

    let l_dateFormat = item.extra.dateFormat;
    let l_updatedDate = l_dateFormat ? moment(e).format(l_dateFormat) : e;
    let cellNode = props.cellData.node;
    let colId = props.cellData.column.colId;
    setInitValue(l_updatedDate);
    setDates(cellNode, colId, l_updatedDate);
  };

  const handleChangeDateRange = ({
    fiscalInfoStartDate,
    fiscalInfoEndDate,
  }) => {
    let startDate = moment(fiscalInfoStartDate).format(props.tenantDateFormat);
    let endDate = moment(fiscalInfoEndDate).format(props.tenantDateFormat);
    let colId = props.cellData.column.colId;
    let cellNode = props.cellData.node;
    cellNode.setDataValue(colId, {
      fiscalInfoStartDate: startDate,
      fiscalInfoEndDate: endDate,
    });
  };

  const handleInputChange = (p_changedValue) => {
    setIsChanged(true);
    setInitValue(p_changedValue);
    let colId = props.cellData.column.colId;
    props.cellData.node.setDataValue(colId, p_changedValue);
  };
  /**
   * This function updates the agGrid cell level data when user edits the dates
   */
  const handleMultiDateChange = (p_changedValue) => {
    let colId = props.cellData.column.colId;
    props.cellData.node.setDataValue(colId, p_changedValue);
    props.onCellValueChanged(props.cellData);
  };

  const handleCellLock = (isLocked) => {
    props.cellData.node["cellLocked"] = isLocked;
    if (lockCellApi) lockCellApi(props, isLocked);
  };
  const listMultiValueExpression = (currentValue, options) => {
    //For multi value expression, after useeffect of value, first the initvalue is coming as
    //array of string values and later due to useeffect, it is coming as array of objects
    //Written a logic to handle the above case, that is if the initValue is array of strings,
    //we check for index using indexOf method in array else we check using some method
    //We First check if initValue is an array and then check if type of first element in the array,
    //is string or object
    return (
      options
        ?.filter((option) => {
          if (
            Array.isArray(currentValue) &&
            currentValue.length > 0 &&
            typeof currentValue[0] === "string"
          ) {
            return currentValue.indexOf(option.value) > -1;
          }
          if (
            Array.isArray(currentValue) &&
            currentValue.length > 0 &&
            typeof currentValue[0] === "object" &&
            currentValue[0] !== null
          ) {
            return currentValue.some((val) => val.value === option.value);
          }
          return false;
        })
        .map((opt) => {
          return {
            label: replaceSpecialCharacter(opt.label || opt.name),
            value: opt.value,
          };
        }) || initValue
    );
  };
  const isGridRowDisabled = (rowData, item) => {
    let isDisabled = false;
    if (typeof item.disabled === "function") {
      isDisabled = item.disabled(data, item);
    } else {
      if (item.disabled) {
        isDisabled = item.disabled;
      } else {
        const rowLevel = rowData.node.level;
        if (rowData?.data?.enableToggle) {
          isDisabled = false;
        } else if (!rowLevel) {
          isDisabled = rowData?.data?.disableEditSelection;
        } else {
          isDisabled = rowData?.node?.parent?.data?.disableEditSelection;
        }
      }
      /**
       * below condition will disable values at column level
       */
      if (item?.extra?.is_disabled) {
        isDisabled = true;
      }
    }
    return isDisabled;
  };
  /*
    Note :- To refresh or disable cells based on changes on custom cell renderer component use the following in parent container.
    Within onCellValueChanged (which is called when grid detects any changes in data), use agGridInstance ref value and call refreshCells api with the following params
    // Skip change detection, refresh everything. 
    force?: boolean;
    // Skip cell flashing, if cell flashing is enabled (For UI or Testing purpose to see the cells being refreshed)
    suppressFlash?: boolean;
    // Optional list of row nodes to restrict operation to 
    rowNodes?: RowNode[];
    // Optional list of columns to restrict operation to 
    columns?: (string | Column)[];
    agGridInstance.current.api.refreshCells({force:true, suppressFlash: false,rowNodes: rowNodesList, columns:columnList});
  */
  const renderForm = (item) => {
    let roundOffTo = DEFAULT_ROUNDOFF;
    if (item.formatter === "roundOff") {
      roundOffTo = 0;
    } else if (item.formatter === "roundOfftoOneDecimals") {
      roundOffTo = 1;
    } else if (item.formatter === "roundOfftoTwoDecimals") {
      roundOffTo = 2;
    } else if (item.formatter === "roundOfftoThreeDecimals") {
      roundOffTo = 3;
    }
    const isRowDisabled = isGridRowDisabled(props.cellData, item);
    switch (item.type) {
      case "list":
        return (
          <div style={{ width: "100%" }}>
            <ReactSelect
              menuShouldBlockScroll={true}
              menuPortalTarget={document.body}
              onBlur={onBlurChangeHandler}
              name={item.accessor}
              isMulti={column.colDef.isMulti}
              isSearchable={
                column.colDef.isSearchable || column.colDef.is_searchable
              }
              maxMultiSelect={column.colDef.maxMultiSelect || item.maxMultiSelect}
              onMaxLimitExceeded={(max) =>
                props.addSnack({
                  message: `User cannot select more than ${max} DCs for a single store`,
                  options: { variant: "warning" },
                })
              }
              options={item.options}
              hideToolTip={true}
              value={
                initValue
                  ? column.colDef.isMulti
                    ? listMultiValueExpression(initValue, item.options)
                    : item.options
                        ?.filter((option) => {
                          let selectVal = Array.isArray(initValue)
                            ? initValue[0]
                            : initValue;
                          if (typeof selectVal === String) {
                            selectVal = replaceSpecialCharacter(selectVal);
                          }
                          return option.value === selectVal;
                        })
                        .map((opt) => {
                          let label = opt.label || opt.name;
                          label = label
                            ? replaceSpecialCharacter(label.toString())
                            : "";
                          return {
                            label: label,
                            value: opt.value,
                          };
                        })[0] || initValue
                  : ""
              }
              data-testid={`select${item.name}`}
              onChange={(option) => handleDropDown(option)}
              isDisabled={isRowDisabled}
            />
          </div>
        );
      case "dynamic-list":
        let l_value = data?.[item.accessor];
        if (Array.isArray(data?.[item.accessor])) {
          l_value = data?.[item.accessor].map((item) => {
            if (item) {
              item.label = item?.label
                ? replaceSpecialCharacter(item?.label?.toString())
                : "";
            }
            return item;
          });
        } else {
          if (l_value?.label) {
            l_value.label = replaceSpecialCharacter(l_value.label.toString());
          }
        }
        return (
          <div style={{ width: "100%" }}>
            <ReactSelect
              hideToolTip={true}
              onBlur={onBlurChangeHandler}
              menuShouldBlockScroll={true}
              menuPortalTarget={document.body}
              name={item.accessor}
              isMulti={item.is_multi}
              isSearchable={true}
              options={data?.[item?.extra?.options_column]}
              value={l_value}
              data-testid={`select${item.name}`}
              onChange={(option) =>
                handleDropDown(option, item.type, item.extra)
              }
              isClearable={item?.extra?.is_clearable}
              isDisabled={isRowDisabled}
            />
          </div>
        );
      case "str":
        return (
          <InputCell
            type={"text"}
            inputType="text"
            className={classes.textField}
            onInputChange={handleInputChange}
            onBlur={(e) => {
              onBlurChangeHandler(e);
            }}
            {...props?.cellData}
            disabled={isRowDisabled}
          />
        );
      case "int":
        // min and max usecases
        // 1. whole column might have static min and max constraints for which we get min and max value in column config itself which is accessed as item.min/max .
        // eg. all cells in the column will have same min max constraints columns config {min: 12, max: 24}
        // 2. each cell in a column might have dynamic min and max constraints for which we get a key called dynamicMaxKey/dynamicMinKey in column config and corresponding min max of each rows will be sent in row data
        // eg.  column-config {dynamicMin: wosMin, dynamicMax: wosMax} row-data [{wosMin: 10, wosMAx: 20},{wosMin: 20, wosMax: 40}]
        // priority -> 1.static constraints (item.min/max) 2. dynamic constraints (data[item.dynamicMaxKey]) 3. if both aren't availble then min is 0 and max is Math.min() -> Infinity
        return (
          <InputCell
            // Added this condition to specifically add number type to input field. Text type is causing issue on plansmart budget
            // we can add typeFormat in extra property as well in table config
            type={
              item?.typeFormat || item?.extra?.typeFormat
                ? item?.typeFormat || item?.extra?.typeFormat
                : "text"
            }
            inputType="int"
            min={item?.min || data?.[item?.dynamicMinKey] || 0}
            max={
              item?.max ||
              (!isNaN(data?.[item?.dynamicMaxKey])
                ? data?.[item?.dynamicMaxKey]
                : Math.min())
            }
            dynamicMinMaxOnBlur={item?.extra?.dynamicMinMaxOnBlur}
            minmaxpositive={item?.extra?.minmaxpositive}
            className={classes.textField}
            onInputChange={handleInputChange}
            onBlur={(exp, p_changedValue) => {
              onBlurChangeHandler(exp, p_changedValue);
            }}
            {...props?.cellData}
            isCellLockable={item.is_lockable}
            handleCellLock={handleCellLock}
            disabled={isRowDisabled}
            //type int shouldn't be used if roundoff value is non zero
            roundOffTo={0}
          />
        );
      case "bool":
        return (
          <Checkbox
            name={item.accessor}
            color="primary"
            className={
              typeof item.customClassName === "function"
                ? item.customClassName(data, item)
                : classes.checkbox
            }
            checked={value || false}
            disabled={isRowDisabled}
            size="small"
            onClick={(e) => {
              handleChangeToggle(e);
            }}
            onBlur={onBlurChangeHandler}
          />
        );
      case "link":
        return (
          <>
            {value !== null ? (
              <Link
                onClick={() => {
                  props?.column?.onClick
                    ? props.column.onClick(props)
                    : colDef?.column_name
                      ? props?.actions[colDef.column_name]?.(
                        data,
                        colDef.column_name,
                        item
                      )
                      : props?.actions[colDef.showRowGroup]?.(
                        props.cellData,
                        colDef.showRowGroup
                      );
                }}
                // className={isRowDisabled ? classes.linkDisabled : classes.link}
                underline="hover"
              >
                {item?.formatter && item.formatter === "numbersWithComma"
                  ? numbersWithComma(props.cellData, 0)
                  : value}
              </Link>
            ) : (
              "-"
            )}
          </>
        );
      case "ToogleField":
        return (
          <Switch
            checked={initValue}
            onClick={(e) => {
              handleChangeToggle(e);
            }}
            onChange={(e) => onChangeHandler(e)}
            onBlur={onBlurChangeHandler}
            name={item.accessor}
            color="primary"
            disabled={isRowDisabled}
          />
        );
      case "datetime":
        return (
          <LocalizationProvider dateAdapter={AdapterMoment}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"center"}}>
            <DatePicker
              disableToolbar
              variant="inline"
              inputVariant="outlined"
              inputFormat={item?.extra?.displayDateFormat||props.tenantDateFormat}
              className={classes.datePicker}
              id="date-picker"
              value={value || item.defaultValue || null}
              onChange={(e) => {
                handleChangeDate(e, item);
              }}
              minDate={item?.extra?.disableCurrentDate ? getCurrentDatePluseOne() : item?.minDate || null}
              maxDate={item?.maxDate || END_DATE}
              renderInput={(inputProps) => (
                <TextField
                  {...inputProps}
                  classes={{
                    root: classes.datePicker,
                  }}
                  InputProps={{
                    ...inputProps.InputProps,
                    style: { height: "2.1rem" },
                  }}
                inputProps={{
                  ...inputProps.inputProps,
                  readOnly: item?.extra?.isKeyBoardDisable || item?.extra?.isKeyBoardDisableWithNoClearbutton? true : false,  // Prevent manual input if we want to only select date from calender isKeyBoardDisable key will have clear button
                }}
              />
              )}
              disablePast={item.disablePast ? true : false}
              shouldDisableDate={(date) =>
                item.shouldDisableDate
                  ? item.shouldDisableDate(date, value)
                  : null
              }
              disabled={isRowDisabled}
            />
            {item?.extra?.isKeyBoardDisable &&
            <div
              onClick={() =>
                handleChange("", item.type)
                }
                className={classes.date_containers__button_add}
                style={{padding: '2px'}}
                >
                    <CloseIcon viewBox="0 0 20 20" />
                    </div>
             }
            </div>
          </LocalizationProvider>
        );
      case "daterangepicker":
        return (
          <DateRangePickerCell
            keepOpenOnDateSelect={item.keepOpenOnDateSelect}
            anyDayOfWeekAllowed={item.anyDayOfWeekAllowed}
            withPortal={item.withPortal}
            removeWeekNumber={item.removeWeekNumber}
            hideDateRangeLabel={item.hideDateRangeLabel}
            selectedDate={value}
            disablePastWeeks={true}
            disableFutureWeeks={item.disableFutureWeeks}
            maxOneWeekSelection={item.maxOneWeekSelection}
            isOutsideRange={item.isOutsideRange}
            showClearDates={item.showClearDates}
            disabled={item.isDisabled}
            fiscalCalendarData={item.fiscalCalendarData}
            tenantDateFormat={props.tenantDateFormat}
            onDateChange={handleChangeDateRange}
          />
        );
      case "percentage":
        return (
          <InputCell
            type="number"
            inputType="percentage"
            className={classes.textField}
            onInputChange={(e) => handleChange(e)}
            onBlur={(e) => onBlurChangeHandler(e)}
            disabled={isRowDisabled}
            {...props.cellData}
            roundOffTo={roundOffTo}
            isCellLockable={item.is_lockable}
            handleCellLock={handleCellLock}
          ></InputCell>
        );
      case "float":
        return (
          <InputCell
            type="number"
            inputType="float"
            onInputChange={(e) => handleChange(e)}
            onBlur={(e) => onBlurChangeHandler(e)}
            disabled={isRowDisabled}
            {...props?.cellData}
            className={classes.textField}
            roundOffTo={roundOffTo}
            isCellLockable={item.is_lockable}
            handleCellLock={handleCellLock}
          ></InputCell>
        );
      case "dollar":
        return (
          <InputCell
            type={
              item?.typeFormat || item?.extra?.typeFormat
                ? item?.typeFormat || item?.extra?.typeFormat
                : "number"
            }
            inputType="dollar"
            onInputChange={(value, type) => handleChange(value, type)}
            disabled={isRowDisabled}
            {...props?.cellData}
            className={classes.textField}
            roundOffTo={roundOffTo}
            isCellLockable={item.is_lockable}
            handleCellLock={handleCellLock}
            onBlur={(e) => onBlurChangeHandler(e)}
          ></InputCell>
        );
      case "delete_icon":
        return (
          (!props?.column?.extra?.showDeleteIcon ||
            (props?.column?.extra?.showDeleteIcon &&
              props?.cellData?.node?.data?.[
                props?.column?.extra?.showDeleteIcon
              ])) && (
            <div>
              <DeleteCell
                field={"uniqueID"}
                onDeleteClick={() => callDeleteApi(props?.cellData)}
                {...props?.cellData}
                isDeleteDisabled={isDeleteDisabled}
              ></DeleteCell>
            </div>
          )
        );
      case "edit_icon":
        return (
          (!props?.column?.extra?.showEditIcon ||
            (props?.column?.extra?.showEditIcon &&
              props?.cellData?.node?.data?.[
                props?.column?.extra?.showEditIcon
              ])) && (
            <EditCell
              onEditClick={onEditClick}
              {...props?.cellData}
              isEditDisabled={isEditDisabled}
            ></EditCell>
          )
        );
      case "review_icon":
        return props.cellData?.data?.l3_name !== "Total" ? (
          <ReviewCell
            onReviewClick={onReviewClick}
            {...props?.cellData}
          ></ReviewCell>
        ) : null;
      case "review_btn":
        return (
          <ReviewButtonCell
            onReviewClick={onReviewClick}
            {...props?.cellData}
            {...item}
            btnVariant={btnVariant}
          ></ReviewButtonCell>
        );
      case "chart_icon":
        return (
          <div>
            <ChartCell
              title={item.label}
              onChartClick={() => onChartClick(props.cellData)}
              {...props?.cellData}
            />
          </div>
        );
      case "lockable":
        return <LockableCell props={props} />;
      case "percent_range":
        return (
          <div>
            {value || ""} {value ? "%" : ""}
          </div>
        );
      case "formatted_number":
        return <div>{Number(value)?.toFixed(2) || ""}</div>;
      case "add_icon":
        return (
          <CalendarCell
            onApplyCalendarDates={onApplyCalendarDates}
            {...props?.cellData}
          />
        );
      case "DateTimeField":
      case "dateStr": {
        let dateString = "-";
        if (moment(value).isValid()) {
          dateString = moment
            .utc(value)
            // .tz(props.tenantTimeZone)
            .format(props.tenantDateFormat);
        }
        return <div className={classes.textField}>{dateString}</div>;
      }
      case "download_icon":
        return (
          <DownloadCell
            onDownloadClick={onDownloadClick}
            {...props?.cellData}
          />
        );
      case "multiple_daterangepicker":
        return (
          <MultipleDateRangePicker
            onCellValueChanged={handleMultiDateChange}
            {...props?.cellData}
          />
        );
      case "image":
        return <ImageCell {...props?.cellData} />;
      case "rangeSlider":
        return (
          <RangeSlider
            onRangeSliderChange={(value) =>
              onRangeSliderChange(value, props.cellData)
            }
            {...props?.cellData}
          />
        );
      default:
        return <div className={classes.textField}>{value || ""}</div>;
    }
  };
  return <>{renderForm(props.column)}</>;
};
const mapStateToProps = (state) => {
  return {
    tenantDateFormat:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .tenantDateFormat,
    tenantTimeZone:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantTimeZone,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});
export default connect(mapStateToProps, mapDispatchToProps)(CellRenderers);
