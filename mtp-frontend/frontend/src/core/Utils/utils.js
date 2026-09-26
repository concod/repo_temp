import Tooltip from "@mui/material/Tooltip";
import Select from "core/commonComponents/filters/Select/Select";
import React from "react";
export const STORE_INVENTORY_LINK_COLUMNS_RIGHT_ALIGNED = [
  "stock_out",
  "stockout",
  "shortfall",
  "normal",
  "excess",
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
  labelClassName
) => {
  if (options?.length > 1) {
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
          label={key}
          handleDropdownClose={true}
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

export const getScreenName = ({ pathname }) => {
  let screenName = sessionStorage.getItem("activeScreenName");
  if (screenName === "undefined") {
    screenName = "IA Smart Platform";
  }
  switch (pathname) {
    case "/home":
      screenName = screenName + " Home";
      break;
    case "/login":
      screenName = screenName + " Login";
      break;
  }
  let env = "";
  if (window.location.host.includes(".devs")) {
    env = "[DEVS] ";
  } else if (window.location.host.includes(".test")) {
    env = "[TEST] ";
  } else if (window.location.host.includes(".uat")) {
    env = "[UAT] ";
  }
  return `${env}${screenName}`;
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

/**
 * doesFirstLetterStartsWithASymbol will be
 * used to get a boolean value of whether the first letter
 * of the word starts with a particular symbol or not
 * @param {object} event
 * @param {string} symbol
 * @param {function} setCurrentWordIndex
 * @returns
 */
export const doesFirstLetterStartsWithASymbol = (
  event,
  symbol,
  setCurrentWordIndex
) => {
  try {
    const value = event.target.value;

    // Get the cursor position
    const cursorPosition = event.target.selectionStart;

    // Split the input value into words
    const words = value.split(/\s/);

    // Find the current word based on cursor position
    let currentWord = "";
    let currentPosition = 0;
    for (let i = 0; i < words.length; i++) {
      currentPosition += words[i].length;
      if (currentPosition >= cursorPosition) {
        currentWord = words[i];
        setCurrentWordIndex(i);
        break;
      }
      // Add 1 to account for space between words
      currentPosition += 1;
    }

    // Check if the current word starts with current symbol
    if (currentWord && currentWord[0] === symbol) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("doesFirstLetterStartsWithAtTheRateSymbol error", error);
  }
};

export const convertAccessHierarchyToOldFormat = (
  appModuleActions,
  accessHierarchy = []
) => {
  const result = {};
  // Iterate over each module in the appModuleActions dictionary
  for (const [module, access] of Object.entries(appModuleActions)) {
    // Replace 'limited' in each action's access with accessHierarchy
    const updatedAccess = Object.fromEntries(
      Object.entries(access).map(([key, value]) => [
        key,
        value === "limited" ? accessHierarchy : {},
      ])
    );
    // Add the module with the updated access to the result
    result[module] = updatedAccess;
  }
  return result;
};
