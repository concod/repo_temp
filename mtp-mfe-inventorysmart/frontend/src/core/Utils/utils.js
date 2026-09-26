import Tooltip from "@mui/material/Tooltip";
import { addSnack } from "core/actions/snackbarActions";
import Select from "core/commonComponents/filters/Select/Select";
import moment from "moment";
import React from "react";
import {isMac} from 'impact-ui-v3'
import { config } from "../../config";
export const STORE_INVENTORY_LINK_COLUMNS_RIGHT_ALIGNED = [
  "stock_out",
  "stockout",
  "shortfall",
  "normal",
  "excess",
  "overstock",
  "oh",
  "it",
  "oo",
];

export const attributeFormatter = function (value) {
  //isPrice key is used for inserting dollar in value formatter

  //If value is not a valid type, return empty string
  if (!value) {
    return "";
  }

  //If value is not a numerical type, return by camel casing the text
  let letter = /[a-zA-Z]/g;
  if (value.match(letter)) {
    return value.length < 4
      ? value
          .replace(" penetration", "")
          .split("_")
          .map((setAllfield) => {
            //If setAll field contains term "cc",e.g max_cc whole term needs to be converted to uppercase
            if (setAllfield === "cc" || setAllfield === "aur")
              return setAllfield.toUpperCase();
            return (
              setAllfield.charAt(0).toUpperCase() +
              setAllfield.slice(1).toUpperCase() +
              " "
            );
          })
          .join("")
      : value
          .replace(" penetration", "")
          .split("_")
          .map((setAllfield) => {
            //If setAll field contains term "cc",e.g max_cc whole term needs to be converted to uppercase
            if (setAllfield === "cc" || setAllfield === "aur")
              return setAllfield.toUpperCase() + " ";
            return (
              setAllfield.charAt(0).toUpperCase() + setAllfield.slice(1) + " "
            );
          })
          .join("");
  }

  //If value is in numerical format
  return value
    .replace(" penetration", "")
    .replace("_", " ")
    .split("_")
    .map((e) => {
      let temp = e.split(" ");
      temp[0] = parseFloat(temp[0]) >= 0 ? parseInt(temp[0]).toString() : "";
      temp[1] = parseFloat(temp[1]) >= 0 ? parseInt(temp[1]).toString() : "";
      return temp[1].length ? temp[0] + " - " + temp[1] : temp[0];
    })
    .join("");
};
export const getLastIndex = (p_array = []) => {
  return p_array.length - 1 === -1 ? 0 : p_array.length - 1;
};

export const isActionAllowedOnSubModule = (
  permissions,
  moduleName,
  subModuleName,
  action
) => {
  if (!permissions || !moduleName) {
    return true;
  }
  return permissions?.[moduleName]?.[subModuleName]?.indexOf(action) > -1;
};
export const addAttributeValueBasedOnKey = (table) => {
  for (const key in table) {
    if (key === "attribute_value") {
      let convertStringResponseToObj = JSON.parse(table["attribute_value"]);

      let tempObj = {};
      for (const innerKey in convertStringResponseToObj) {
        tempObj[innerKey] =
          (convertStringResponseToObj[innerKey] * 100).toString() + "%";
        table[innerKey] = tempObj[innerKey];
      }
      table[key] = tempObj;
    }
  }

  return table;
};

export const filterView = (
  label,
  key,
  options,
  onChange,
  value,
  className,
  labelClassName,
  disabled,
  includeSelectAlways = false,
) => {
  if (options?.length > 1 || includeSelectAlways) {
    // returning drop down if it has more than one options
    return (
      <div className={className || ""} id={label}>
        <label
          className={labelClassName || "drop-down-label"}
        >{`${label}: `}</label>
        <Select
          menuPosition={"fixed"}
          isSearchable={true}
          menuShouldBlockScroll={true}
          pagination={true}
          fetchOptions={options}
          initialData={options}
          selectedOptions={[value]}
          updateDependency={(_key, option) => {
            onChange(option[0], _key);
          }}
          filter_keyword={key}
          //if we have label then we are already showing label else we can show key
          label={label?'':key}
          handleDropdownClose={true}
          isDisabled={disabled}
        />
      </div>
    );
  } else {
    // return label instead of drop down if it has only one option
    return (
      <div className={className} id={label}>
        <label className={labelClassName || "bold-label"}>
          {`${label}: `}{" "}
        </label>
        <Tooltip
          placement="top"
          title={<React.Fragment>{value?.label}</React.Fragment>}
        >
          <span className={"truncate-text"}>{value?.label}</span>
        </Tooltip>
      </div>
    );
  }
};
export const productMappingTableArticleFilter = {
  filter_type: "cascaded",
  attribute_name: "product_code",
  operator: "in",
  dimension: "Product",
  values: [],
};

export const getRouteForPopUp = (ref, routeOptions, event, label) => {
  if (ref.current && !ref.current.contains(event.target)) {
    return routeOptions.find(
      (elem) => elem.label === event.target.innerText && elem.label !== label
    );
  }
};

