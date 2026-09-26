import { attributeFormatter } from "core/Utils/utils";
import { DEFAULT_ROUNDOFF, levelsArray } from "./constants";
import moment from "moment";
import { cloneDeep, has, isArray, isObject, isString } from "lodash";
import {
  percentFormatter,
  numbersWithComma,
  dollarFormatter,
  decimalsFormatter,
  arrayToCommaFormatter,
  formattedDate,
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
} from "./constants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

// const city = ['SYRACUSE', 'MIDDLETOWN', 'ALBANY']
// const channels = ["KAY"]
export const nonFormattingCoulumnHeaders = ["store_id"];
export const numberFormattingDataTypes = ["int", "float"];
export const defaultToolPanelFormat = {
  DEFAULT_NUMBER_FORMAT: "full",
  DEFAULT_FONT_SIZE: "medium",
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
      return (ins) => dollarFormatter(ins, roundOffTo);
    case "attribute":
      return (ins) => attributeFormatter(ins.value, false);
    case "bool":
      return (ins) => ins?.value || "";
    case "array":
      return (ins) => arrayToCommaFormatter(ins.value);
    case "date":
      return (ins) => {
        if (item?.extra?.displayBlank && ins?.value === null) {
          return "";
        } else {
          //currentDateFormat is a current format of the date. 
          //getDateformat is used to fetch the date format in which you want to display the date.
          return formattedDate(ins?.value, getDateFormat(item), item?.extra?.currentDateFormat)
        }
      };
    case "DateTimeField":
      return (ins) => formattedDate(ins.value, getDateFormat(item));
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
  if (Array.isArray(ins.value)) return ins.value.toString();
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
export const customCompare = (item_1, item_2) => {
  if (item_1 === null && item_2 === null) {
    return 0; // Both are null, treat them as equal
  } else if (item_1 === null) {
    return 1; // item_1 is null, move it to the end
  } else if (item_2 === null) {
    return -1; // item_2 is null, move it to the end
  } else {
    const num1 = parseFloat(item_1);
    const num2 = parseFloat(item_2);

    if (!isNaN(num1) && !isNaN(num2)) {
      if (num1 < num2) {
        return -1; // Sort in ascending order
      } else if (num1 > num2) {
        return 1; // Sort in ascending order
      } else {
        return 0;
      }
    } else {
      // Handle cases where one or both items are not valid numbers
      if (isNaN(num1)) {
        return 1; // item_1 is not a valid number, move it to the end
      } else {
        return -1; // item_2 is not a valid number, move it to the end
      }
    }
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
  params.columnApi.getAllColumns().forEach((column) => {
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
    : params.api.columnModel.gridApi.gridBodyCtrl.eBodyViewport.clientWidth;

  return clientWidth;
};

export const autoSizeGridColumns = (params, skipHeader, autoSizeOnlyCustom) => {
  !autoSizeOnlyCustom && params.columnApi.autoSizeAllColumns(skipHeader);
  params.columnApi.getAllColumns().forEach((column) => {
    if (column.colDef?.extra?.width) {
      params.columnApi.setColumnWidth(column.colId, column.colDef.extra.width);
    }
  });
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
export const freezeColumn = (api, columnApi, column, isPinned, displaySnackMessages) => {
 
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
      "Viewport full. Unfreeze or resize existing freezed columns to freeze more.",
      "error"
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
  params.columnApi.autoSizeColumn(params.column);
};

/**
 *
 * @param {object} params // table instance
 * Ability to pin/unpin columns based on current state
 */
export const onColMenuFreezeClick = (params, displaySnackMessages) => {
  const { pinned } = params.column;
  // if column is pinned then unpin, vice-versa
  if (pinned) {
    freezeColumn(params.api, params.columnApi, params.column, false, displaySnackMessages);
  } else {
    freezeColumn(params.api, params.columnApi, params.column, true, displaySnackMessages);
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
  // applyColumnState - to manually set the sort order for a particular column
  if (!api?.ignoreClearSelectionOnSearchandSort) {
    api.setCheckConfiguration([]);
    api.deselectAll(true);
  }
  api.gridOptionsWrapper.gridOptions.columnApi.applyColumnState({
    state: [{ colId: columnData.colId, sort: sortBy }],
    defaultState: { sort: null },
  });
};

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
    case "billion":
      // Nine Zeroes for Billions
      let billionFormat = (Math.abs(Number(num)) / 1.0e9).toFixed(2) + "B";
      return String(billionFormat) === "0.00B" ? "0B" : billionFormat;
    case "million":
      // Six Zeroes for Millions
      let millionFormat = (Math.abs(Number(num)) / 1.0e6).toFixed(2) + "M";
      return String(millionFormat) === "0.00M" ? "0M" : millionFormat;
    case "thousand":
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
  return [
    EXCEL_DOWNLOAD_FILTERS_HEADING,
    ...filtersFormat,
    [
      { value: "User id:", type: "String" },
      { value: localStorage.getItem("user"), type: "String" },
      { value: "Date:", type: "String" },
      { value: moment().format(getDateFormat()), type: "String" },
      { value: "Timestamp:", type: "String" },
      { value: moment().format(`${getDateFormat()}, h:mm:ss a`), type: "String" }
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
      } else
        return {
          data: {
            value:
              item?.type === "String" ? item?.value?.toString() : item?.value,
            type: item?.type ? item?.type : "String",
          },
        };
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
  const coreScreenConfig =
    JSON.parse(localStorage.getItem("coreScreenNames"))?.attribute_value || {};
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

export const getNestedTableData = (data, path, label) => {
  const errorStr = `Invalid table data path for ${label} - ${path}`;

  if(typeof path !== 'string' || !path) {
    console.error(errorStr);

    return '';
  }

  const pathArr = path.split('.');
  let currentNode = data;

  for(const pathNode of pathArr) {
    if(currentNode === undefined) {
      console.error(errorStr);

      break;
    }

    currentNode = currentNode[pathNode];
  }

  return currentNode ?? '';
}