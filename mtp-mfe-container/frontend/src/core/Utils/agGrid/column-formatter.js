import "ag-grid-enterprise";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { NUMERIC_FIELDS, START_DATE, END_DATE } from "config/constants";
import {
  nonEditableCell,
  generateHeader,
  getTranslatedLabel,
  formatDecimalNumber,
  reduceTextFilterOptions,
  getNestedTableData,
  getDateFormat,
} from "./table-functions";
import moment from "moment";
import CellRenderers from "./cellRenderer";
import {
  columnActionTypes,
  actionTypesToNotEdit,
  DEFAULT_ROUNDOFF,
  textFilterOptions,
  dateTypeColumns,
} from "./constants";
import {
  decimalsFormatter,
  formattedDate,
  numbersWithComma,
  setAllLabelFormatter,
} from "core/Utils/formatter/index";
import { isFunction, get, isNil, isEmpty, isUndefined } from "lodash";
import { STORE_INVENTORY_LINK_COLUMNS_RIGHT_ALIGNED } from "core/Utils/utils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { isValidDate } from "core/Utils/functions/helpers/validation-helpers";
import OverflowTooltip from "./OverflowTooltip";
import { customCompare } from "./table-functions";
import { AG_FORM_END_DATE } from "core/commonComponents/filters/DatePicker/contants";
import commentingColumnFormatter from "./commentingColumnFormatter";
import { lazy , Suspense} from "react";
const HeaderInfoTooltip = lazy(() => import("./column-component/headerInfoTooltip"));