/**
 * testHelperFunction is just
 * helper function for testing
 * dynamic import of function
 * @param {any} dataParams
 * @returns
 */
export const testHelperFunction = (dataParams) => {
  try {
    return {
      data: dataParams,
    };
  } catch (error) {
    console.error("testHelperFunction error", error);
  }
};

export const displaySnackMessages = (
  message,
  variant,
  dispatch,
  anchorOrigin = {
    horizontal: "right",
    vertical: "bottom",
  }
) => {
  try {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variant,
          autoHideDuration: 2000,
          anchorOrigin: anchorOrigin,
        },
      })
    );
  } catch (error) {
    console.error("displaySnackMessages error", error);
  }
};

/**
 * @function transformFilterDropdownData
 * @description Transforms filter dropdown data into a format suitable for the UI.
 * @param {Array} dataArray - Array of filter data objects.
 * @returns {Array} Transformed dropdown data.
 */
export const transformFilterDropdownData = (dataArray) =>
  dataArray.map((obj) => ({
    accessor: obj.column_name,
    label: obj.label,
    field_type: obj.display_type || "dropdown",
    filter_type: obj.type || "cascaded",
    isDisabled: obj.is_disabled || false,
    required: obj.is_mandatory || false,
    isMulti: obj.is_multiple_selection || false,
    isClearable: obj.is_clearable || true,
    options: obj.options.map((option) => ({
      value: option.id || option,
      label: option.name || option,
      id: option.id || option,
    })),
    dimension: obj.dimension || "product",
    initialData: obj.options.map((option) => ({
      value: option,
      label: option,
      id: option,
    })),
  }));

/**
 * @function generateFilterPayload
 * @description Generates the payload for filters based on the current selected attributes and filter data.
 * @param {Array} filterData - List of available filters.
 * @param {Array} currentSelectedAttributes - Currently selected attributes for the filters.
 * @returns {Array} Filter payload.
 */
export const generateFilterPayload = (filterData, currentSelectedAttributes) =>
  filterData
    .map((filter) => {
      const match = currentSelectedAttributes.find(
        (attr) => attr.attribute_name === filter.column_name
      );

      // TODO : REMOVE THIS ONCE WE CAN SELECT MORE ATTRIBUTE LEVELS
      if (["l0_name", "l3_name", "l5_name"].includes(filter.column_name)) {
        return match
          ? {
              attribute_name: match.attribute_name,
              value: match.values,
              operator: match.operator,
            }
          : {
              attribute_name: filter.column_name,
              value: [""],
              operator: "in",
            };
      }
      return null;
    })
    .filter(Boolean);

/**
 * @function generateProductHierarchy
 * @description Generates product hierarchy data.
 * @param {Object} data - Row data of the component.
 * @returns {Array} Product hierarchy data.
 */
export const generateProductHierarchy = (data) => {
  return data.map(({ attribute_list, ...rest }) => ({
    ...rest,
    attribute_list: attribute_list.map((attribute) => attribute.value),
  }));
};

/**
 * @function createSavePayload
 * @description Combines filters and product hierarchy data into a single payload for the save API.
 * @param {Array} filters - List of filter data.
 * @param {Array} hierarchyData - Product hierarchy data.
 * @returns {Object} Payload for the save API.
 */
export const createSavePayload = (filters, hierarchyData) => ({
  filters,
  product_hierarchy: hierarchyData,
});

export const transformUpdatedFilter = (data) => {
  // Use constant here
  return Object.keys(data)
    .filter((key) => !key.includes("options"))
    .map((key) => ({
      attribute_name: key,
      operator: "in",
      values: data[key],
      filter_type: "cascaded",
      dimension: "product",
    }));
};

/**
 * @function getApplicationCodeFromURL
 * @description Returns the Application code on the targetName
 * @param {Array} targetName - String
 * @returns {Number} Application Code
 */
export const getApplicationCodeFromURL = (targetName) => {
  const applicationCodesList = JSON.parse(
    localStorage.getItem("applicationCodesList") || "[]"
  );

  const targetAppName = targetName.toLowerCase();

  const matchedApp = applicationCodesList.find(
    (app) => app.name?.toLowerCase() === targetAppName
  );

  return matchedApp?.application_code || null;
};

/**
 * @function showSnackMessage
 * @description Displays a snack message with the provided message and variant type.
 * @param {Function} addSnack - The function to display snack messages.
 * @param {String} message - The message to display in the snack.
 * @param {String} [variant="success"] - The type of snack message (e.g., "success", "error" etc).
 */
export const showSnackMessage = (addSnack, message, variant = "success") => {
  addSnack({
    message,
    options: {
      variant,
    },
  });
};

/**
 * @function customAgGridCustomCellRenderer
 * @description Custom cell renderer for AG Grid
 * @param {Object} cellProps - Properties of the cell passed by AG Grid, including data and column definitions.
 * @param {String} tableId - Identifier for the table to apply the custom rendering logic.
 */
