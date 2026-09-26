import "ag-grid-enterprise";
import "ag-grid-community/dist/styles/ag-grid.css"; // Core grid CSS, always needed
import "ag-grid-community/dist/styles/ag-theme-alpine.css"; // Optional theme CSS
import { NUMERIC_FIELDS, START_DATE, END_DATE } from "config/constants";
import {
  nonEditableCell,
  generateHeader,
  formatDecimalNumber,
  reduceTextFilterOptions
} from "./table-functions";
import moment from "moment";
import CellRenderers from "./cellRenderer";
import {
  columnActionTypes,
  actionTypesToNotEdit,
  DEFAULT_ROUNDOFF,
  textFilterOptions,
  dateTypeColumns
} from "./constants";
import {
  decimalsFormatter,
  numbersWithComma,
  setAllLabelFormatter
} from "core/Utils/formatter/index";
import { isFunction, get, isNil } from "lodash";
import { STORE_INVENTORY_LINK_COLUMNS_RIGHT_ALIGNED } from "core/Utils/utils";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

const formatColumns = (
  item,
  levelsJson,
  actions,
  formatSetAllLabel,
  isView
) => {
  const originalCellStyle = item.cellStyle;

  if (item.column_name === "advanced_search") {
    return item;
  }
  if (isView && item.type !== "chart_icon" && item.type !== "image") {
    item.is_editable = false;
    item.editable = false;
  }
  // To set keys for rowgrouping and hide once set from backend
  let l_isMulti = item?.extra?.is_multi;
  let l_commonOptions = item?.extra?.options;
  // adding the label for automation purpose
  item.headerClass = item?.label?.split(" ").join("_");
  item.field = item.column_name;
  item.accessor = item.column_name;
  item.id = item.column_name;
  // default sorting for a column, in column config add key defaultSortBy inside extra key
  // possible values: "asc" and "desc"
  item.sort = item?.extra?.defaultSortBy;
  item.disablePast = item?.extra?.disablePast;
  item.headerName = generateHeader(item, levelsJson);
  // to set from backend as left or right instead of boolean is_frozen
  item.pinned = item.is_frozen ? "left" : null;
  item.required = item.is_required;
  // this will hide the column from
  item.suppressColumnsToolPanel = item?.extra?.hide_from_panel;

  // to turn off resize column
  item.resizable = !item.not_resizable;
  // adding column tooltip
  item.headerTooltip = item.headerName;

  item.showRangeFilter = item.showRangeFilter
    ? !item.sub_headers?.length && NUMERIC_FIELDS.includes(item.type)
    : false;
  item.filter = true;

  item.columnGroupShow = item?.columnGroupShow || item?.extra?.columnGroupShow; // If you want to show or hide children column irresopective of the attribute being passed to child/ child's extra props
  item.enableColumnExpand =
    item?.enableColumnExpand || item?.extra?.enableColumnExpand;

  // Hiding filters/ filter button for the types primarily
  item.floatingFilter = false;
  item.filter = false;
  item.floatingFilterComponentParams = { suppressFilterButton: true };

  // To not include search on action columns
  if (item.is_searchable) {
    item.floatingFilter = true;
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
      debounceMs: 1500
    };
    item.floatingFilterComponentParams = { suppressFilterButton: true }; // to hide the filter icon on columns (beside search bar)
  }

  if (!columnActionTypes.includes(item.type)) {
    if (item.is_sortable || item.disableSortBy === false) {
      // item.headerComponent = SortComponent;
    } else {
      if (!item.headerComponent) item.headerComponent = null;
    }
    if (!item.extra?.hideToolTip) {
      item.tooltipValueGetter = (params) => {
        //TO-DO: Confirm with core on this requirement
        // if (params?.colDef?.type === "list") {
        //   return "";
        // }
        if (params?.value) {
          if (Array.isArray(params.value)) {
            let cellVal = params.value
              .map((option) => (option.label ? option.label : option))
              .join(" | ");
            return cellVal;
          } else if (dateTypeColumns.includes(params.colDef?.type)) {
            const {
              tenantDateFormat,
              tenantTimeZone
            } = getTenantTimeZoneDetails();
            if (params?.colDef?.extra?.useUnformattedDateTime) {
              const formattedTime = moment
                .tz(`1970-01-01T${params?.value}`, tenantTimeZone)
                .format("h:mm:ss A z");
              return formattedTime;
            } else return moment(params?.value).format(tenantDateFormat);
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
    item.children = item.sub_headers.map((data) => {
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
      alignItems: "center"
    };
  }

  if (["int", "percentage", "float", "dollar"].indexOf(item.type) > -1) {
    item.cellStyle = { ...item.cellStyle, textAlign: "right" };
    // Adding a tooltip decimal value fixed upto to 4 decimal places for percentage types and to 2 decimal places for int, float, and dollars
    if (!item.extra?.hideToolTip) {
      let fixedUpto = item.type === "percentage" ? 4 : 2;
      item.tooltipField = null;
      item.tooltipValueGetter = (params) => {
        //Removing tooltip for empty hyphen values
        if (params.value === "-") return "";

        //Displaying a constant tooltip across a column
        if (item.extra?.hasOwnProperty("staticToolTip")) {
          if (
            item.extra.staticToolTip !== null &&
            item.extra.staticToolTip !== undefined
          ) {
            return item.extra.staticToolTip;
          }
        }
        return !Number.isInteger(Number(params.value))
          ? params.value
            ? Number(params.value).toFixed(fixedUpto)
            : 0
          : params.value;
      };
    }
  }

  // if (["percentage"].indexOf(item.type) > -1) {
  //   if (item.extra?.multiplyBy) {
  //     item.valueFormatter = (params) => Number(params.value) * 100;
  //   }
  // }

  if (item.is_searchable) {
    // irrespective of type, we can enable range filter by adding {isRangeFilter: true} in extra column in column config.
    // eg., type : link and where cell data is of number (int/float ....)
    if (
      (["int", "percentage", "float", "dollar"].indexOf(item.type) > -1 ||
        item?.extra?.isRangeFilter) &&
      !item?.extra?.disableRangeFilter //Extra check for number fields if we have to disable range filters
    ) {
      item.floatingFilter = true;
      item.filter = "agNumberColumnFilter";
      item.floatingFilterComponentParams = { suppressFilterButton: false }; // to show the filter icon on columns (beside search bar)
      item.filterParams = {
        filterOptions: [
          "equals",
          "lessThanOrEqual",
          "greaterThanOrEqual",
          "inRange"
        ],
        inRangeInclusive: true,
        suppressAndOrCondition: true, //Disabling AND/OR condition to not allow multiple conditions
        buttons: ["reset", "apply"] //Enabling apply and reset buttons on floating filter
      };
    }

    // if (["list"].indexOf(item.type) > -1) {
    //   item.filter = agListColumnFilter;
    //   item.filterParams = {
    //     filterOptions: ["equals", "contains"],
    //     buttons: ["reset", "apply"], //Enabling apply and reset buttons on floating filter
    //   };
    // }

    if (
      ["link"].indexOf(item.type) > -1 &&
      item.formatter === "numbersWithComma"
    ) {
      item.filter = "agNumberColumnFilter";
      item.filterParams = {
        valueFormatter: (params) => Number(params.value),
        inRangeInclusive: true
      };
    }

    // this is to enable date filter for given searchable date fields
    if (["datetime", "date", "DateTimeField"].indexOf(item.type) > -1) {
      item.floatingFilter = true;
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
          "inRange"
        ],
        maxValidYear: END_DATE.split("-")[0],
        minValidYear: START_DATE.split("-")[0],
        inRangeInclusive: true,
        suppressAndOrCondition: true, //Disabling AND/OR condition to not allow multiple conditions
        buttons: ["reset", "apply"]
      };
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
    if (isNil(item?.cellRenderer)) {
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
        return nonEditableCell(item, null, true)(cellProps);
      };
    }
  } else {
    if (actionTypesToNotEdit.includes(item.type)) item.editable = false;
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
      };
    } else {
      item.suppressKeyboardEvent = (e) => {
        //for custom behaviour of "Tab" button
        if (
          e.event.key == "Tab" ||
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
          column: item
        };
      };
    } else {
      // pass function from component if needs params for conditional cellstyle otherwise
      // as a plain object for cellStyle
      if (typeof item.cellStyle !== "function") {
        item.cellStyle = {
          ...item.cellStyle
        };
      }
      if (
        isNil(item?.cellRenderer) ||
        (!isNil(actions) && Object.keys(actions).includes(item.column_name))
      ) {
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
      width: 300
    };
  }

  // made this change to keep the number columns narrower
  if (["int", "float", "dollar", "percentage"].includes(item.type)) {
    let colWidth;
    //Check if custom width value is present in Extra key for the editable column
    if (item.is_editable) {
      item.extra = {
        ...item?.extra,
        width: 135
      };
    }
    if (item.extra?.overrideWidth) {
      //Passing custom width value received from col config if present else setting to default width - 100
      colWidth = item.extra?.overrideWidth;
      item.extra = {
        ...item?.extra,
        width: colWidth
      };
    }
    // adding suppressSizeToFit so width doesnt increase on column size to fit
    if (!item?.extra?.ignoreSuppressSizeToFit) {
      item.suppressSizeToFit = true;
    }
  }
  if (
    !actions?.customValueGetter &&
    ["int", "dollar"].includes(item.type) &&
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
      return params.data[item.column_name];
    };
  }
  if (
    !actions?.customValueGetter &&
    ["float"].includes(item.type) &&
    !item?.extra?.ignoreValueGetter
  ) {
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
        let value = params.data ? params.data[item.column_name] : "";
        params.value = value;
        return decimalsFormatter(params, roundOffTo);
      }
      return params.data[item.column_name];
    };
  }

  if (
    (!actions?.customValueGetter && !item.is_editable && item.type === "str") ||
    item.type === "link"
  ) {
    item.valueGetter = (params) => {
      if (params?.data) {
        let cellValue = params?.data ? params?.data?.[item?.column_name] : "";
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
        return finalValue;
      }
    };
  }

  if (actions?.customValueGetter) {
    item.valueGetter = actions.customValueGetter;
  }

  if (typeof originalCellStyle === "function") {
    item.cellStyle = (params) => {
      return {
        ...item.cellStyle,
        ...originalCellStyle(params)
      };
    };
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
    }
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
  isView = false
) {
  return (
    data &&
    data.filter(async (item) => {
      if (!item.special_field) {
        await formatColumns(
          item,
          levelsJson,
          actions,
          formatSetAllLabel,
          isView
        );
        if (item?.columns) {
          item.columns = await Promise.all(
            item.columns.map((innerItem) =>
              formatColumns(
                innerItem,
                levelsJson,
                actions,
                formatSetAllLabel,
                isView
              )
            )
          );
        }
        return item;
      }
    })
  );
}