const formatColumns = (
  item,
  levelsJson,
  actions,
  formatSetAllLabel,
  isView,
  index,
  enableCellComment,
  disableFirstChildColumnInSettings,
  enableCellChat,
  noEditableCustomCellRender
) => {
  const originalCellStyle = item.cellStyle;
  const { tenantDateFormat } = getTenantTimeZoneDetails();

  if (!isEmpty(item.extra?.helperText) && item.extra?.showHelperText) {
    item.headerIcons = <Suspense fallback={<></>}>
      <HeaderInfoTooltip  text={item?.extra?.helperText} />
    </Suspense>
  }
  if (item.column_name === "advanced_search") {
    return item;
  }
  if (isView && item.type !== "chart_icon" && item.type !== "image") {
    item.is_editable = false;
    item.editable = false;
  }
  if (
    ["review_btn", "link", "list", "datetime", "date", "DateTimeField"].indexOf(
      item.type
    ) > -1
  ) {
    item.cellClass = `${item.cellClass} cell-vertical-center-align`;
  }
  if (
    ["datetime", "date", "DateTimeField"].indexOf(item.type) > -1 &&
    (item?.is_editable || item?.is_disabled)
  ) {
    item.extra = {
      ...item?.extra,
      minWidth: 256,
    };
    item.width = 256;
    item.minWidth = 256;
    item.suppressSizeToFit = true;
  }
  // Prevent AG Grid from auto-sizing columns with explicit width
  if (item?.extra?.width) {
    item.suppressSizeToFit = true;
    item.width = item?.extra?.width;
  }
  // Disable checkbox in Table Settings if the column has 'disableColumnCheckboxInSettings' flag set to true
  if (item?.extra?.disableColumnCheckboxInSettings) {
    item.disableColumnCheckboxInSettings = true;
  }

  // To set keys for rowgrouping and hide once set from backend
  let l_isMulti = item?.extra?.is_multi;
  let l_commonOptions = item?.extra?.options;
  // Store original label from API response before any modifications
  // Don't overwrite if already set (e.g., from parent component)
  if (!item.originalLabel) {
    item.originalLabel = item.label;
  }
  // adding the label for automation purpose
  item.headerClass = item?.label?.split(" ").join("_");
  item.field = item.column_name;
  item.accessor = item.column_name;
  item.id = item.column_name;
  item.sortable = item.is_sortable ?? true;
  // default sorting for a column, in column config add key defaultSortBy inside extra key
  // possible values: "asc" and "desc"
  item.sort = item?.extra?.defaultSortBy;
  item.disablePast = item?.extra?.disablePast;
  item.headerName = generateHeader(item, levelsJson);
  if (!isEmpty(item?.extra?.translations)) {
    const capturedItem = { ...item };
    item.headerValueGetter = () => getTranslatedLabel(capturedItem);
  }
  // Use pinned value (left/right) from extra if available
  // to set from backend as left or right instead of boolean is_frozen
  item.pinned = item?.extra?.pinned || (item.is_frozen ? "left" : null);
  item.required = item.is_required;
  // this will hide the column from Column Tool Panel
  item.suppressColumnsToolPanel = item?.extra?.hide_from_panel;

  // to turn off resize column
  item.resizable = !item.not_resizable;
  // adding column tooltip
  // item.headerTooltip = item.headerName;

  item.showRangeFilter = item.showRangeFilter
    ? !item.sub_headers?.length && NUMERIC_FIELDS.includes(item.type)
    : false;
  item.filter = true;
  item.columnGroupShow = item?.columnGroupShow || item?.extra?.columnGroupShow; // If you want to show or hide children column irresopective of the attribute being passed to child/ child's extra props
  item.enableColumnExpand =
    item?.enableColumnExpand || item?.extra?.enableColumnExpand;
  // Hiding filters/ filter button for the types primarily
  item.floatingFilter = false;
  item.isSearchable = false;
  item.advanceSearchEnabled = false;
  item.filter = false;
  item.floatingFilterComponentParams = { suppressFilterButton: true };

  if (item?.extra?.hasOwnProperty("headerClass")) {
    item.headerClass = `${item?.headerClass || ""} ${item?.extra?.headerClass}`;
  }
  // To not include search on action columns
  if (item.is_searchable) {
    item.floatingFilter = false;
    item.isSearchable = true;
    item.advanceSearchEnabled = true;
    item.filter = "agTextColumnFilter";
    /* 
      Enabling multi search based on comma separated values on Client side row model.
      AgGrid converts row data and search i/p field data into lower case and checks (Not case sensitive).
      Search list is a list of comma separated values w/o space after comma - data1,data2.
    */
    item.filterParams = {
      filterOptions: reduceTextFilterOptions(
        textFilterOptions.map((option) => option?.value)
      ),
      textCustomComparator: (_filter, value, filterText) => {
        // get array of comma separated values from filterText(input values of search field)
        // value - cell value of a particular column and row
        const filterValues = filterText.split(",");
        if (_filter === "contains") {
          return filterValues.some((filterItem) => {
            const condition =
              filterValues.length > 1
                ? value.includes(filterItem.trim())
                : value.indexOf(filterItem.trim()) >= 0;
            return condition;
          });
        } else {
          return filterValues.some((filterItem) => value === filterItem.trim());
        }
      },
      debounceMs: 1500,
    };
    item.floatingFilterComponentParams = { suppressFilterButton: true }; // to hide the filter icon on columns (beside search bar)
  }

  if (!columnActionTypes.includes(item.type)) {
    if (item.is_sortable || item.disableSortBy === false) {
      // item.headerComponent = SortComponent;
    } else {
      if (!item.headerComponent) item.headerComponent = null;
    }
    if (false && !item.extra?.hideToolTip) {
      item.tooltipValueGetter = (params) => {
        if (params?.colDef?.type === "list") {
          return "";
        }
        if (params?.value) {
          if (Array.isArray(params.value)) {
            let cellVal = params.value
              .map((option) => (option.label ? option.label : option))
              .join(" | ");
            return cellVal;
          } else if (dateTypeColumns.includes(params.colDef?.type)) {
            const { tenantDateFormat } = getTenantTimeZoneDetails();
            return moment(params?.value).format(tenantDateFormat);
          } else {
            let cellValue =
              typeof params.value === "object"
                ? params.value.value
                : params?.value;
            let finalValue = cellValue
              ? replaceSpecialCharacter(cellValue.toString())
              : cellValue;
            return finalValue;
          }
        }
      };
    }
  } else {
    // hiding column menu for action column types
    item.suppressMenu = true;
  }
  if (item.sub_headers?.length) {
    item.setAllLabel = item.Header;
    item.children = item.sub_headers.map((data, index) => {
      // Disable the first child column in Table Settings as it can break the column grouping
      if (disableFirstChildColumnInSettings && index === 0) {
        data.disableColumnCheckboxInSettings = true;
      }
      return formatColumns(
        data,
        levelsJson,
        actions,
        formatSetAllLabel,
        isView
      );
    });
  } else {
    item.setAllLabel = formatSetAllLabel
      ? setAllLabelFormatter(item.accessor)
      : item.Header;
  }
  l_isMulti && (item.is_multi = l_isMulti);
  l_commonOptions && (item.options = l_commonOptions);
  item.min = item?.extra?.min;
  item.max = item?.extra?.max;
  item.dynamicMinKey = item?.extra?.dynamicMinKey;
  item.dynamicMaxKey = item?.extra?.dynamicMaxKey;

  if (item.type === "ToogleField") {
    item.cellStyle = {
      ...item.cellStyle,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    };
  }

  if (item.type === "percentage"){
    item.valueGetter = (params)=>{
      return isUndefined(params?.data?.[params?.column?.colId]) ? "" : params?.data?.[params?.column?.colId]
    }
  }
    if (["int", "percentage", "float", "dollar", "euro"].indexOf(item.type) > -1) {
      item.headerClass = `${item.headerClass} flex-reverse-column`;
      item.cellClass = `${item.cellClass} flex-reverse-cell`;
      // item.cellStyle = { ...item.cellStyle, textAlign: "right" };
      // Adding a tooltip decimal value fixed upto to 4 decimal places for percentage types and to 2 decimal places for int, float, and dollars
      if (false && !item.extra?.hideToolTip) {
        let fixedUpto = item.type === "percentage" ? 4 : 2;
        item.tooltipField = null;
        item.tooltipValueGetter = (params) => {
          //Removing tooltip for empty hyphen values
          if (params.value === "-") return "";

          //Displaying a constant tooltip across a column
          if (item.extra?.hasOwnProperty("staticToolTip")) {
            if (
              (item?.extra?.showNullAsEmpty && params?.value === null) ||
              !item?.extra?.showNullAsEmpty
            ) {
              if (
                item.extra.staticToolTip !== null &&
                item.extra.staticToolTip !== undefined
              ) {
                return item.extra.staticToolTip;
              }
            }
          }

          if (
            item.type === "percentage" &&
            params.colDef?.column_name.includes("ly")
          ) {
            return !Number.isInteger(Number(params.value))
              ? params.value
                ? Number(params.value * 100).toFixed(fixedUpto)
                : 0
              : params.value;
          }
          return !Number.isInteger(Number(params.value))
            ? params.value
              ? Number(params.value).toFixed(fixedUpto)
              : 0
            : params.value;
        };
      }
    }

  const renameColumnName = (columnName) => {
    // Remove ".adjusted" and ".IA" suffix if present to get the base column name
    return columnName?.replace(/\.(adjusted|IA)$/, "");
  };

  const getAdjustedColumnValue = (columnName, params) => {
    // Get the raw column data using the processed column name
    const columnData = params?.data?.[columnName];
    let value = null;
    if (params?.column?.colDef?.type === "trend") {
      value = columnData.current;
      return value;
    } 
    if (params?.column?.colDef?.type === "table-chart" && columnData && typeof columnData === "string") {
        const [averageValue] = columnData.split("|");
        if (averageValue) {
          const numericValue = Number(averageValue);
          return !isNaN(numericValue) ? numericValue : averageValue;
        }
    } 
    if (params?.column?.colDef?.type === "cell-tag" && columnData && typeof columnData === "string") {
      const [data] = columnData.split(",");
      if (data) {
        const numericValue = Number(data);
        return !isNaN(numericValue) ? numericValue : data;
      }
    }

    if (params?.data) {
      if (columnData && typeof columnData === "object") {
        // Handle object format where adjusted value is stored in .adjusted property
        value = columnData.adjusted;
        const numValue = Number(value);
        return isNaN(numValue) ? value : numValue;
      } else {
        value = columnData;
      }
    } else {
      // If no row data exists, return empty string
      value = "";
    }

    return value;
  };
  if (item.is_searchable) {
    // irrespective of type, we can enable range filter by adding {isRangeFilter: true} in extra column in column config.
    // eg., type : link and where cell data is of number (int/float ....)
    if (
      (["int", "percentage", "float", "dollar", "euro"].indexOf(item.type) > -1 ||
        item?.extra?.isRangeFilter) &&
      !item?.extra?.disableRangeFilter //Extra check for number fields if we have to disable range filters
    ) {
      item.floatingFilter = false;
      item.isSearchable = true;
      item.advanceSearchEnabled = true;
      let adjustedColumnName = renameColumnName(item.column_name);
      item.filter = "agNumberColumnFilter";
      item.floatingFilterComponentParams = { suppressFilterButton: false }; // to show the filter icon on columns (beside search bar)
      item.filterParams = {
        filterOptions: [
          "equals",
          "lessThanOrEqual",
          "greaterThanOrEqual",
          "inRange",
        ],
        inRangeInclusive: true,
        suppressAndOrCondition: true, //Disabling AND/OR condition to not allow multiple conditions
        buttons: ["reset", "apply"], //Enabling apply and reset buttons on floating filter
        valueGetter: (params) => {
          if (
            !params?.api?.gridOptionsWrapper?.gridOptions
              ?.noEditableCustomCellRender
          ) {
            let roundOffTo;
            switch (params.column.colDef.formatter) {
              case "roundOff":
                roundOffTo = 0;
                break;
              case "roundOfftoOneDecimals":
                roundOffTo = 1;
                break;
              case "roundOfftoThreeDecimals":
                roundOffTo = 3;
                break;
              default:
                roundOffTo = 2;
                break;
            }
            let value = getAdjustedColumnValue(adjustedColumnName, params);
            params.value = value;
            const formattedValue = decimalsFormatter(params, roundOffTo);
            // Handle special cases or empty values
            if (isEmpty(formattedValue)) {
              return formattedValue;
            }
            // Convert to number, but handle potential NaN results
            const numericValue = Number(formattedValue);
            return isNaN(numericValue) ? formattedValue : numericValue;
          }
          return params?.data?.[item.column_name];
        },
      };
    }

    if (
      ["link"].indexOf(item.type) > -1 &&
      item.formatter === "numbersWithComma"
    ) {
      item.filter = "agNumberColumnFilter";
      item.filterParams = {
        valueFormatter: (params) => Number(params.value),
        inRangeInclusive: true,
      };
    }

    // this is to enable date filter for given searchable date fields
    if (["datetime", "date", "DateTimeField"].indexOf(item.type) > -1) {
      item.floatingFilter = false;
      item.isSearchable = true;
      item.displayFormat =
        item.formatter || localStorage.getItem("tenantDateFormat");
      item.advanceSearchEnabled = true;
      item.filter = "agDateColumnFilter";
      item.floatingFilterComponentParams = { suppressFilterButton: false }; // to show the filter icon on columns (beside search bar)
      item.filterParams = {
        comparator: (filterLocalDateAtMidnight, cellValue) => {
          // function as a validator for the date range
          const dateAsString = moment(cellValue).format("DD/MM/YYYY");
          if (dateAsString == null) return -1;
          const dateParts = dateAsString.split("/");
          const cellDate = new Date(
            Number(dateParts[2]),
            Number(dateParts[1]) - 1,
            Number(dateParts[0])
          );
          if (filterLocalDateAtMidnight.getTime() === cellDate.getTime()) {
            return 0;
          }
          if (cellDate < filterLocalDateAtMidnight) {
            return -1;
          }
          if (cellDate > filterLocalDateAtMidnight) {
            return 1;
          }
          return 0;
        },
        inRangeFloatingFilterDateFormat: "YYYY MM DD",
        filterOptions: [
          "equals",
          "lessThanOrEqual",
          "greaterThanOrEqual",
          "inRange",
        ],
        maxValidYear: AG_FORM_END_DATE.split("-")[0],
        minValidYear: START_DATE.split("-")[0],
        inRangeInclusive: true,
        suppressAndOrCondition: true, //Disabling AND/OR condition to not allow multiple conditions
        buttons: ["reset", "apply"],
      };
      item.comparator = (date1, date2, rowData) => {
        const prototype = Object.getPrototypeOf(rowData.beans.sortController);
        const getSortModelFunction = prototype.getSortModel;
        const sortModel = getSortModelFunction.call(
          rowData.beans.sortController
        );
        const sortOrder = sortModel.find(
          (model) => model.colId === item.column_name
        );

        // Convert inputs to Date objects
        const date1Obj = new Date(date1);
        const date2Obj = new Date(date2);

        // Check if the dates are valid
        const date1Valid =
          !(date1 === null || date1 === undefined) && isValidDate(date1Obj);
        const date2Valid =
          !(date2 === null || date2 === undefined) && isValidDate(date2Obj);

        // Move invalid dates to the bottom
        if (!date1Valid && !date2Valid) return 0; // Both are invalid, considered equal
        if (!date1Valid) return sortOrder?.sort === "desc" ? -1 : 1; // date1 is invalid, move to the bottom
        if (!date2Valid) return sortOrder?.sort === "desc" ? 1 : -1; // date2 is invalid, move to the bottom

        // Both dates are valid, compare their timestamps
        return date1Obj.getTime() - date2Obj.getTime();
      };
      item.valueGetter = (params) => {
        let value = params?.data ? getNestedTableData(params?.data, item?.column_name, item?.label) : "";
        return value === null ||
          value === "" ||
          isNaN(new Date(value).getTime())
          ? null
          : value;
      }
    }
  }

  // Specifically right aligning link columns for certain tables
  if (
    item.type === "link" &&
    STORE_INVENTORY_LINK_COLUMNS_RIGHT_ALIGNED.indexOf(item.column_name) > -1
  ) {
    item.cellStyle = { ...item.cellStyle, textAlign: "right" };
  }

  if (item.is_aggregated) {
    callAGGridAggregateFunc(item);
  }
  if (!item.is_editable) {
    //if the column is not editable
    // console.log("Item TOP", item);
    if (isNil(item?.cellRenderer)) {
      if (index === 1 && enableCellChat) {
        item.cellRenderer = (cellProps) => {
          const newItem = { ...item };
          newItem.originalType = item.type;
          newItem.type = "chat";
          return (
            <CellRenderers
              cellData={cellProps}
              column={newItem}
              actions={actions}
            />
          );
        };
      } else if (enableCellComment) {
        item.cellRenderer = (cellProps) => {
          const newItem = { ...item };

          return (
            <CellRenderers
              cellData={cellProps}
              column={newItem}
              actions={actions}
              nonEditableCell={!item?.is_editable}
            />
          );
        };
      } else {
        item.cellRenderer = (cellProps) => {
          let noEditableCustomCellRender = cellProps?.api?.gridOptionsWrapper
            ?.gridOptions?.noEditableCustomCellRender
            ? cellProps?.api?.gridOptionsWrapper?.gridOptions?.noEditableCustomCellRender(
                cellProps
              )
            : false;
          if (noEditableCustomCellRender) {
            return noEditableCustomCellRender;
          }
          const formattedValue = nonEditableCell(item, null, true)(cellProps);
          // JSX-returning types must not be wrapped — they render their own components
          const jsxTypes = ["keyboard-shortcut", "image", "trend", "table-chart", "progress-bar", "cell-tag", "box-plot"];
          if (jsxTypes.includes(item?.type)) {
            return formattedValue;
          }
          return <OverflowTooltip {...cellProps} value={formattedValue} />;
        };
      }
    }
  } else {
    item.cellClass = `cell-renderer ${item?.cellClass}`;
    if (typeof item.is_editable === "function") {
      item.editable = item.is_editable;
      item.is_editable = item.orig_is_editable;
      delete item.orig_is_editable;
    } else if (actionTypesToNotEdit.includes(item.type)) item.editable = false;
    else {
      item.editable = true;
    }

    // If cell renderer type is list and is searchable enabled, we disable keyboard events
    // This will prevent dropdown closing during copy paste
    //  e.event.keyCode === 9 in else condition - feature - focus the rendered cell (input cell, react select ....) on using Tab key in keyboard.
    if (item.type === "list") {
      item.suppressPaste = true;
      item.suppressKeyboardEvent = (params) => {
        if (
          (params.event.ctrlKey || params.event.metaKey) &&
          params.event.key.toLowerCase() === "v"
        ) {
          return true;
        }
        return false;
      };
    } else {
      item.suppressKeyboardEvent = (e) => {
        //for custom behaviour of "Tab" button
        if (
          e.event.key == "tab" &&
          e?.api?.gridOptionsWrapper?.gridOptions?.customTabFunction
        ) {
          e?.api?.gridOptionsWrapper?.gridOptions?.customTabFunction(
            e?.event,
            e?.column,
            e
          );
          return (
            e.event.type === "keydown" &&
            (e.event.keyCode === 39 ||
              e.event.keyCode === 37 ||
              e.event.keyCode === 9 ||
              e.event.keyCode === 16)
          );
        }

        // Suppress arrow keys and Backspace when an input/textarea is focused
        // so the user can move the cursor within the field instead of
        // AG Grid interpreting them as cell navigation
        const activeEl = document?.activeElement;
        if (
          activeEl &&
          (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") &&
          (e?.event?.key === "ArrowUp" ||
            e?.event?.key === "ArrowDown" ||
            e?.event?.key === "ArrowLeft" ||
            e?.event?.key === "ArrowRight" ||
            e?.event?.key === "Backspace")
        ) {
          return true;
        }

        // Optionally suppress ESC during AG Grid native editing to prevent
        // value revert. Enabled via gridOptions.retainValueOnEscape so
        // products can opt-in without affecting others.
        if (
          e?.event?.key === "Escape" &&
          e?.editing &&
          e?.api?.gridOptionsWrapper?.gridOptions?.retainValueOnEscape
        ) {
          e?.api?.stopEditing(false);
          return true;
        }

        return false; //let default keyboard shortcuts of ag grid work
      };
    }
    // pass in boolean values based on isDecimal, like in nonEditableCell func
    // depends on usecase- to confirm later
    // if (item.type === "int") {
    //   item.disabled = (params) => actions?.[item.column_name]?.(params);
    // }
    if (item.type === "_") {
      item.cellEditor = CellRenderers;
      item.cellEditorPopup = true;
      item.cellEditorParams = (cellProps) => {
        return {
          cellData: cellProps,
          column: item,
        };
      };
    } else {
      // pass function from component if needs params for conditional cellstyle otherwise
      // as a plain object for cellStyle
      if (typeof item.cellStyle !== "function") {
        item.cellStyle = {
          ...item.cellStyle,
        };
      }
      item.cellRenderer = (cellProps, extraProps) => {
        //if the column is editable calling the cellRenderer
        if (
          cellProps?.api?.gridOptionsWrapper?.gridOptions
            ?.chooseCustomCellRenderForPlansmart
        ) {
          return cellProps?.api?.gridOptionsWrapper?.gridOptions?.customCellRenderer(
            cellProps
          );
        }
        let showConditionalCell = cellProps?.api?.gridOptionsWrapper
          ?.gridOptions?.customCellRenderer
          ? cellProps?.api?.gridOptionsWrapper?.gridOptions?.customCellRenderer(
              cellProps,
              item
            )
          : false;
        if (showConditionalCell) {
          return showConditionalCell;
        }
        return (
          <CellRenderers
            cellData={cellProps}
            column={item}
            extraProps={extraProps}
            actions={actions}
          ></CellRenderers>
        );
      };
    }
  }

  if (item?.extra?.infiniteScrollingLoader) {
    item.cellRenderer = (props) => {
      if (props.value !== undefined) {
        return props.data?.[item?.column_name];
      } else {
        return <img src="https://www.ag-grid.com/example-assets/loading.gif" />;
      }
    };
  }
  //Setting Width for DaterangePicker Cell
  if (item.type === "daterangepicker") {
    item.extra = {
      ...item?.extra,
      width: 300,
    };
  }

  // made this change to keep the number columns narrower
  if (["int", "float", "dollar", "percentage", "euro"].includes(item.type)) {
    if (item.extra?.overrideWidth) {
      //Passing custom width value received from col config if present else setting to default width - 100
      const colWidth = item.extra?.overrideWidth;
      item.extra = {
        ...item?.extra,
        width: colWidth,
      };
    }
    // adding suppressSizeToFit so width doesnt increase on column size to fit
    if (!item?.extra?.ignoreSuppressSizeToFit) {
      item.suppressSizeToFit = true;
    }
  }
  if (
    ["int", "dollar", "euro"].includes(item.type) &&
    !item?.extra?.ignoreValueGetter
  ) {
    item.valueGetter = (params) => {
      if (
        !params?.api?.gridOptionsWrapper?.gridOptions
          ?.noEditableCustomCellRender
      ) {
        let noOfDecimalDigit =
          item.formatter === "roundOfftoTwoDecimals" ? 2 : DEFAULT_ROUNDOFF;
        noOfDecimalDigit =
          item.formatter === "roundOfftoThreeDecimals" ? 3 : noOfDecimalDigit;

        let value = params.data ? params.data[item.column_name] : "";
        let finalValue = formatDecimalNumber(value, noOfDecimalDigit);

        if (isNaN(parseInt(finalValue))) {
          //Displaying null values as -
          if (item.extra?.isHyphenDisplayedForEmpty) {
            return "-";
          }
          return "";
        }

        return item.type === "int" ? parseInt(finalValue) : finalValue;
      }
      return params?.data?.[item.column_name];
    };
  }
  if (["float"].includes(item.type) && !item?.extra?.ignoreValueGetter) {
    let adjustedColumnName = renameColumnName(item.column_name);
    item.valueGetter = (params) => {
      if (
        !params?.api?.gridOptionsWrapper?.gridOptions
          ?.noEditableCustomCellRender
      ) {
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
        let value = getAdjustedColumnValue(adjustedColumnName, params);
        params.value = value;
        const formattedValue = decimalsFormatter(params, roundOffTo);
        // Handle special cases or empty values
        if (
          formattedValue === "" ||
          formattedValue === null ||
          formattedValue === undefined
        ) {
          return formattedValue;
        }
        // Convert to number, but handle potential NaN results
        const numericValue = Number(formattedValue);
        return isNaN(numericValue) ? formattedValue : numericValue;
      }
      return params?.data?.[item.column_name];
    };
  }

  // if (
  //   !item.is_editable &&
  //   ["datetime", "dateStr", "DateTimeField", "date"].indexOf(item.type) > -1
  // ) {
  //   item.valueGetter = (params) => {
  //     let cellValue =
  //       params?.data && item?.column_name
  //         ? getNestedTableData(params.data, item.column_name, item.label)
  //         : "";
  //     return formattedDate(cellValue, getDateFormat(item));
  //   };
  // }

  if ((!item.is_editable && item.type === "str") || item.type === "link") {
    item.valueGetter = (params) => {
      if (params?.data) {
        let cellValue =
          params?.data && item?.column_name
            ? getNestedTableData(params.data, item.column_name, item.label)
            : "";
        let finalValue = cellValue;
        if (
          item?.formatter &&
          item.formatter === "numbersWithComma" &&
          item.type === "link"
        ) {
          if (params?.data) {
            finalValue = finalValue
              ? numbersWithComma({ value: finalValue }, 0, true)
              : finalValue;
          }
        } else {
          finalValue = finalValue
            ? replaceSpecialCharacter(cellValue.toString())
            : cellValue;
        }
        if (isNil(finalValue) || finalValue === "") {
          if (item.extra?.isHyphenDisplayedForEmpty) {
            return "-";
          }
          return "";
        }
        return finalValue;
      }
    };
    if (
      item?.type === "str" &&
      item?.cellRenderer !== "agGroupCellRenderer" &&
      !noEditableCustomCellRender
    ) {
      item.cellRenderer = (params) => {
        return <OverflowTooltip {...params} />;
      };
    }
  }

  if (typeof originalCellStyle === "function") {
    item.cellStyle = (params) => {
      return {
        ...item.cellStyle,
        ...originalCellStyle(params),
      };
    };
  }

  //This custom comparator will override the exisiting aggrid's sort function
  //Existing aggrid sort function is sorting by first all caps and then lower case letters
  //are being sorted. To avoid this, we are using localCompare function for strings
  //If it is not string, we use normal relational operator comparision
  item.comparator = (a, b, nodeA, nodeB, isInverted) =>
    typeof a === "string" && typeof b === "string" && isNaN(+a) && a != "-" && b != "-"
      ? a.localeCompare(b)
      : customCompare(a, b, nodeA, nodeB, isInverted);

  if (item.type === "trend") {
    let adjustedColumnName = renameColumnName(item.column_name);
    item.headerClass = `${item.headerClass} flex-reverse-column`;
    item.comparator = (value1, value2, rowData) => {
      return customCompare(value1.current, value2.current);
    };
    item.filterParams = {
      filterOptions: [
        "equals",
        "lessThanOrEqual",
        "greaterThanOrEqual",
        "inRange",
      ],
      inRangeInclusive: true,
      suppressAndOrCondition: true, //Disabling AND/OR condition to not allow multiple conditions
      buttons: ["reset", "apply"], //Enabling apply and reset buttons on floating filter
      valueGetter: (params) => {
        if (
          !params?.api?.gridOptionsWrapper?.gridOptions
            ?.noEditableCustomCellRender
        ) {
          let roundOffTo;
          switch (params.column.colDef.formatter) {
            case "roundOff":
              roundOffTo = 0;
              break;
            case "roundOfftoOneDecimals":
              roundOffTo = 1;
              break;
            case "roundOfftoThreeDecimals":
              roundOffTo = 3;
              break;
            default:
              roundOffTo = 2;
              break;
          }
          let value = getAdjustedColumnValue(adjustedColumnName, params);
          params.value = value;
          const formattedValue = decimalsFormatter(params, roundOffTo);
          // Handle special cases or empty values
          if (isEmpty(formattedValue)) {
            return formattedValue;
          }
          // Convert to number, but handle potential NaN results
          const numericValue = Number(formattedValue);
          return isNaN(numericValue) ? formattedValue : numericValue;
        }
        return params?.data?.[item.column_name];
      },
    };
  }
  if (item.type === "table-chart") {
    let adjustedColumnName = renameColumnName(item.column_name);
    item.comparator = (value1, value2) => {
      const extractAverageValue = (value) => {
        if (!value || typeof value !== "string") return null;
        try {
          const [averageValue] = value.split("|");
          return averageValue ? Number(averageValue) : null;
        } catch (error) {
          return null;
        }
      };
      const avgValue1 = extractAverageValue(value1);
      const avgValue2 = extractAverageValue(value2);
      return customCompare(avgValue1, avgValue2);
    };
    
    item.filterParams = {
      filterOptions: ["equals", "lessThanOrEqual", "greaterThanOrEqual", "inRange"],
      inRangeInclusive: true,
      suppressAndOrCondition: true,
      buttons: ["reset", "apply"],
      valueGetter: (params) => {
        if (!params?.api?.gridOptionsWrapper?.gridOptions?.noEditableCustomCellRender) {
          return getAdjustedColumnValue(adjustedColumnName, params);
        }
        return params?.data?.[adjustedColumnName];
      }
    };
  }
  
  if (item.type === "cell-tag") {
    let adjustedColumnName = renameColumnName(item.column_name);
    item.comparator = (value1, value2) => {
      const extractFirstValue = (value) => {
        if (!value || typeof value !== "string") return null;
        
        try {
          const [data] = value.split(",");
          const numericValue = Number(data);
          return !isNaN(numericValue) ? numericValue : data;
        } catch (error) {
          return null;
        }
      };
      
      const firstValue1 = extractFirstValue(value1);
      const firstValue2 = extractFirstValue(value2);
      
      return customCompare(firstValue1, firstValue2);
    };
    
    item.filterParams = {
      filterOptions: ["equals", "contains", "notContains", "startsWith", "endsWith"],
      suppressAndOrCondition: true,
      buttons: ["reset", "apply"],
      valueGetter: (params) => {
        if (!params?.api?.gridOptionsWrapper?.gridOptions?.noEditableCustomCellRender) {
          return getAdjustedColumnValue(adjustedColumnName, params);
        }
        return params?.data?.[adjustedColumnName];
      }
    };
  }
   // align right if the column.extra has rightAlign true.
  if (item?.extra?.rightAlign) {
    item.cellStyle = { ...item?.cellStyle, textAlign: "right" };
    item.headerClass = `${item?.headerClass || ""} number-cell`;
  }

  return item;
};

const callAGGridAggregateFunc = (item) => {
  const aggregator = {
    average: () => {
      item.aggFunc = (params) => {
        // the average will be the sum / count
        let sum = 0;
        let count = 0;
        let avg = null;
        params.values.forEach((value) => {
          if (value !== undefined && value !== null) {
            // to Int or float as table values are interpreted as strigs.
            // avg and sum are done oly on columns with numbers hence float and integer type would do
            let num = Number.isInteger(value)
              ? parseInt(value)
              : parseFloat(value);
            sum += num;
            count++;
          }
        });
        // avoid dividing by 0
        if (count !== 0) {
          avg = sum / count;
        }
        return avg;
      };
    },
    sum: () => {
      item.aggFunc = (params) => {
        let sum = 0;
        params.values.forEach((value) => {
          if (value !== undefined && value !== null) {
            let num = Number.isInteger(value)
              ? parseInt(value)
              : parseFloat(value);
            sum += num;
          }
        });
        return sum;
      };
    },
    count: () => {
      item.aggFunc = (params) => {
        let count = 0;
        params.values.forEach((value) => {
          if (value !== undefined && value !== null) {
            count++;
          }
        });
        return count;
      };
    },
    custom: () => {
      item.aggFunc = (params) => {
        return (
          get(
            params,
            "api.gridOptionsWrapper.gridOptions.customAggFunction",
            () => {}
          )(params) || ""
        );
      };
    },
  };

  if (isFunction(aggregator[item.aggregate_type])) {
    aggregator[item.aggregate_type]();
  }
};

export default function agGridColumnFormatter(
  data,
  levelsJson,
  actions,
  formatSetAllLabel,
  hideValueGetter,
  isView = false,
  enableCellComment = false,
  disableFirstChildColumnInSettings = false,
  enableCellChat = false,
  noEditableCustomCellRender = false
) {
  if (!data) return data;

  const filteredColumns = data?.filter((item, index) => {
    if (!item.special_field) {
      formatColumns(
        item,
        levelsJson,
        actions,
        formatSetAllLabel,
        isView,
        index,
        enableCellComment,
        disableFirstChildColumnInSettings,
        enableCellChat,
        noEditableCustomCellRender
      );
      if (item?.columns) {
        item.columns = item.columns.map((innerItem) =>
          formatColumns(
            innerItem,
            levelsJson,
            actions,
            formatSetAllLabel,
            isView,
            index,
            enableCellComment,
            disableFirstChildColumnInSettings,
            enableCellChat,
            noEditableCustomCellRender
          )
        );
      }
      return item;
    }
    return false;
  });

  if (enableCellChat) {
    return commentingColumnFormatter(
      filteredColumns,
      actions,
      enableCellChat,
      enableCellComment
    );
  }

  return filteredColumns;
}
