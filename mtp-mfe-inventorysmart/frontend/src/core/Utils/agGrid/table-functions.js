import { attributeFormatter } from "core/Utils/utils";
import { getCurrencySymbol } from "core/commonComponents/coreComponentScreen/utils";
import { DEFAULT_ROUNDOFF, levelsArray, cellNonNavigationActions } from "./constants";
import moment from "moment";
import {
  cloneDeep,
  has,
  isArray,
  isObject,
  isString,
  isNil,
  isNull,
  isEmpty,
} from "lodash";
import {
  percentFormatter,
  numbersWithComma,
  dollarFormatter,
  decimalsFormatter,
  arrayToCommaFormatter,
  formattedDate,
  currencyFormatter,
} from "../formatter";
import {
  DEFAULT_DATE_FORMAT,
  MAX_VALUE,
  MIN_VALUE,
  END_DATE,
  START_DATE,
} from "config/constants";
import { mapDataToLabel } from "core/commonComponents/coreComponentScreen/utils";
import {
  EXCEL_DOWNLOAD_FILTERS_HEADING,
  PINNED_VIEWPORT_THRESHOLD,
  KEYBOARD_NAVIGATION_KEYS,
  dateTypeColumns,
} from "./constants";
import {
  processData,
  replaceSpecialCharacter,
  isNonPrimitiveArray,
} from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { MODIFIER_MAP } from "core/constants/index";
import store from "store";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import ImageCellRenderer from "./cellsToBeRendered/ImageCellRenderer";
import React from "react";
import { SET_EDITABLE_CELL_FOCUS } from "core/actions/types";
import { setColumnSearched } from "core/actions/tableColumnActions";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import SparklineCellRenderer from "core/Utils/customSparkline";
import ProgressBar from "core/Utils/progressbar";
import CellTag from "core/Utils/cellTag";
import CustomBoxPlot from "core/Utils/customBoxPlot";
import colours from "core/Styles/colours";

// const city = ['SYRACUSE', 'MIDDLETOWN', 'ALBANY']
// const channels = ["KAY"]
export const nonFormattingCoulumnHeaders = ["store_id"];
export const numberFormattingDataTypes = ["int", "float", "dollar", "euro"];
export const defaultToolPanelFormat = {
  DEFAULT_NUMBER_FORMAT: "full_no",
  DEFAULT_FONT_SIZE: "medium",
};

const renderColor = (ins, item) => {
  let color = {
    rootElementColor: colours.lighterGrey,
    barColor: colours.brightRoyalBlue,
    badgeColor: "default",
  };
  if (typeof item?.styleProgressBar === "function") {
    color = item.styleProgressBar(ins, item);
  }
  return color;
};