export const customAgGridCustomCellRenderer = (cellProps, tableId) => {
  const { data, colDef } = cellProps;

  switch (tableId) {
    case "preview-table":
      if (data && data[colDef.column_name] === "NA") {
        return <p>{data[colDef.column_name]}</p>;
      }
      break;
    case "error-metric-table":
      if (data.metric === "Total" && colDef.column_name === "weightage") {
        return <p>{data[colDef.column_name]}</p>;
      }
      break;
    default:
      return null;
  }
};

/**
 * @function
 * @description Create a generic dropdown option object
 * @param {String} label
 * @param {String|Number} value
 * @returns {Object}
 */
export const createDropdownObject = (label, value) => ({
  label,
  value,
});

export const isStartDateBiggerThanEndDate = (payloadData) => {
  let timeError = false;
  payloadData.forEach((item) => {
    item.attributes.forEach((attr) => {
      const startDate = moment(attr.start_time);
      const endDate = moment(attr.end_time);
      const diff = startDate.diff(endDate);
      if (diff > 0) timeError = true;
    });
  });
  return timeError;
};

/**
 * 
 * @param {String} returnBase - If true - returns the base url on which api calls are made, if false returns the client's domain/ location origin
 * @param {*} includePath - If true - returns the pathname from window's location, if false - returns just the client's domain/ location origin
 */
export const getBaseUrl = (returnBase=false, includePath = false) => {
  if(returnBase){
    return config.baseUrl;
  }
  let origin;
  if (window.location.origin.includes("localhost")) {
    origin = config.baseUrl.slice(0, config.baseUrl.indexOf("api") - 1);
  } else {
    origin = window.location.origin;
  }
  if (includePath) {
    return origin + window.location.pathname;
  }
  return origin;
};

export const getItemFromLastIndexForArray = (array, index) => {
  try {
    return array[array.length - index];
  } catch (error) {
    console.error("getItemFromLastIndexForArray error", error);
  }
};

// Safe date format validation to prevent corrupted display format
export const getSafeDisplayFormat = (tenantDateFormat) => {
  const fallbackFormat = "MM-DD-YYYY";
  try {
    const validFormatPattern = /^[DMYHmsaA\-\/\.\s:]+$/; // Valid moment.js format characters

    // Check if tenantDateFormat exists and is a valid string
    if (
      tenantDateFormat &&
      typeof tenantDateFormat === "string" &&
      tenantDateFormat.length > 0 &&
      tenantDateFormat.length < 20 && // Reasonable length check
      validFormatPattern.test(tenantDateFormat)
    ) {
      // Test the format with a known date to ensure it doesn't produce garbage
      try {
        const testDate = moment("2023-01-01");
        const testFormatted = testDate.format(tenantDateFormat);

        // If the formatted result contains unexpected characters, use fallback
        if (
          testFormatted &&
          !testFormatted.includes("ricpm") &&
          !testFormatted.includes("PM00")
        ) {
          return tenantDateFormat;
        }
      } catch (error) {
        console.warn(
          "Invalid tenant date format detected, using fallback:",
          tenantDateFormat
        );
        return fallbackFormat;
      }
    }

    return fallbackFormat;
  } catch (error) {
    console.error("getSafeDisplayFormat error:", error);
    return fallbackFormat;
  }
};

/**
 * @function getCrossFilterVersion
 * @description Returns the cross-filter version for the given application code.
 * @param {Number} [appCode] - Optional application code to look up else considers app from URL
 * @returns {String} The cross-filter version string, defaults to "cross-filter-v2".
 */
export const getCrossFilterVersion = (appCode) => {
  const DEFAULT_VERSION = "cross-filter-v2";
  try {
    const crossFilterConfig = sessionStorage.getItem("crossFilterVersion");
    if (!crossFilterConfig) return DEFAULT_VERSION;

    const crossFilterVersionObj = JSON.parse(crossFilterConfig);
    const appIdentifier =
      appCode || window.location.pathname.split("/")?.[1];

    return crossFilterVersionObj?.[appIdentifier] || DEFAULT_VERSION;
  } catch (error) {
    console.error("getCrossFilterVersion error:", error);
    return DEFAULT_VERSION;
  }
};

export const matchesShortcut = (e, shortcut) => {
  if (!shortcut?.keys) return false;
  const pressed = new Set();
  if (e.metaKey) pressed.add("Meta");
  if (e.ctrlKey) pressed.add("Ctrl");
  if (e.altKey) pressed.add("Alt");
  if (e.shiftKey) pressed.add("Shift");
  pressed.add(e.code === "Space" ? " " : e.code.replace(/^(Key|Digit)/, "").toLowerCase());
  return shortcut.keys.length === pressed.size && shortcut.keys.every((k) => pressed.has(k));
};

export const getShortcutKeys = (category, action) => (state) => {
  return state.tenantConfigReducer?.keyboardShortcuts?.[category]
    ?.find((s) => s.action === action)
    ?.keys?.join("+") || ""
};

export const overrideSystemShortcut = (e) => {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) {
      e.stopPropagation();
    } else if (window.event) {
      window.event.cancelBubble = true; // IE-specific way to stop propagation
    }
  }
};