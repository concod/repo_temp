import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import makeStyles from "@mui/styles/makeStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { END_DATE, START_DATE } from "config/constants";
import { Checkbox, DatePicker, Button, Switch, Tooltip as ImpactTooltip } from "impact-ui-v3";
import moment from "moment-timezone";
import { useEffect, useState, useRef } from "react";
import { connect, useSelector, useDispatch } from "react-redux";
import ReactSelect from "../select";
import ReviewButtonCell from "./cellsToBeRendered/ReviewButtonCell";
import CalendarCell from "./cellsToBeRendered/calendarCell";
import ChartCell from "./cellsToBeRendered/chartCell";
import DateRangePickerCell from "./cellsToBeRendered/dateRangePickerCell";
import RuleIdWithStatusCell from "./cellsToBeRendered/ruleIdWithStatusCell";
import DeleteCell from "./cellsToBeRendered/deleteCell";
import DownloadCell from "./cellsToBeRendered/downloadCell";
import EditCell from "./cellsToBeRendered/editCell";
import InputCell from "./cellsToBeRendered/inputCell";
import LinkRenderer from "./cellsToBeRendered/linkRenderer";
import LockableCell from "./cellsToBeRendered/lockableCell";
import ReviewCell from "./cellsToBeRendered/reviewCell";
import RangeSlider from "./cellsToBeRendered/rangeSliderCell";
import { DEFAULT_ROUNDOFF } from "./constants";
import MultipleDateRangePicker from "./cellsToBeRendered/multipleDateRangePicker/multipleDateRangePicker";
import CellCommentThread from "./cellComment/cellCommentThread/cellCommentThread";
import ChatIcon from "core/commonComponents/ChatSystem/ChatIcon";
import {
  setActiveTableInfo,
  setThreadPopupInfo,
} from "./cellComment/cell-comment-services";
import CellThreadPeekView from "./cellComment/cellThreadPeekView/cellThreadPeekView";
import InfoIconCell from "./cellsToBeRendered/infoIconCell";
import TagsInput from "./cellsToBeRendered/tagsInputCell";
import BreachStatusCell from "./cellsToBeRendered/breachStatusCell";
import BreachProgressCell from "./cellsToBeRendered/breachProgressCell";
import DateRangeCell from "./cellsToBeRendered/dateRangeCell";
import { isNull, isUndefined, isEmpty } from "lodash";
import { nonEditableCell } from "./table-functions";
import "react-dates/initialize";
import { resetThreadPopupInfo } from "./cellComment/cell-comment-services";

const getDatetimeCellYears = () => {
  const startYear = Number(String(START_DATE).split("-")[0]);
  const endYear = Number(String(END_DATE).split("-")[0]);

  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || startYear > endYear) {
    return null; // let DatePicker fall back to its own default year range
  }

  return Array.from({ length: endYear - startYear + 1 }, (_, index) => ({
    label: String(startYear + index),
    value: String(startYear + index),
  }));
};
import globalStyles from "core/Styles/globalStyles";
import { getSafeDisplayFormat } from "../utils";

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
    padding: "10px",
    verticalAlign: "sub",
  },
  link: {
    cursor: "pointer",
    margin: "1rem",
  },
  linkDisabled: {
    pointerEvents: "none",
    color: theme?.palette?.action?.disabled,
    margin: "1rem",
  },
  disableLinkMargin: {
    margin: "0!important",
  },
  datePicker: {
    width: "100%",
    margin: "1px 0",
    "& .MuiInputBase-input": {
      padding: "10px",
    },
  },
  fullWidth: {
    width: "100%",
  },
  cellWrapper: {
    display: "inline-block",
    width: "100%",
  },
  linkIcon:{
    width: 12,
    AspectRatio:"1/1"
  }
}));