export const getDateFormat = (column) => {
  //getDateFormat function would return the format for the date column
  //It will first check if the format is present from the dateFormatter key
  //Else it will check with the formatter key
  //If not default date format will be passed to the momment format
  if (column?.dateFormatter) {
    return column?.dateFormatter;
  }
  if (column?.formatter) {
    return column?.formatter;
  }
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  return tenantDateFormat || DEFAULT_DATE_FORMAT;
};
export const nonEditableCell = (item, forFooter, shouldRoundOff) => {
  const useStyles = makeStyles((theme) => ({
    keys: {
      height: pxToRem(30),
      minWidth: pxToRem(34),
      border: `${pxToRem(1)} solid #CDCDCD`,
      borderRadius: pxToRem(4),
      padding: `${pxToRem(4)} ${pxToRem(8)}`,
      background:
        "linear-gradient(180deg, rgba(212, 212, 212, 0) 0%, rgba(212, 212, 212, 0.6) 100%)",
    },
    keySeparator: {
      margin: `0 ${pxToRem(4)}`,
    },
    itemContainerKeys: {
      gap: pxToRem(4),
    },
    additionalClass: {
      marginTop: pxToRem(5),
    },
    trendIconUp: {
      color: theme.palette.colours.green500,
      fontSize: "1.25rem",
      minWidth: "1.25rem",
    },
    trendIconDown: {
      color: theme.palette.colours.mediumCarmine,
      fontSize: "1.25rem",
      minWidth: "1.25rem",
    },
    trendIconFlat: {
      color: theme.palette.colours.neutralGrey,
      fontSize: "1.25rem",
      minWidth: "1.25rem",
    },
  }));
  const classes = useStyles();
  const globalClasses = globalStyles();
  //it returns the formatter to cell based on type
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
  switch (item.type) {
    case "percentage":
      return (ins) =>
        percentFormatter(
          ins,
          roundOffTo,
          (forFooter && item.is_editable) ||
            item?.multiplier ||
            item?.extra?.multiplier
            ? true
            : false, //for footer we don't want to multiply it by 100 so passing true
          item?.extra?.displayBlank
        );
    case "int":
      return (ins) =>
        numbersWithComma(
          ins,
          roundOffTo,
          item?.extra?.disableCommaFormatting,
          item?.extra?.displayBlank
        );
    case "float":
      return (ins) =>
        decimalsFormatter(
          ins,
          roundOffTo,
          shouldRoundOff,
          item?.extra?.displayBlank
        );
    case "dollar":
      return (ins) => currencyFormatter(ins, roundOffTo, getCurrencySymbol() || "$");
    case "euro":
      return (ins) => currencyFormatter(ins, roundOffTo, "€");
    case "attribute":
      return (ins) => attributeFormatter(ins.value, false);
    case "bool":
      return (ins) => ins?.value || "";
    case "array":
      return (ins) => arrayToCommaFormatter(ins.value);
    case "date":
    case "datetime":
    case "dateStr":
    case "DateTimeField":
      return (ins) => {
        if (item?.extra?.displayBlank && ins?.value === null) {
          return "";
        } else {
          return formattedDate(ins?.value, getDateFormat(item));
        }
      };
    case "keyboard-shortcut":
      return (ins) => (
        <div
          className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${classes.itemContainerKeys}`}
        >
          {ins?.value?.map((key, keyIndex) => (
            <React.Fragment key={keyIndex}>
              <div
                className={`${globalClasses.centerAlign} ${classes.keys} ${
                  ins?.value?.length === 1 ? classes.additionalClass : ""
                }`}
              >
                {key.trim()}
              </div>
              {keyIndex < ins?.value?.length - 1 && (
                <span className={classes.keySeparator}>+</span>
              )}
            </React.Fragment>
          ))}
        </div>
      );
    case "image":
      return (ins) => ImageCellRenderer(ins, true, true, item.tableConfig, []);
    case "trend":
      return (ins) => {
        // expects value to be an object like { current: 150, previous: 120 }
        const trendData = ins.value || {};
        const currentValue = trendData.current;
        const previousValue = trendData.previous;

        // Helper function to format numbers for display
        const formatValue = (val) => {
          if (isNil(val) || val === "") {
            return null;
          }
          if (typeof val === "number") {
            if (item?.formatter && item.formatter.indexOf("roundOff") > -1) {
              return val.toFixed(roundOffTo);
            }
            return val;
          }
          return val.toString();
        };

        const formattedCurrent = formatValue(currentValue);
        const formattedPrevious = formatValue(previousValue);

        // Case 1: Neither value exists - show "-"
        if (isNil(formattedCurrent) && isNil(formattedPrevious)) {
          return (
            <div
              className={`${globalClasses.layoutAlignEnd} ${globalClasses.verticalAlignCenter} ${globalClasses.fullWidth}`}
            >
              -
            </div>
          );
        }

        // Case 2: Only one value exists - show that single value
        if (isNil(formattedCurrent) || isNil(formattedPrevious)) {
          const singleValue = formattedCurrent || formattedPrevious;
          return (
            <div
              className={`${globalClasses.layoutAlignEnd} ${globalClasses.verticalAlignCenter} ${globalClasses.fullWidth}`}
            >
              {singleValue}
            </div>
          );
        }

        // Case 3: Both values exist - show comparison with trend
        const current = parseFloat(currentValue);
        const previous = parseFloat(previousValue);

        if (isNaN(current) || isNaN(previous)) {
          // If values are not valid numbers, show only current value
          return (
            <div
              className={`${globalClasses.layoutAlignEnd} ${globalClasses.verticalAlignCenter} ${globalClasses.fullWidth}`}
            >
              {formattedCurrent}
            </div>
          );
        }

        // Determine trend direction and styling
        let trendIcon = null;
        let trendIconClass = "";

        if (current > previous) {
          trendIcon = TrendingUpIcon;
          trendIconClass = classes.trendIconUp;
        } else if (current < previous) {
          trendIcon = TrendingDownIcon;
          trendIconClass = classes.trendIconDown;
        } else {
          trendIcon = TrendingFlatIcon;
          trendIconClass = classes.trendIconFlat;
        }

        const TrendIconComponent = trendIcon;

        return (
          <div
            className={`${globalClasses.layoutAlignEnd} ${globalClasses.verticalAlignCenter} ${globalClasses.fullWidth} ${globalClasses.gapHalf}`}
          >
            <span>{formattedPrevious}</span>
            <span className={`${globalClasses.centerAlign} ${trendIconClass}`}>
              <TrendIconComponent fontSize="inherit" />
            </span>
            <span>{formattedCurrent}</span>
          </div>
        );
      };
    case "table-chart":
      // plotType "line", "bar"
      return (ins) => (
          <SparklineCellRenderer plotType={item.extra.plotType} params={ins} />
      );
    case "progress-bar":
      return (ins) => (
          <ProgressBar
            roundOffTo={roundOffTo}
            params={ins}
            color={renderColor(ins, item)}
          />
      );
    case "cell-tag":
      return (ins) => <CellTag params={ins} />;
    case "box-plot":
      return (ins) => <CustomBoxPlot params={ins} />;
    case "list":
      return (ins) => {
        const listValue = ins?.value;
        const toDisplay = (v) => {
          if (isNil(v)) return "";
          const raw = isObject(v) ? (v?.value) : v;
          return replaceSpecialCharacter(String(raw));
        };
        if (Array.isArray(listValue)) return listValue.map(toDisplay).filter(Boolean).join(", ");
        if (isObject(listValue)) return toDisplay(listValue);
        return fetchDefaultValue(ins);
      };
    default:
      return (ins) => {
        // Adding numbersWithComma formatter for str type columns
        if (item.formatter && item.formatter === "numbersWithComma") {
          return numbersWithComma(ins, roundOffTo);
        } else if (ins.value === 0 || ins.value === false || ins.value) {
          return fetchDefaultValue(ins);
        }
        return "";
      };
  }
};

export const fetchDefaultValue = (ins) => {
  // explicitly converting to string to get comma separated values in aggrid table.
  if (isNil(ins?.value)) return "";
  if (Array.isArray(ins.value))
    return ins.value
      .map((item) =>
        !isNil(item) ? replaceSpecialCharacter(item.toString()) : ""
      )
      .toString();
  else if (typeof ins.value === "boolean") return ins.value.toString();
  // to return true or false
  else return ins.value;
};

export const generateHeader = (item, levelsJson) => {
  //For levels column label will be dynamic so fetching it from levels api - eg :- cluster break down component
  item.label = item.label
    ? replaceSpecialCharacter(item.label.toString())
    : item.label;
  if (levelsArray.includes(item.column_name)) {
    return levelsJson?.[item?.column_name] || item.label;
  } else {
    if (item.label === "LY") {
      return levelsJson?.[item.label] || item.label;
    }
    return item.label;
  }
};

/**
 *
 * @param {object} properties
 * @param {table instance} tableRef
 * @returns updated table instance
 * This function appends properties to table instance
 * grid api
 * We need to pass all the properties as an object
 * key - value would be inserted in similar way to grid
 */
export const appendPropertiesToTableInstance = (properties, tableRef) => {
  for (const propertyKey in properties) {
    tableRef.current.api[propertyKey] = properties[propertyKey];
  }
  return tableRef;
};

/**
 *
 * @param {list} columns
 * @param {string} currentColumnName
 * @returns column name with type casting property if present in extra json of column
 */
export const getTypeCastInfoForSearchAndSort = (columns, currentColumnName) => {
  const currentColDef = columns.filter(
    (eachCol) => eachCol.column_name === currentColumnName
  );
  if (currentColDef.length) {
    return currentColDef[0]?.extra?.cast
      ? currentColDef[0]?.extra?.cast
      : currentColumnName;
  }
  return currentColumnName;
};

/**
 *
 * @param {string - unique Identifier} filterKey
 * @param {FilterObject} filterModel
 * @returns rangeBody payload array
 * This functions takes in filterKey and filterModel as arguments and loops in through filterModel
 * to check the type of filter applied ex: equals, lessThanOrEqual, greaterThanOrEqual, InRange
 * Respectively, the rangeBody is prepared, for minVal and maxVal we have used constant values
 */
export const parseRangeBody = (
  filterKey,
  filterModel,
  showSearchModalBtn = false
) => {
  const filterType = filterModel[filterKey].type;
  let toRangeKey = [];
  const isDateType = filterModel[filterKey].filterType === "date";
  const minVal =
    isDateType && filterModel[filterKey].dateFrom
      ? moment(filterModel[filterKey].dateFrom).format("YYYY-MM-DD")
      : filterModel[filterKey].filter;
  const maxVal =
    isDateType && filterModel[filterKey].dateTo
      ? moment(filterModel[filterKey].dateTo).format("YYYY-MM-DD")
      : filterModel[filterKey].filterTo;
  switch (filterType) {
    case "greaterThanOrEqual":
      toRangeKey.push({
        column: filterKey,
        min_val: minVal,
        max_val: isDateType ? END_DATE : MAX_VALUE,
        ...(showSearchModalBtn && { search_type: filterType }),
        ...(isDateType && { type: "date" }),
      });
      break;
    case "lessThanOrEqual":
      toRangeKey.push({
        column: filterKey,
        min_val: isDateType ? START_DATE : MIN_VALUE,
        max_val: minVal,
        ...(showSearchModalBtn && { search_type: filterType }),
        ...(isDateType && { type: "date" }),
      });
      break;
    case "inRange":
      toRangeKey.push({
        column: filterKey,
        min_val: minVal,
        max_val: maxVal,
        ...(showSearchModalBtn && { search_type: filterType }),
        ...(isDateType && { type: "date" }),
      });
      break;
    default:
      toRangeKey.push({
        column: filterKey,
        min_val: minVal,
        max_val: minVal,
        ...(showSearchModalBtn && { search_type: filterType }),
        ...(isDateType && { type: "date" }),
      });
      break;
  }
  return toRangeKey[0];
};

/**
 *
 * @param {any} item_1
 * @param {any} item_2
 * @returns int
 * This function compares two items in relationally and returns
 * the corresponding integer based on the condition
 */
// export const customCompare = (item_1, item_2, nodeA, nodeB, isInverted) => {
//   const isItem1NullOrDash =
//     item_1 === undefined || item_1 === null || item_1 === "-";
//   const isItem2NullOrDash =
//     item_2 === undefined || item_2 === null || item_2 === "-";

//   // Always put null/dash at bottom regardless of sort direction
//   if (isItem1NullOrDash && isItem2NullOrDash) {
//     return 0;
//   } else if (isItem1NullOrDash) {
//     return isInverted ? -1 : 1; // Explicitly handle sort direction
//   } else if (isItem2NullOrDash) {
//     return isInverted ? 1 : -1; // Explicitly handle sort direction
//   } else {
//     const num1 = parseFloat(item_1);
//     const num2 = parseFloat(item_2);

//     if (!isNaN(num1) && !isNaN(num2)) {
//       if (num1 < num2) {
//         return -1; // Sort in ascending order
//       } else if (num1 > num2) {
//         return 1; // Sort in ascending order
//       } else {
//         return 0;
//       }
//     } else {
//       // Handle cases where one or both items are not valid numbers
//       // Compare as strings, treating undefined/null as empty string
//       return String(item_1 ?? "").localeCompare(String(item_2 ?? ""));
//     }
//   }
// };
export const customCompare = (item_1, item_2, nodeA, nodeB, isInverted) => {
  const normalizeValue = (val) => {
    if (val === undefined || val === null || val === "-") {
      return "";
    }
    return val;
  };

  const normalized1 = normalizeValue(item_1);
  const normalized2 = normalizeValue(item_2);

  const num1 = parseFloat(normalized1);
  const num2 = parseFloat(normalized2);

  if (!isNaN(num1) && !isNaN(num2)) {
    // Both are valid numbers
    if (num1 < num2) {
      return -1;
    } else if (num1 > num2) {
      return 1;
    } else {
      return 0;
    }
  } else {
    // Compare as strings (this handles empty strings naturally)
    return String(normalized1).localeCompare(String(normalized2));
  }
};

/**
 *
 * @param {object} params // table instance
 * @returns total width occupied by the visible columns
 */
export const getAllColumnsWidth = (params) => {
  // calculating total width all columns are occupying
  let allColumnsWidth = 0;
  //calculate the width of only displayed columns (not collapsed)
  params?.columnApi?.getAllDisplayedColumns()?.forEach((column) => {
    if (column.visible) {
      allColumnsWidth += column.actualWidth;
    }
  });

  return allColumnsWidth;
};

/**
 *
 * @param {object} params // table instance
 * @returns grid width
 */
export const getGridWidth = (params) => {
  const clientWidth = params.clientWidth
    ? params.clientWidth
    : params?.api?.columnModel?.gridApi?.gridBodyCtrl?.eBodyViewport
        ?.clientWidth;

  return clientWidth;
};

export const autoSizeGridColumns = (params, skipHeader, autoSizeOnlyCustom) => {
  try {
    if (
      params?.columnApi &&
      typeof params.columnApi.autoSizeAllColumns === "function" &&
      !autoSizeOnlyCustom
    ) {
      params.columnApi.autoSizeAllColumns(skipHeader);
    }
    params?.columnApi?.getAllColumns()?.forEach((column) => {
      if (column.colDef?.extra?.width) {
        params.columnApi.setColumnWidth(
          column.colId,
          column.colDef.extra.width
        );
      }
    });
  } catch (error) {
    console.error("Error in autoSizeGridColumns:", error);
  }
};

// Helper function to get the hierarchical top-most parent column ID
export const getTopMostParentID = (column) => {
  let parent = column;
  while (parent.getParent()) {
    parent = parent.getParent();
  }
  return (
    parent?.getColGroupDef?.()?.column_name ||
    column?.getColDef?.()?.column_name ||
    ""
  );
};

/**
 *
 * @param {object} params // table instance
 * @param {boolean} isPinned // is column pinned or not
 * By default column is pinned to left
 */
export const freezeColumn = (
  api,
  columnApi,
  column,
  isPinned,
  displaySnackMessages,
  dispatch,
  t
) => {
  const columnStates = [];

  // Helper function to recursively gather column and all their descendant columns
  const gatherColumns = (col) => {
    columnStates.push({ colId: col.colId, pinned: isPinned });
    if (col?.children) {
      col.children?.forEach(gatherColumns);
    }
  };

  // Start from the top-most parent column based on the provided column
  const topMostParentID = getTopMostParentID(column);
  const columnDefs = api.getColumnDefs();

  // Find the top-most parent column in the definitions and gather all descendants usin gatherColumns helper function
  columnDefs?.forEach((colDef) => {
    if (colDef.accessor === topMostParentID) {
      gatherColumns(colDef);
    }
  });

  let newPinnedColumnsWidth = 0;
  columnStates.forEach((state) => {
    const col = columnApi.getColumn(state.colId);
    if (col && !col.pinned) {
      newPinnedColumnsWidth += col.getActualWidth?.() || 0;
    }
  });

  // Calculate the total width of already pinned columns
  const pinnedLeftColumns = columnApi?.getDisplayedLeftColumns?.();
  const alreadyPinnedColumnsWidth = pinnedLeftColumns?.reduce(
    (totalWidth, column) => {
      return totalWidth + column.getActualWidth();
    },
    0
  );

  //if pinning the column then add the column's width otherwise, subtract the width of the column being unpinned
  const totalPinnedColumnsWidth = isPinned
    ? alreadyPinnedColumnsWidth + newPinnedColumnsWidth
    : alreadyPinnedColumnsWidth - newPinnedColumnsWidth;

  // Get the visible viewport width using the DOM
  const gridElement = api?.gridBodyCtrl?.eBodyViewport;
  const viewportWidth = gridElement?.offsetWidth || 0;

  if (
    isPinned &&
    totalPinnedColumnsWidth > viewportWidth * PINNED_VIEWPORT_THRESHOLD
  ) {
    displaySnackMessages(
      t ? t("snackbarMessages.viewportFullFreeze") : "Viewport full. Unfreeze or resize existing freezed columns to freeze more.",
      "error",
      dispatch
    );
    columnStates.map((state) => {
      state.pinned = null;
    });
  }

  // Apply the gathered column states in a single batch update
  columnApi.applyColumnState({
    state: columnStates,
    // applyOrder: true,  // Uncomment this line to preserve the original order of the columns
  });
};

/**
 *
 * @param {object} params // table instance
 * Remove the extra.width property to make column as auto adjust
 */
export const onColMenuAutoAdjustClick = (params) => {
  let colDefExtra = { ...params.column.colDef.extra };
  delete colDefExtra.width;
  params.column.colDef.extra = colDefExtra;
  params.column.colDef.suppressSizeToFit = false;
  params.columnApi.autoSizeColumn(params.column);
};

/**
 *
 * @param {object} params // table instance
 * Ability to pin/unpin columns based on current state
 */
export const onColMenuFreezeClick = (params, displaySnackMessages, dispatch, t) => {
  const { pinned } = params.column;
  // if column is pinned then unpin, vice-versa
  if (pinned) {
    freezeColumn(
      params.api,
      params.columnApi,
      params.column,
      false,
      displaySnackMessages,
      dispatch,
      t
    );
  } else {
    freezeColumn(
      params.api,
      params.columnApi,
      params.column,
      true,
      displaySnackMessages,
      dispatch,
      t
    );
  }
};

/**
 *
 * @param {object} instance // table instance
 * This event is called when user has dragged a column to,
 * resize, reposition etc.
 */
export const onColumnWidthDrag = (instance) => {
  /**
   * Use target to get the columnId which was dragged,
   * as grid doesnt explicitly send the column
   */
  const colId = instance.target?.parentElement?.attributes["col-id"]?.nodeValue;
  const colAttributes = instance.columnApi.getColumn(colId);
  // if the column has custom width property, then update the extra.width
  if (colAttributes?.colDef?.extra?.width) {
    colAttributes.colDef.extra.width = colAttributes.actualWidth;
  }
};

export const sortFunc = (columnData, sortBy, api) => {
  try {
    const columnApi = api?.gridOptionsWrapper?.gridOptions?.columnApi;
    // applyColumnState - to manually set the sort order for a particular column
    columnApi.applyColumnState({
      state: [{ colId: columnData.colId, sort: sortBy }],
      defaultState: {
        sort: null,
      },
    });
    const rowGroupColumns = columnApi?.getRowGroupColumns();
    const hasRowGrouping = rowGroupColumns?.length > 0;
    const tabelType = api?.getModel()?.getType();
    if (hasRowGrouping && tabelType === "serverSide") {
      api.refreshServerSideStore({ purge: true });
    }
  } catch (error) {
    console.error("sortFunc error", error);
  }
};

// export

// rules for default styling for aggrid rows /columns , please add here the default styling when required
// export const dummyrule1 = (params) => params?.node?.level === 0 &&
//     params?.data?.channel && channels.indexOf(params.data.channel) !== -1 && params?.data?.city && (city.indexOf(params.data.city) !== -1)

// export const dummyColoumnRule1 = (column) => !column.is_editable
export const updateFontSizeOnToolPanel = (fontSizeType) => {
  let fontSize;
  switch (fontSizeType) {
    case "small":
      fontSize = "0.75rem";
      break;
    case "medium":
      fontSize = "0.875rem";
      break;
    case "large":
      fontSize = "1rem";
      break;
    default:
      fontSize = "0.875rem";
  }
  return fontSize;
};

const formatDefaultCase = (cellProps, item) => {
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
export const formatNumber = (num, format, cellprops, item) => {
  if (!num) return "";
  switch (format) {
    case "bil":
      // Nine Zeroes for Billions
      let billionFormat = (Math.abs(Number(num)) / 1.0e9).toFixed(2) + "B";
      return String(billionFormat) === "0.00B" ? "0B" : billionFormat;
    case "mil":
      // Six Zeroes for Millions
      let millionFormat = (Math.abs(Number(num)) / 1.0e6).toFixed(2) + "M";
      return String(millionFormat) === "0.00M" ? "0M" : millionFormat;
    case "thou":
      let thousandFormat = (Math.abs(Number(num)) / 1.0e3).toFixed(2) + "K";
      return String(thousandFormat) === "0.00K" ? "0K" : thousandFormat;
    default:
      return formatDefaultCase(cellprops, item);
  }
};

/**
 *
 * @param {Array} screenFilterConfigDependency - the applied filter dependency of a particular screen is taken as input to fetch filter values
 * @returns - an Object with dimension as its key and an object as it's value i.e in the format -
 * {
 *  value : ["filter 1", "filter 2"],
 *  type: "String"
 * }
 * This is inturn used in the parent component to set filters data in required formate for excel download
 */
export const fetchFilterChipsToDownload = (screenFilterConfigDependency) => {
  if (screenFilterConfigDependency?.length) {
    let chipsDependencyData = cloneDeep(screenFilterConfigDependency)?.map(
      (item) => {
        if (isArray(item.values)) {
          item.values = item.values.map((value) => {
            if (typeof value === "boolean")
              return mapDataToLabel(value.toString().toUpperCase());
            else return mapDataToLabel(value);
          });
        } else item.values = [mapDataToLabel(item.values)];
        return item;
      }
    );
    let setFormatChipsDependencyData = {};
    chipsDependencyData.forEach((item) => {
      if (item.dimension === "product") {
        setExcelDownloadFilterDimensionValue(
          setFormatChipsDependencyData,
          "product",
          item
        );
      } else if (item.dimension === "store") {
        setExcelDownloadFilterDimensionValue(
          setFormatChipsDependencyData,
          "store",
          item
        );
      } else {
        setExcelDownloadFilterDimensionValue(
          setFormatChipsDependencyData,
          "custom",
          item
        );
      }
    });
    return setFormatChipsDependencyData;
  }
};

const setExcelDownloadFilterDimensionValue = (obj, dimension, item) => {
  let cloneItemValues = cloneDeep(item.values);
  // adding space before the beginning of new filter selections for readability in download to indicate a new filter selection
  cloneItemValues[0].value = `  ${cloneItemValues[0].value}`;
  //  If one of the selected filters has more than 10 records , display 1st 10 values with +more
  if (cloneItemValues.length > 10) {
    cloneItemValues = cloneItemValues.slice(0, 11);
    cloneItemValues[cloneItemValues.length - 1] = {
      id: "+more",
      label: "+more",
      value: "+more",
    };
  }
  let rowValue = obj[dimension]?.value
    ? [...obj[dimension]?.value, ...cloneItemValues.map((obj) => obj.value)]
    : cloneItemValues.map((obj) => obj.value);
  rowValue.forEach((item, idx, arr) => {
    arr[idx] = replaceSpecialCharacter(item);
  });
  obj[dimension] = {
    value: rowValue,
    type: "String",
  };
  return obj;
};

export const prependExtraData = (filterDep) => {
  let filtersFormat = [];
  filtersFormat = Object.keys(filterDep).map((item) => {
    return [{ value: item.toUpperCase(), type: "String" }, filterDep[item]];
  });
  
  const currentDate = moment().format(getDateFormat());
  const currentTimestamp = `${currentDate}T${new Date().toISOString().split("T")[1]}`;
  
  return [
    EXCEL_DOWNLOAD_FILTERS_HEADING,
    ...filtersFormat,
    [
      { value: "User id:", type: "String" },
      { value: localStorage.getItem("name"), type: "String" },
      { value: "Date:", type: "String" },
      { value: currentDate, type: "String" },
      { value: "Timestamp:", type: "String" },
      { value: currentTimestamp, type: "String" },
    ],
  ];
};

/**
 *
 * @param {Array} list - to append the additional information on excel download - 
 * i/p format - 
 * [
 *  // row 1
 *  [
 *    {value: "Filters", type: "String"},  // col 1
 *    {value : "100", type: "String"} // col 2
 *  ],
 *  // row 2
 *  [
 *    {value: "User id", type: "String"}, // col 1
 *    {value: "Name 2", type: "String"}  // col 2 
 *  ]
 * ]
 * @returns - array in the format mentioned below
 *[
    [
      { data: { value: "Filters:", type: "String" } },
      { data: { value: "100", type: "String" } },
    ],
    [
      { data: { value: "User id", type: "String" } },
      { data: { value: "Name 2", type: "String" } },
    ],
  ];
 */

export const appendExcelDownloadData = (list) => {
  let additionalExcelContent = list.map((cell, i) => {
    let row = cell.map((item) => {
      if (!item) {
        return {
          data: {
            value: "",
            type: "String",
          },
        };
      } else {
        return {
          data: {
            value:
              item?.type === "String" ? item?.value?.toString() : item?.value,
            type: item?.type ? item?.type : "String",
          },
        };
      }
    });
    return row;
  });
  // The blank array will make a new empty row
  return [[], ...additionalExcelContent, []];
};

export const formatDecimalNumber = (value, noOfDecimalDigit) => {
  if (noOfDecimalDigit) {
    return Number.parseFloat(value).toFixed(noOfDecimalDigit);
  } else {
    return (Math.round(value * 100) / 100).toFixed(0);
  }
};
export const getSelectedRowsForInfiniteRowModel = (
  p_gridInstance,
  p_node = false
) => {
  const l_selectedRowsOrNodes = [];
  p_gridInstance.api?.forEachNode((node) => {
    if (node.isSelected()) {
      l_selectedRowsOrNodes.push(p_node ? node : node.data);
    }
  });
  return l_selectedRowsOrNodes;
};

export const reduceTextFilterOptions = (options) => {
  let coreScreenConfig = localStorage.getItem("coreScreenNames");
  if (coreScreenConfig === "undefined") {
    const state = store.getState();
    const tenantCache = cloneDeep(state?.tenantConfigReducer?.tamAPICache);
    const screenCache = tenantCache?.[3]?.attributeData;
    if (screenCache) {
      const coreScreenCache = processData(screenCache, {
        attribute_name: "core_screen_configuration",
      });
      const coreScreenData = coreScreenCache?.data?.data[0];
      localStorage.setItem("coreScreenNames", JSON.stringify(coreScreenData));
      coreScreenConfig = coreScreenData;
    }
  } else {
    coreScreenConfig = JSON.parse(coreScreenConfig)?.attribute_value;
  }
  let hiddenTextOptions = [];
  if (has(coreScreenConfig, "hideAdvSearchTxtOptions")) {
    hiddenTextOptions = coreScreenConfig["hideAdvSearchTxtOptions"];
  }
  return options.filter((option) => {
    if (isObject(option) && has(option, "value")) {
      return !hiddenTextOptions.includes(option.value);
    }
    if (isString(option)) {
      return !hiddenTextOptions.includes(option);
    }
    return true;
  });
};

export const handleCustomKeyboardShortcuts = (
  params,
  displaySnackMessages,
  updateSearchTabCode,
  dispatchKeyboardTableAction,
  shortcuts,
  activeEditableCell,
  dispatch,
  t
) => {
  const { event, api, columnApi } = params;

  //trigger shortcut only once, if kept pressed
  if (event.repeat) {
    return true;
  }

  if (Boolean(activeEditableCell)) {
    return;
  }

  if (
    document?.activeElement?.tagName === "INPUT" &&
    KEYBOARD_NAVIGATION_KEYS.includes(event?.key)
  ) {
    return;
  }
  if ((event.metaKey || event.ctrlKey) && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault();
  }
  //extract key combination
  const keyCombination = new Set();

  if (event.ctrlKey) keyCombination.add("Ctrl");
  if (event.metaKey) keyCombination.add("Meta");
  if (event.altKey) keyCombination.add("Alt");
  if (event.shiftKey) keyCombination.add("Shift");
  keyCombination.add(
    MODIFIER_MAP[event.code] || event.code?.replace(/^(Key|Digit)/, "")
  );

  const matchedShortcutKey = (shortcuts.current || []).find(
    (s) => Array.isArray(s?.keys) && s.keys.length === keyCombination.size && s.keys.every((k) => keyCombination.has(k))
  )?.action;
  
    if (cellNonNavigationActions.has(matchedShortcutKey)) {
    return true;
  }
  const focusedCell = api?.getFocusedCell();
  const focusedCellRowIndex = focusedCell?.rowIndex;
  const rowCountPerPage = api.paginationGetPageSize();
  const totalRows = api.paginationGetRowCount();

  // Function to focus on a cell in the same row
  const focusCellInRow = (column, colId) => {
    api.ensureColumnVisible(column); // Ensure the column is visible
    api.setFocusedCell(focusedCellRowIndex, colId || column?.getColId()); // Set the focus on the cell
  };

  switch (matchedShortcutKey) {
    case "scrollFullRight":
      // Scroll full right while making the last non-pinned column as visible
      const allColumnsRight = columnApi.getAllColumns(); //get all columns
      const lastVisibleColumn = allColumnsRight[allColumnsRight?.length - 1]; //last visible column

      //check if last column is pinned or not
      if (lastVisibleColumn && !lastVisibleColumn.getColDef().pinned) {
        focusCellInRow(lastVisibleColumn);
      } else {
        const lastNonPinnedColumn =
          allColumnsRight?.reverse().find((col) => !col.getColDef().pinned) ||
          lastVisibleColumn;
        if (lastNonPinnedColumn) {
          focusCellInRow(lastNonPinnedColumn);
        }
      }
      return true;

    case "scrollFullLeft":
      // Scroll full left while making the first non-pinned column as visible and focused
      const allColumnsLeft = columnApi.getAllColumns();
      const firstVisibleColumn = allColumnsLeft?.[0];

      if (firstVisibleColumn && !firstVisibleColumn.getColDef().pinned) {
        focusCellInRow(firstVisibleColumn);
      } else {
        const firstNonPinnedColumn =
          allColumnsLeft?.find((col) => !col.getColDef().pinned) ||
          firstVisibleColumn;
        if (firstNonPinnedColumn) {
          focusCellInRow(firstNonPinnedColumn, firstVisibleColumn?.getColId());
        }
      }
      return true;

    case "nextPage":
      api.paginationGoToNextPage();
      // Get the row index to focus a cell in the new page
      //same row and same column will be kept in focused but incase it exceeds the last row of last page will be focused
      const nextPageStartRowIndex =
        api.paginationGetCurrentPage() * rowCountPerPage;
      let newRightFocusedRowIndex =
        nextPageStartRowIndex + (focusedCellRowIndex % rowCountPerPage);
      newRightFocusedRowIndex = Math.min(
        newRightFocusedRowIndex,
        totalRows - 1
      );

      //focus cell in the new page
      api.setFocusedCell(
        newRightFocusedRowIndex,
        focusedCell?.column.getColId()
      );
      return true;

    case "previousPage":
      api.paginationGoToPreviousPage();
      const prevPageStartRowIndex =
        api.paginationGetCurrentPage() * rowCountPerPage;
      const newLeftFocusedRowIndex =
        prevPageStartRowIndex + (focusedCellRowIndex % rowCountPerPage);

      api.setFocusedCell(
        newLeftFocusedRowIndex,
        focusedCell?.column.getColId()
      );
      return true;

    case "lastPage":
      if (api.paginationIsLastPageFound()) {
        api.paginationGoToLastPage();

        // Get the row index to focus a cell in the new page
        //same row and same column will be kept in focused but incase it exceeds the last row of last page will be focused
        const nextPageStartRowIndex =
          api.paginationGetCurrentPage() * rowCountPerPage;
        let newRightFocusedRowIndex =
          nextPageStartRowIndex + (focusedCellRowIndex % rowCountPerPage);
        newRightFocusedRowIndex = Math.min(
          newRightFocusedRowIndex,
          totalRows - 1
        );

        //focus cell in the new page
        api.setFocusedCell(
          newRightFocusedRowIndex,
          focusedCell?.column.getColId()
        );
      } else {
        displaySnackMessages(t ? t("snackbarMessages.cannotNavigateLastPage") : "Cannot navigate to last page", "warning", dispatch);
      }
      return true;

    case "firstPage":
      api.paginationGoToFirstPage();
      const firstPageStartRowIndex =
        api.paginationGetCurrentPage() * rowCountPerPage;
      const newFirstFocusedRowIndex =
        firstPageStartRowIndex + (focusedCellRowIndex % rowCountPerPage);

      api.setFocusedCell(
        newFirstFocusedRowIndex,
        focusedCell?.column.getColId()
      );
      return true;

    case "clickHyperlinkInCell":
      if (focusedCell?.column?.colDef?.type === "link") {
        // Get the row node using the row index
        const rowNode = params.api.getDisplayedRowAtIndex(focusedCellRowIndex);

        // Get the cell DOM element using document.querySelector
        const cellElement = document.querySelector(
          `.ag-row[row-id="${
            rowNode.id
          }"] .ag-cell[col-id="${focusedCell.column.getColId()}"]`
        );

        // Find the link inside the cell
        const linkElement = cellElement.querySelector("a");

        // If a link is found, simulate a click event on it
        if (linkElement) {
          linkElement.click();
        }
      }
      return true;

    case "openSearch":
      api.showSearch = true;
      updateSearchTabCode(api?.gridOptionsWrapper?.domDataKey, 0);
      return true;

    case "openAdvancedSearch":
      api.showSearch = true;
      updateSearchTabCode(api?.gridOptionsWrapper?.domDataKey, 1);
      return true;

    case "toggleAllRecordsSelection":
      dispatchKeyboardTableAction(
        "perfromShortcutAction",
        {
          selectType: "allRecords",
        },
        api?.gridOptionsWrapper?.domDataKey
      );
      return true;

    case "toggleCurrentPageRecordsSelection":
      dispatchKeyboardTableAction(
        "perfromShortcutAction",
        {
          selectType: "tenRecords",
        },
        api?.gridOptionsWrapper?.domDataKey
      );
      return true;

    default:
      return false; // No matching action found
  }
};

