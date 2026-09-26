import Tooltip from "@mui/material/Tooltip";
import { addSnack } from "core/actions/snackbarActions";
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
  labelClassName,
  disabled
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

export const displaySnackMessages = (message, variant, dispatch) => {
  try {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variant,
        },
      })
    );
  } catch (error) {
    console.error("displaySnackMessages error", error);
  }
};