const CellRenderers = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles()
  const {
    value,
    data, // used instead of row
    column,
    colDef,
    wholeData,
    typeFormat,
    // This is a custom function that we supply to our table instance
  } = props.cellData;
  // Extract shouldAutoFocus flag for auto-opening dropdowns
  const shouldAutoFocus = props.shouldAutoFocus || false;

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
  const customFunction =
    props.cellData.api.gridOptionsWrapper.gridOptions.customFunction;
  const onToggleChange =
    props.cellData.api.gridOptionsWrapper.gridOptions.onToggleChange;
  const onCheckBoxChange =
    props.cellData.api.gridOptionsWrapper.gridOptions.onCheckBoxChange;
  const onDownloadClick =
    props.cellData.api.gridOptionsWrapper.gridOptions.onDownloadClick;
  const onRangeSliderChange =
    props.cellData.api.gridOptionsWrapper.gridOptions.onRangeSliderChange;
  const onInfoClick =
    props.cellData.api.gridOptionsWrapper.gridOptions.onInfoClick;
  const onDateRangeChange =
    props.cellData.api.gridOptionsWrapper.gridOptions.onDateRangeChange;
  const onExclusionsClick =
    props.cellData.api.gridOptionsWrapper.gridOptions.onExclusionsClick;
  const customDateFormatRequired =
    props.cellData?.context?.customDateFormatRequired || false;
  const activeEditableCell = useSelector(
    (state) => state.tableReducer.activeEditableCell
  );
  const [initValue, setInitValue] = useState(
    column?.colDef?.isMulti && value && Array.isArray(value)
      ? [...value]
      : { value }
  );
  const [initialValue, setInitialValue] = useState();
  const [initialLoad, setInitialLoad] = useState(true);
  const [isChanged, setIsChanged] = useState(false);
  const [previousValue, setPreviousValue] = useState(value);
  const [isExp, setIsExp] = useState(false);
  const [isCommentPresent, setIsCommentPresent] = useState(false);
  const [peekViewData, setPeekViewData] = useState({});
  const {
    threadPopupInfo = { open: false, eventId: null, isPanelRedirect: false },
  } = useSelector((state) => state?.cellCommentReducer ?? {});
  const [isOverflowing, setIsOverflowing] = useState(false);
  const tableName = props?.cellData?.data?.extraData?.tableName;
  const rowId = props?.cellData?.data?.extraData?.uniqueRowId;
  const currentRowId = props?.cellData?.data?.[rowId];
  const tableCommentsData = useSelector(
    (state) => state?.cellCommentReducer?.tableCommentsData?.[tableName]?.[currentRowId]
  );
  const dispatch = useDispatch();
  const onApplyCalendarDates =
    props.cellData.api.gridOptionsWrapper.gridOptions.onApplyCalendarDates;
  const lockCellApi =
    props.cellData.api.gridOptionsWrapper.gridOptions?.lockCellApi;

  const callBackOnChangeCustomFunction =
    props.cellData.api.gridOptionsWrapper.gridOptions
      .callBackOnChangeCustomFunction;
  const cellRef = useRef(null);
  const isChangedRef = useRef(false);
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
      if (column.colDef?.isMulti) {
        let newValue = value.map((opt) => opt.value);
        setInitValue([...newValue]);
        node.setDataValue(colId, value);
      } else if (column.colDef?.extra?.isMultiInSubmenu) {
        if (Array.isArray(value)) {
          setInitValue([...value]);
        } else {
          setInitValue(value);
        }
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
      setIsChanged(true);
      isChangedRef.current = true;
      setDropdownValues(cellNode, colId, p_colType, e);
    }
  };

  const handleCustomFunction = () => {
    if (customFunction) {
      customFunction(data, column);
    }
  };

  const onBlurChangeHandler = (e, p_changedValue) => {
    const colId = props.cellData.column.colId;
    // update agGrid instance onBlur if dynamicMinMaxOnBlur is true
    if (p_changedValue != null && p_changedValue != undefined) {
      props.cellData.node.setDataValue(colId, p_changedValue);
    }
    let newVal = isExp ? e : initValue;
    let preValue = value;

    const liveValue = props.cellData.node.data?.[colId];
    const resolvedValue = liveValue !== value ? liveValue : value;

    let val = isExp ? newVal : resolvedValue; // New value
    let initialVal = isExp ? preValue : initialValue; // Old value
    let initVal = isExp ? newVal : resolvedValue;
    if (onBlur) {
      onBlur(
        e,
        data,
        column,
        isChanged || isChangedRef.current,
        val, // previous value
        initialVal, // old Value
        props.cellData,
        initVal, // New value
        previousValue
      );
    }
    isChangedRef.current = false;
    setIsChanged(false);
    setInitialValue(resolvedValue);
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
    let colId = props.cellData.column.colId;
    setInitValue(p_changedValue);
    // this func get's executed when user edits cell with type float
    // p_changedValue is of type string
    // issue: search would not work for updated value in numeric search column
    // solution: casting p_changedValue value from string to number

    props.cellData.node.setDataValue(colId, +p_changedValue);
    setIsChanged(true);
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
    let l_updatedDate = e && l_dateFormat ? moment(e).format(l_dateFormat) : e;
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

  const handleInputChange = (p_changedValue, itemDetails) => {
    setIsChanged(true);
    if(itemDetails?.extra?.typeFormat === "number" && itemDetails?.extra?.noNullInput && p_changedValue === ""){
      p_changedValue = 0;
    }
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
          const formattedLabel = replaceSpecialCharacter(opt.label || opt.name);
          return {
            label: formattedLabel,
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

        if (!rowLevel) {
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
    const [initialDate, setInitialDate] = useState(null);
    const dateState = useRef({
      clearState: null,
      previousDate: null,
    });
    const isRowDisabled = isGridRowDisabled(props.cellData, item);
    useEffect(() => {
      if (activeEditableCell === identifier) {
        const cellBody = props?.cellData?.eGridCell;
        // logic to handle date-picker input
        const datePickerButton = cellBody.querySelector(
          `#datetime-${identifier}-btn`
        );
        datePickerButton?.click(); // Open datepicker popup
        const inputfield = cellBody.querySelector(`#${identifier}`);
        // Checking if the cell contains a type bool renderer i.e. a checkbox
        if (inputfield && inputfield.type === "checkbox") {
          const handleKeyDown = (e) => {
            // Preventing focus change by tab click
            if (e.key === "Tab") {
              e.preventDefault();
            }
            if (e.key === "Enter" && e.shiftKey) {
              inputfield?.click();
              let checked = inputfield?.checked;
              let colId = props?.cellData?.column?.colId;
              setInitValue(checked);
              props.cellData.node.setDataValue(colId, checked);
              if (onCheckBoxChange) {
                onCheckBoxChange(inputfield.checked, data, column);
              }
            }
          };
          cellBody.addEventListener("keydown", handleKeyDown);
          return () => {
            cellBody.removeEventListener("keydown", handleKeyDown);
          };
        }
      }
    }, [activeEditableCell]);
    const identifier = `id-${(
      props?.cellData?.column?.colId +
      props?.cellData?.node?.rowIndex +
      props?.cellData?.api?.gridOptionsWrapper?.domDataKey
    )?.replace(/['"\/\\`~!@#$%^&*()=+{}\[\]|:;<>?,.\t\s]/g, "")}`;
    switch (item.type) {
      case "chat":
        const selectedRows = props.cellData.data || {};
        return (
          <ChatIcon
            column={props.column}
            cellData={props.cellData}
            selectedRowsIDs={selectedRows}
          />
        );
      case "list":
        let options =
          (props?.isPropsOverrideColumnDef ? props?.options : item?.options) ||
          item?.options ||
          props?.options ||
          [];
        
        // Generic sorting logic: Sort selected options to top if sortSelectedToTop flag is enabled
        if (
          column?.colDef?.extra?.sortSelectedToTop && 
          column?.colDef?.isMulti && 
          value && 
          Array.isArray(value) && 
          value.length > 0
        ) {
          const selectedValues = value.map(val => 
            (val?.valueArray?.[0] || val?.value || val)?.toString()
          );
          
          const selected = [];
          const unselected = [];
          
          options.forEach(option => {
            const optionValue = (
              option?.valueArray?.[0] || 
              option?.value || 
              option
            )?.toString();
            if (selectedValues.includes(optionValue)) {
              selected.push(option);
            } else {
              unselected.push(option);
            }
          });
          
          options = [...selected, ...unselected];
        }
        
        return (
          <div style={{ width: "100%" }}>
            <ReactSelect
              onBlur={onBlurChangeHandler}
              name={item.accessor}
              placeholder={column?.colDef?.extra?.placeholder || ""}
              isMulti={item?.isMulti ?? column?.colDef?.isMulti}
              isMultiInSubmenu={column?.colDef?.extra?.isMultiInSubmenu}
              isSearchable={
                column.colDef?.isSearchable ||
                column.colDef?.is_searchable ||
                column.colDef?.extra.dropdownSearchable
              }
              options={options}
              hideToolTip={true}
              value={
                initValue
                  ? (item?.isMulti ?? column.colDef?.isMulti)
                    ? listMultiValueExpression(initValue, options)
                    : options
                        ?.filter((option) => {
                          let selectVal = Array.isArray(initValue)
                            ? initValue[0]
                            : initValue;
                          if (typeof selectVal === String) {
                            selectVal = replaceSpecialCharacter(selectVal);
                          }
                          return (
                            option.value.toString() === selectVal.toString()
                          );
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
              isDisabled={
                props?.isPropsOverrideColumnDef
                  ? props?.isDisabled
                  : isRowDisabled
                    ? isRowDisabled : item.disabledEdit
              }
              disabledEdit={item.disabledEdit}
              instance={props.cellData}
              withPortal
              menuShouldBlockScroll={false}
              column={props?.cellData?.column}
              isAgGridCellRenderer
              isClearable={false}
              autoFocus={shouldAutoFocus}
              menuIsOpen={shouldAutoFocus ? true : undefined}
            />
          </div>
        );
      case "dynamic-list":
        let l_value = data?.[item.accessor];
        if (Array.isArray(l_value)) {
          l_value = l_value.map((opt) => {
            if (!opt) return opt;
            return {
              ...opt,
              label: opt?.label
                ? replaceSpecialCharacter(String(opt.label))
                : "",
            };
          });
        } else if (l_value && typeof l_value === "object") {
          l_value = {
            ...l_value,
            label: l_value?.label
              ? replaceSpecialCharacter(String(l_value.label))
              : "",
          };
        }
        return (
          <div style={{ width: "100%" }}>
            <ReactSelect
              hideToolTip={true}
              onBlur={onBlurChangeHandler}
              placeholder={column?.colDef?.extra?.placeholder || ""}
              customFunction={handleCustomFunction}
              name={item.accessor}
              isMulti={item?.isMulti ?? item.is_multi ?? column.colDef?.isMulti ?? false}
              isSearchable={true}
              options={data?.[item?.extra?.options_column]}
              value={l_value}
              data-testid={`select${item.name}`}
              onChange={(option) =>
                handleDropDown(option, item.type, item.extra)
              }
              isClearable={item?.extra?.is_option_clearable}
              isDisabled={isRowDisabled}
              instance={props.cellData}
              withPortal
              menuShouldBlockScroll={false}
              autoFocus={shouldAutoFocus}
              menuIsOpen={shouldAutoFocus ? true : undefined}
              column={props?.cellData?.column}
              isAgGridCellRenderer
              // isClearable={false}
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
            disabled={
              item?.extra?.allowEditingWhenRowDisabled ? false : isRowDisabled
            }
            compactRowHeight={item?.extra?.rowHeight === "compact"}
            autoFocus={shouldAutoFocus}
            customStartAdornment={props?.customStartAdornment ?? null}
            customPrefixAdornment={props?.customPrefixAdornment ?? null}
            customEndAdornment={props?.customEndAdornment ?? null}
            placeholder={item?.extra?.placeholder}
          />
        );
      case "int":

        let disableInputCell = isRowDisabled;
        if (typeof colDef.editable === "function") {
          disableInputCell =
            disableInputCell || !colDef.editable(props.cellData);
        }
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
                : "number"
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
            className={classes.textField}
            onInputChange={(e) => handleInputChange(e, item)}
            onBlur={(exp, p_changedValue) => {
              onBlurChangeHandler(exp, p_changedValue);
            }}
            {...props?.cellData}
            isCellLockable={item.is_lockable}
            handleCellLock={handleCellLock}
            disabled={disableInputCell}
            //type int shouldn't be used if roundoff value is non zero
            roundOffTo={0}
            compactRowHeight={item?.extra?.rowHeight === "compact"}
            autoFocus={shouldAutoFocus}
            customStartAdornment={props?.customStartAdornment ?? null}
            customPrefixAdornment={props?.customPrefixAdornment ?? null}
            customEndAdornment={props?.customEndAdornment ?? null}
            placeholder={item?.extra?.placeholder}
          />
        );
      case "bool":
        return (
          <span
            className={
              typeof item.customClassName === "function"
                ? item.customClassName(data, item)
                : `${classes.checkbox} cell-bool-renderer`
            }
          >
            <Checkbox
              name={item.accessor}
              variant={item?.variant || "default"}
              checked={value || false}
              disabled={item?.extra?.is_disabled || isRowDisabled}
              onChange={(e) => {
                handleChangeToggle(e);
              }}
              onBlur={onBlurChangeHandler}
              id={identifier}
            />
          </span>
        );
      case "link":
        return (
          <LinkRenderer
            props={props}
            item={item}
            colDef={colDef}
            data={data}
            value={value}
            isRowDisabled={isRowDisabled}
            identifier={identifier}
          />
        );
      case "ToogleField":
        return (
          <Switch
            value={initValue}
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
        useEffect(() => {
          let dateValue = null;
          
          if (!isNull(value) && !isEmpty(value)) {
            if (customDateFormatRequired) {
              dateValue = moment(value, props.tenantDateFormat, true); // Parse with explicit format
            } else {
              dateValue = moment(value);
            }
          } else if (!isUndefined(item?.defautValue) && !isNull(item?.defaultValue)) {
            if (customDateFormatRequired) {
              dateValue = moment(item.defaultValue, props.tenantDateFormat, true); // Parse with explicit format
            } else {
              dateValue = moment(item.defaultValue);
            }
          }
          setInitialDate(dateValue);
          dateState.current.previousDate = dateValue;
        }, [value, item.defaultValue]);
        return (
          <DatePicker
            displayFormat={getSafeDisplayFormat(props.tenantDateFormat)}
            id="date-picker"
            handleDateChange={(e) => {
              setInitialDate(e);
            }}
            onPrimaryButtonClick={(e) => {
              handleChangeDate(initialDate, item);
              dateState.current.previousDate = initialDate;
            }}
            onSecondaryButtonClick={() => {
              setInitialDate(moment(value ? value : item.defaultValue) || null);
              dateState.current.previousDate =
                moment(value ? value : item.defaultValue) || null;
            }}
            onTertiaryButtonClick={() => {
              setInitialDate(null);
              handleChangeDate(null, item);
              dateState.current.clearState = true;
              dateState.current.previousDate = null;
            }}
            onClickOutside={() => {
              if (!dateState.current.clearState) {
                setInitialDate(dateState.current.previousDate);
              }
              dateState.current.clearState = null;
            }}
            placeholder="Select Date"
            selectedDate={initialDate}
            setSelectedDate={(e) => setInitialDate(e)}
            showMonthYearSelect
            withPortal
            isDisabled={isRowDisabled}
            minDate={item?.minDate || START_DATE}
            maxDate={END_DATE}
            customYears={getDatetimeCellYears()}
            isOutsideRange={(day) => {
              return (
                (item.disablePast && day.isBefore(moment(), "day")) ||
                (item.disablePastDynamically &&
                  item.disablePastDynamically(
                    item,
                    value,
                    props.cellData?.data
                  )) ||
                (item.shouldDisableDate && item.shouldDisableDate(day, value))
              );
            }}
            // isAgGridCellRenderer={true} 
          />
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
            compactRowHeight={item?.extra?.rowHeight === "compact"}
            autoFocus={shouldAutoFocus}
            customStartAdornment={props?.customStartAdornment ?? null}
            customPrefixAdornment={props?.customPrefixAdornment ?? null}
            customEndAdornment={props?.customEndAdornment ?? null}
            placeholder={item?.extra?.placeholder}
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
            compactRowHeight={item?.extra?.rowHeight === "compact"}
            autoFocus={shouldAutoFocus}
            customStartAdornment={props?.customStartAdornment ?? null}
            customPrefixAdornment={props?.customPrefixAdornment ?? null}
            customEndAdornment={props?.customEndAdornment ?? null}
            placeholder={item?.extra?.placeholder}
          ></InputCell>
        );
      case "dollar":
      case "euro":
        return (
          <InputCell
            type={
              item?.typeFormat || item?.extra?.typeFormat
                ? item?.typeFormat || item?.extra?.typeFormat
                : "number"
            }
            inputType={item.type === "euro" ? "euro" : "dollar"}
            onInputChange={(value, type) => handleChange(value, type)}
            disabled={isRowDisabled}
            {...props?.cellData}
            className={classes.textField}
            roundOffTo={roundOffTo}
            isCellLockable={item.is_lockable}
            handleCellLock={handleCellLock}
            onBlur={(e) => onBlurChangeHandler(e)}
            compactRowHeight={item?.extra?.rowHeight === "compact"}
            autoFocus={shouldAutoFocus}
            customStartAdornment={props?.customStartAdornment ?? null}
            customPrefixAdornment={props?.customPrefixAdornment ?? null}
            customEndAdornment={props?.customEndAdornment ?? null}
            placeholder={item?.extra?.placeholder}
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
            isOverflowing={isOverflowing}
            {...props?.cellData}
            {...item}
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
            isAgGridCellRenderer={true}
            {...props?.cellData}
          />
        );
      case "rangeSlider":
        return (
          <RangeSlider
            onRangeSliderChange={(value) =>
              onRangeSliderChange(value, props.cellData)
            }
            {...props?.cellData}
          />
        );
      case "info_icon":
        return <InfoIconCell onInfoClick={onInfoClick} {...props.cellData} />;
      case "ruleIdWithStatus":
        return (
          <RuleIdWithStatusCell 
            value={value}
            status={props?.extraProps?.status}
            node={props?.cellData}
          />
        );
      case "dynamic_cell": {
        let type = props?.cellData?.data?.metadata?.datatype;
        if (type === "bool") type = "ToogleField";
        else if (
          type === "str" &&
          props?.cellData?.data?.metadata?.options.length
        ) {
          type = "list";
        } else if (type === "date") type = "datetime";
        else if (
          type === "list" &&
          !props?.cellData?.data?.metadata?.options.length
        )
          type = "tags_input";
        let cellType = {
          ...item,
          type: type,
          isMulti:
            props?.cellData?.data?.metadata?.datatype === "str" &&
            props?.cellData.data.metadata.options.length
              ? false
              : true,
        };
        return renderForm({ ...cellType });
      }
      case "tags_input": {
        return (
          <TagsInput
            handleInputTagChange={handleInputChange}
            // selectedTags={handleSelecetedTags}
            fullWidth
            variant="outlined"
            id="tags"
            tags={props?.cellData?.data?.attribute_value}
          />
        );
      }
      case "breach_status":
        return (
          <BreachStatusCell
            value={value}
            data={data}
            colDef={colDef}
          />
        );
      case "breach_progress":
        return (
          <BreachProgressCell
            value={value}
            colDef={colDef}
          />
        );
      case "status_date_range":
        return (
          <DateRangeCell
            data={data}
            colDef={colDef}
            node={props.cellData.node}
            tenantDateFormat={props.tenantDateFormat}
            onDateRangeChange={onDateRangeChange}
            onExclusionsClick={onExclusionsClick}
            isDisabled={isRowDisabled}
          />
        );
      default:
        return <div className={classes.textField}>{value || ""}</div>;
    }
  };
  useEffect(() => {
    const columnName = props?.column?.column_name;
    if (tableCommentsData) {
      const mergedCommentData = tableCommentsData?.sub_components?.reduce((data, obj) => {
        const [key, value] = Object.entries(obj)[0];
        if (!data[key]) {
          data[key] = { ...value };
        }
        return data;
      }, {});
      if (
        mergedCommentData?.hasOwnProperty(columnName) &&
        mergedCommentData?.[columnName]?.cell_comments?.length > 0
      ) {
        setIsCommentPresent(true);
        setPeekViewData(mergedCommentData[columnName]);
      } else {
        setIsCommentPresent(false);
      }
    }
  }, [tableCommentsData, props?.column?.column_name]);

  useEffect(() => {
    const rowId = props?.cellData?.data?.extraData?.uniqueRowId;
    const columnName = props?.column?.column_name;
    const currentRowId = props?.cellData?.data?.[rowId];
    const cellIdentifier = `${columnName}_${currentRowId}`;
    if (threadPopupInfo.open && threadPopupInfo.open === cellIdentifier) {
      setIsCommentPresent(true);
    }
  }, [threadPopupInfo?.open]);

  // Function to check if cell content is overflowing due to cellSize
  const checkOverflow = () => {
    if (cellRef.current) {
      const overflowing =
        cellRef.current.scrollWidth > props?.cellData?.eGridCell?.clientWidth;
      setIsOverflowing(overflowing);
    }
  };

  useEffect(() => {
    const gridApi = props?.cellData?.api;
    gridApi?.addEventListener("columnResized", checkOverflow);
    return () => {
      gridApi?.removeEventListener("columnResized", checkOverflow);
    };
  }, [
    props?.cellData?.api,
    props?.cellData?.value,
    props?.cellData?.eGridCell,
  ]);

  return (
    <span
      key={`${isCommentPresent}-${props?.cellData?.rowIndex}-${props?.column?.column_name}`}
      style={{
        maxWidth: isOverflowing
          ? props?.cellData?.eGridCell?.clientWidth - 36
          : "unset",
      }}
      className={classes.cellWrapper}
      ref={cellRef}
    >
      {isCommentPresent ? (
        <span>
          <span className="cell-with-comment">
            {props?.nonEditableCell ? (
              <span className={classes.fullWidth}>
                {nonEditableCell(props.column, null, true)(props?.cellData)}
              </span>
            ) : (
              renderForm(props.column)
            )}
            <Tooltip
              title={
                <span className="comment-peek-view-tooltip">
                  <CellThreadPeekView props={peekViewData} />
                </span>
              }
              placement="right-start"
            >
              <span style={{ position: "absolute", top: 0, right: 0 }}>
                <div
                  className="commentBadge"
                  onClick={(e) => {
                    const rowColumnID = `${props?.column?.column_name}_${
                      props?.cellData?.data?.[
                        props?.cellData?.data?.extraData?.uniqueRowId
                      ]
                    }`;
                    dispatch(
                      setThreadPopupInfo({
                        open: rowColumnID,
                      })
                    );
                    dispatch(
                      setActiveTableInfo({
                        tableName:
                          props?.cellData?.data?.[
                            props?.cellData?.data?.extraData?.tableName
                          ],
                        columnName: props?.column?.column_name,
                        rowId:
                          props?.cellData?.data?.[
                            props?.cellData?.data?.extraData?.uniqueRowId
                          ],
                      })
                    );
                  }}
                ></div>
              </span>
            </Tooltip>
          </span>
          <Popover
            open={
              threadPopupInfo.open ===
              `${props?.column?.column_name}_${
                props?.cellData?.data?.[
                  props?.cellData?.data?.extraData?.uniqueRowId
                ]
              }`
            }
            anchorEl={props?.cellData?.eGridCell}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            PaperProps={{
              className: `cellThreadpopoverWrapper`,
            }}
            onClose={() => {
              dispatch(resetThreadPopupInfo());
              props?.props?.cellData?.api?.setPinnedTopRowData([]);
            }}
          >
            <CellCommentThread
              props={{ props, eventId: peekViewData?.event_id }}
            />
          </Popover>
        </span>
      ) : (
        <>
          {props?.nonEditableCell ? (
            <span className={classes.fullWidth}>
              {nonEditableCell(props.column, null, true)(props?.cellData)}
            </span>
          ) : (
            renderForm(props.column)
          )}
        </>
      )}
    </span>
  );
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
export default connect(mapStateToProps, null)(CellRenderers);