export const getNestedTableData = (data, path, label) => {
  const errorStr = `Invalid table data path for ${label} - ${path}`;

  if (typeof path !== "string" || !path) {
    console.error(errorStr);

    return "";
  }

  const pathArr = path.split(".");
  let currentNode = data;

  for (const pathNode of pathArr) {
    if (currentNode === undefined) {
      console.error(errorStr);

      break;
    }

    currentNode = currentNode[pathNode];
  }

  if (currentNode === undefined) {
    return data[path] !== undefined ? data[path] : "";
  }
  return currentNode;
};

export const handleCellKeydown = (parameter, activeEditableCell, shortcuts, dispatch) => {
  parameter?.event?.stopPropagation();

  const keyCombination = new Set();
  if (parameter.event.metaKey) keyCombination.add("Meta");
  if (parameter.event.ctrlKey) keyCombination.add("Ctrl");
  if (parameter.event.altKey) keyCombination.add("Alt");
  if (parameter.event.shiftKey) keyCombination.add("Shift");
  const key = parameter.event.code === "Space" ? " " : parameter.event.key;
  keyCombination.add(key);
  const matchedAction = Array.isArray(shortcuts)
    ? shortcuts.find(
      (s) => Array.isArray(s?.keys) && s.keys.length === keyCombination.size && s.keys.every((k) => keyCombination.has(k))
    )?.action
    : undefined;

  switch (matchedAction) {
    case "selectEntireRow": {
      parameter.node.setSelected(!parameter.node.selected, false);
      return;
    }
    case "selectEntireColumn": {
      parameter.api.addCellRange({
        columns: [parameter.column.colId],
      });
      return;
    }
    case "expandNestingOneLevel":
    case "collapseNestingOneLevel": {
      const focusedCell = parameter?.api?.getFocusedCell();
      if (!focusedCell) return;
      const rowNode = parameter.api.getDisplayedRowAtIndex(focusedCell.rowIndex);
      if (!rowNode || (!rowNode.group && !rowNode.master)) return;
      toggleGroupExpansion(rowNode, matchedAction === "expandNestingOneLevel", false, parameter.api);
      return;
    }
    case "expandNestingAllChildren":
    case "collapseNestingAllChildren": {
      const focusedCell = parameter?.api?.getFocusedCell();
      if (!focusedCell) return;
      const rowNode = parameter.api.getDisplayedRowAtIndex(focusedCell.rowIndex);
      if (!rowNode || (!rowNode.group && !rowNode.master)) return;
      toggleGroupExpansion(rowNode, matchedAction === "expandNestingAllChildren", true, parameter.api);
      return;
    }
    case "expandEntireNesting":
    case "collapseEntireNesting": {
      const focusedCell = parameter?.api?.getFocusedCell();
      parameter.api.showLoadingOverlay();
      setTimeout(() => {
        matchedAction === "expandEntireNesting" ? parameter.api.expandAll() : parameter.api.collapseAll();
        parameter.api.hideOverlay();
        if (focusedCell) parameter.api.setFocusedCell(focusedCell.rowIndex, focusedCell.column);
      }, 100);
      return;
    }
    case "unlockAllCells": {
      dispatch({
        type: SET_EDITABLE_CELL_FOCUS,
        payload: `unlockAllCellsFor-${parameter?.api?.gridOptionsWrapper?.domDataKey}`,
      });
      return;
    }
    default:
      break;
  }

  if (parameter.colDef.field === "Selection") {
    if (parameter.event.key === "Enter" && parameter.event.shiftKey) {
      parameter.node.setSelected(!parameter.node.selected, false);
    }
    return;
  }

  const cellIdentifier = `id-${parameter?.column?.colId +
    parameter?.node?.rowIndex +
    parameter?.api?.gridOptionsWrapper?.domDataKey
    }`.replace(/['"\/\\`~!@#$%^&*()=+{}\[\]|:;<>?,.\t\s]/g, "");
  // Regex to replace all dots and spaces
  const editableFieldElement = document.querySelector(
    `input#${cellIdentifier}`
  );
  if (parameter.event.key === "Enter" && !parameter.event.__skipCellKeydown) {
    parameter?.event?.preventDefault();
    dispatch({
      type: SET_EDITABLE_CELL_FOCUS,
      payload: cellIdentifier,
    });
  } else if (parameter.event.key === "Escape") {
    parameter?.event?.preventDefault();
    // Trigger blur on the input element to call onBlur handler (updateTableData)
    editableFieldElement.blur();
    dispatch({
      type: SET_EDITABLE_CELL_FOCUS,
      payload: false,
    });
  }
};

export const suppressAgGridKeyboardEvents = (params, activeEditableCell) => {
  const { event } = params;
  /**
   * The following code differs from its counterpart in the MTP-Frontend repo. Since 'Store.getState' doesn't
   * work as expected in a MicroFrontend application, the required state values have been passed in the form of ref values.
   */
  if (activeEditableCell) {
    if (
      (event.metaKey || event.ctrlKey) &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      return true;
    }
  }
  // Suppress the keyboard events when inputfield is in focus
  if (
    document?.activeElement?.tagName === "INPUT" &&
    (KEYBOARD_NAVIGATION_KEYS.includes(event?.key) || event.key === "Backspace")
  ) {
    return true;
  }
  if (event?.key === " ") {
    event.preventDefault();
    return true;
  }
  return false;
};

const toggleGroupExpansion = (rowNode, expand, expandChild, api) => {
  rowNode.setExpanded(expand);
  if (expandChild) {
    if (rowNode.allChildrenCount && rowNode.childrenAfterGroup) {
      api?.showLoadingOverlay();
      setTimeout(() => {
        for (const childNode of rowNode.childrenAfterGroup) {
          toggleGroupExpansion(childNode, expand, expandChild);
        }
        api?.hideOverlay();
      }, 100);
    }
  }
};

export const handleEnableSearch = (column, api, dispatch) => {
  try {
    let coloumnData = column.colDef;
    if (api) {
      api.showSearch = true;
    }
    dispatch(setColumnSearched(coloumnData.accessor));
  } catch (error) {
    console.error("handleEnableSearch error", error);
  }
};

/**
 * Common helper function to extract sorted or sortable columns
 * @param {Array} columns - The column definitions to search through
 * @param {string} sourceType - Either 'activeSort' or 'configSort' to determine source of sort data
 * @returns {Object|null} - The extracted column information or null if none found
 */
export const extractSortColumn = (columns, sourceType = "activeSort") => {
  try {
    if (!columns || !Array.isArray(columns)) return null;

    // Find the first column with sort property based on sourceType
    for (const col of columns) {
      // Check based on sourceType
      if (
        (sourceType === "activeSort" && col.sort != null) ||
        (sourceType === "configSort" && col.extra?.sort_config)
      ) {
        // Return appropriate object based on sourceType
        if (sourceType === "activeSort") {
          return {
            colId: col.colId,
            sort: col.sort,
            sortIndex: col.sortIndex,
            type: col.type,
            label: col.label,
            isSaved: col.extra?.sort_config ? true : false,
          };
        } else {
          return {
            colId: col.colId,
            sort: col.extra?.sort_config[0].sort,
            sortIndex: col.extra?.sort_config[0].sortIndex,
            type: col.extra?.sort_config[0].type,
            label: col.label,
            isSaved: true,
          };
        }
      }

      // Check if column has children and recursively process them
      if (col.children && Array.isArray(col.children)) {
        const childSortedColumn = extractSortColumn(col.children, sourceType);
        if (childSortedColumn) {
          return childSortedColumn;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("extractSortColumn error", error);
    return null;
  }
};

export const onSortChangedHandler = (params, sortConfigRef) => {
  try {
    let colDefs = params.api?.getColumnDefs();

    // Use the common extraction function with 'activeSort' type
    const sortedColumn = extractSortColumn(colDefs, "activeSort");

    // Create an array with the single sorted column if found
    const sortState = sortedColumn ? [sortedColumn] : [];
    sortConfigRef.current = sortState;
    const modelType = params.api?.getModel()?.getType();
    if (modelType === "serverSide") {
      params?.api?.refreshServerSideStore({ purge: true });
    }
  } catch (error) {
    console.error("onSortChangedFunction error:", error);
  }
};

export const populateSortConfig = (params, sortConfigRef, savedSortConfig) => {
  try {
    let colDefs = params.api?.getColumnDefs();

    // Use the common extraction function with 'configSort' type
    const sortableColumn = extractSortColumn(colDefs, "configSort");

    // Create an array with the single sortable column if found
    const sortState = sortableColumn ? [sortableColumn] : [];

    if (sortState.length > 0) {
      sortConfigRef.current = sortState;
      savedSortConfig.current = sortState;
      // Apply the sort state
      params.columnApi.applyColumnState({
        state: sortState,
        defaultState: { sort: null },
      });
    }

    params.api.getSavedSortState = () => {
      return savedSortConfig.current;
    };
    params.api.setSavedSortState = (sortState) => {
      savedSortConfig.current = sortState;
    };
    params.api.getSortState = () => {
      return sortConfigRef.current;
    };
  } catch (err) {
    console.error("populateSortConfig error:", err);
  }
};

export const paginationPageSizeFormatter = (params) => {
  if (params.value === 0) {
    let tableData = [];
    params.api.forEachNode((node, index) => {
      tableData.push(node?.data);
    });
    return isEmpty(tableData) ? params?.value : 1;
  }
  return params?.value;
};

export const checkEnableCellWrap = () => {
  let coreScreenConfig = JSON.parse(localStorage.getItem("coreScreenNames"))
  if (coreScreenConfig) {
    if (coreScreenConfig?.attribute_value?.enableCellWrap?.applications?.includes(window.location.pathname.split("/")[1])) {
      return true;
    }
  }
  return false;
};

//on columnGroup open/close, set the defaultColumnGroupExpand to true/false for the child columns of the column group
//update the column Group's definition with the new openByDefault value
export const columnGroupOpenHandler = (params) => {
  const colId = params.columnGroup?.colGroupDef?.id;
  const isOpen = params.columnGroup?.isExpanded();
  let colDefs = cloneDeep(params.api?.getColumnDefs());
  colDefs = colDefs.map(col => {
    if(col.id === colId){
      col.children = col.children.map(childCol => {
        if(childCol?.extra?.enableColumnExpand){
          childCol.extra.defaultColumnGroupExpand = isOpen;
        }
        return childCol;
      })
      col.openByDefault = isOpen; //ag-grid column group definition for default column group expand
    }
    return col;
  })
  params?.api?.setColumnDefs(colDefs);
};

export function getMaxDepth(columns, level = 1) {
  // To get maximun level of nesting in the table
  let max = level;
  for (const col of columns) {
    const subs = col.sub_headers?.length
      ? col.sub_headers
      : col.children?.length
        ? col.children
        : null;
    if (subs) {
      max = Math.max(max, getMaxDepth(subs, level + 1));
    }
  }
  return max;
}

export function addSpanClasses(columns, level = 1, maxDepth) {
  return columns.map(col => {
    const subCols = col.sub_headers?.length
      ? col.sub_headers
      : col.children?.length
      ? col.children
      : null;
    const hasChildren = !!(subCols && subCols?.length);
    // Parent = span-1, leaf = remaining rows
    const span = hasChildren ? 1 : maxDepth - level + 1;
    const updated = {
      ...col,
      headerClass: `${col.headerClass ? col.headerClass + ' ' : ''}span-${span}`,
    };
    if (hasChildren) {
      const processedSubs = addSpanClasses(subCols, level + 1, maxDepth);
      if (col.sub_headers?.length) updated.sub_headers = processedSubs;
      if (col.children?.length) updated.children = processedSubs;
    }
    return updated;
  });
}

/**
 * @desc Check for filtered rows and show overlay if data not present and also show visual que to users if searched
 * @param {Object} instance
 */
export const getFilteredRows = (instance) => {
  if (!isEmpty(instance.api.getFilterModel())) {
    instance.api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach(
      (button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.add("tp-active");
        }
      }
    );
  } else {
    instance.api?.sideBarComp?.sideBarButtonsComp?.buttonComps?.forEach(
      (button) => {
        if (button.toolPanelDef.id === "table-actions") {
          button.eGui?.classList.remove("tp-active");
        }
      }
    );
  }
  if (!instance?.api?.rowModel?.datasource) {
    if (!instance?.api?.rowModel?.rowsToDisplay?.length) {
      instance.api.showNoRowsOverlay();
    } else {
      instance.api.hideOverlay();
    }
  }
  instance?.api.refreshHeader();
};

export const exportToExcel = (params, deps) => {
  const {
    agGrid,
    processCellCallbackForExcel,
    processCellData,
    toPrependContent,
    prependedContentDetails,
    toAppendContent,
    appendContentDetails,
  } = deps;
  // The issue arises when dropdowns, such as list or dynamic list selections, are present within the table. In the downloaded Excel file, the displayed content becomes "[Object Object]" due to the object data type of items like {"label":"India", "value":"+91"}.
  // To address this, a solution has been implemented by introducing a callback upon clicking the download button. This functionality can be activated by providing the processCellCallbackForExcel prop to the agGrid component. This callback function ensures that dropdown lists are displayed as strings in the Excel file. For single-select dropdowns, it uses the label value, while for multi-select dropdowns, it separates values using pipes (|) as delimiters.
  // For instance:
  // Input: [{label:"India", value:"+91"}, {label:"United States", value: "+1"}]
  // Output: "India | United States" in the Excel file.
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const dateFormat = tenantDateFormat || "YYYY-MM-DD";
  if (processCellCallbackForExcel) {
    agGrid?.api?.exportDataAsExcel({
      columnKeys: agGrid?.columnApi
        ?.getAllGridColumns()
        .filter((item) => item.colId !== "Selection"),
      processCellCallback(params) {
        let l_cellValue = cloneDeep(params.value);
        const columnType = params.column.colDef.type;
        if (dateTypeColumns.includes(columnType)) {
          if (l_cellValue && moment(l_cellValue).isValid()) {
            return moment.utc(l_cellValue).format(dateFormat);
          }
          return l_cellValue;
        }
        if (l_cellValue instanceof moment) {
          return moment(l_cellValue).format(dateFormat);
        } else if (Array.isArray(l_cellValue)) {
          return isNonPrimitiveArray(l_cellValue)
            ? l_cellValue.map((val) => val.label)?.join(" | ")
            : l_cellValue;
        } else if (isObject(l_cellValue)) {
          return l_cellValue.label;
        }
        return l_cellValue;
      },
    });
  } else {
    // Removing the checkbox column from list
    // To do - add condition to ignore action columns on download
    params.columnKeys = agGrid?.columnApi
      ?.getAllGridColumns()
      .filter((item) => item.colId !== "Selection");

    // Add processCellCallback to handle number formatting
    params.processCellCallback = (params) => processCellData(params);

    if (toPrependContent && prependedContentDetails?.length) {
      params.prependContent = prependedContentDetails;
    }
    if (toAppendContent && appendContentDetails?.length) {
      params.appendContent = appendContentDetails;
    }
    agGrid?.api?.exportDataAsExcel(params);
  }
};

export const hideHiddenCols = (cols) => {
  let columns = cols.map((item) => {
    if (!item?.rowGroup) {
      item.hide = item.is_hidden;
    }
    if (item.children?.length) {
      item.children = hideHiddenCols(item.children);
    }
    return item;
  });
  return columns;
};
