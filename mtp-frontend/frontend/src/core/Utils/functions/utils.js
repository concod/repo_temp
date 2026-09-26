/**
 * Add generic functions here which are abstract tasks and dont contain business logic
 * Ex: all lodash functions are generic functions
 */

import moment from "moment";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { SPECIAL_CHARACTER_MAPPING } from "config/constants";
import { cloneDeep } from "lodash";
import { excelExtensions, imageExtensions } from "./constants";

// Create array of numbers with start, end, step i.e. diff between two consecutive numbers
export const rangexy = (start, end, step) =>
  Array.from({ length: end / step + 1 - start }, (_, i) => {
    return step * i + start;
  });

// find closest number for a given range of integers
// ex [5,10,15,20] if target is 12 return value will be 10 and if target is 13 return value will be 15
export const binaryClosestIdx = (target, min, max, step) => {
  const arr = rangexy(min, max, step);
  let start = 0;
  let end = arr.length - 1;
  let mid = Math.floor((start + end) / 2);

  while (true) {
    if (arr[mid] === target) {
      return arr[mid];
    } else if (start >= end) {
      break;
    } else if (arr[mid] > target) {
      end = mid - 1;
    } else {
      start = mid + 1;
    }

    mid = Math.floor((start + end) / 2);
  }

  // Return the closest between the last value checked and it's surrounding neighbors
  const first = Math.max(mid - 1, 0);
  const neighbors = arr.slice(first, mid + 2);
  const best = neighbors.reduce((b, el) =>
    Math.abs(el - target) < Math.abs(b - target) ? el : b
  );

  return arr[first + neighbors.indexOf(best)];
};

/**
 *
 * @param {string} dateString
 * @param {date format} oldFormat
 * @param {date format} newFormat
 * @returns datestring
 * changeDateStringToOtherFormat function takes datestring as input which is in one X format and
 * converts it to other Y format and returns back the new formatted string
 * Ex: 10-12-1996 is converted to 12-10-1996 if we 10-12-1996, DD-MM-YYYY, MM-DD-YYYY as params
 */
export const changeDateStringToOtherFormat = (
  dateString,
  oldFormat,
  newFormat
) => {
  return moment(dateString, oldFormat).format(newFormat);
};

export const getFormattedApplicationName = (applicationURL) => {
  //Function to return the application name that matches global.application_master. TO DO: Make the URL expedition more dynamic taking it from the landing screen itself
  switch (applicationURL) {
    case "user-management":
    case "tenantconfig":
      return "application access management";
    case "assort-smart":
      return "AssortSmart";
    case "inventory-smart":
      return "InventorySmart";
    case "ada":
      return "ADA";
    case "plan-smart":
      return "PlanSmart";
    case "home":
      return "home";
    default:
      return "workflow input center";
  }
};

export const getCurrentApplicationName = () => {
  let applicationURL = window.location.pathname.split("/")?.[1];
  let applicationName = getFormattedApplicationName(applicationURL);
  return applicationName;
};

/**
 *
 * @param {*} string
 * @param {*} delimiter
 * @returns string split array with extra whitespaces trimmed
 */
export const stringSplitWithTrim = (string, delimiter) => {
  const stringSplitArr = string.split(delimiter);
  return [stringSplitArr[0].trim(), stringSplitArr[1].trim()];
};

/**
 *
 * @param {moment} date
 * @param {moment, dateString} selectedDate
 * @returns boolean
 * date: The date to test
 * selectedDate: Date value currently set in the datePicker field
 * returns (boolean): Returns true if the date should be disabled.
 * Since datePicker calendar selects the first enabled date if past dates are disabled,
 * we need to keep the past date enabled if selected date in input fields in the past
 */
export const setDisabledDates = (date, selectedDate) => {
  date = date.format("YYYY-MM-DD");
  const today = moment().format("YYYY-MM-DD");
  if (moment(selectedDate).isSame(date)) {
    return false;
  } else if (moment(date).isBefore(today)) {
    return true;
  }
};

export const checkForSpecialCharacters = (value) => {
  //should contain only strings, numbers and spaces
  let regExp = /^[A-Za-z0-9\s]*$/;
  return regExp.test(value);
};

/**
 *
 * @param {moment, dateString} value
 * @returns moment
 * value: The date to convert to UTC
 * returns (moment): converts input date to UTC format
 */
export const timeConversionToUTC = (value, format) => {
  const utcDate = moment.utc(value).format(format ? format : "");
  return utcDate;
};

/**
 *
 * @param {moment, dateString} value
 * @param {string} tenantFormat
 * @param {string} tenantTimeZone
 * @returns dateString in input format
 * value: The date to convert
 * tenantFormat: tenant configured date format
 * tenantTimeZone: tenant configured timezone
 * returns (moment): converts input to tenant timezone and date format
 */
export const timeConversionToTenantLocal = (
  value,
  tenantFormat,
  tenantTimeZone
) => {
  const utcDate = moment.utc(value);
  const localValue = utcDate.tz(tenantTimeZone).format(tenantFormat);
  return localValue;
};

export const formatStringArray = (strArr) => {
  return strArr.map((str) => {
    return {
      label: str,
      value: str,
      id: str,
    };
  });
};

/**
 *
 * @param {reference} agGridTableRef
 * @returns boolean
 *
 * This function will check if the user has performed any action on the table
 * parameter passed
 *        1. Table instance - ref type
 * We pass table instance/reference to this function. Using ref, we check for
 * checkConfiguration which will give us the history of user actions. If the
 * length of user actions is empty, we send true else false
 */
export const checkForEmptyTableUserConfig = (agGridTableRef) => {
  if (
    agGridTableRef.current &&
    agGridTableRef?.current?.api?.checkConfiguration.length !== 0
  ) {
    return false;
  }
  return true;
};

/**
 *
 * @param {string} attributeName
 * @param {int} applicationCode
 * @returns boolean
 * This method will call the tenant config API to check for the presence of attributeName in the
 * tenant config db. This is used at toggle display switches
 * Currently used in - store to dc/fc, dc/fc to store, product/sku grouping
 */
export const checkToDisplayToggleAttributeLevel = async (
  attributeName,
  applicationCode = 3
) => {
  let showAttributeLevelDataResp = await getTenantConfigApplicationLevel(
    applicationCode,
    {
      attribute_name: attributeName,
    }
  )();
  //If the key exists in the db, we will return the value of the key returned by the API
  if (showAttributeLevelDataResp?.data?.data?.[0]?.["attribute_value"]) {
    return showAttributeLevelDataResp?.data?.data?.[0]?.["attribute_value"]
      .value;
  }
  //else return false
  return false;
};

/**
 *
 * @param {date} date
 * @param {string} dateFormat
 * @returns formatted date in a given format
 */
export const formatMomentDate = (date, dateFormat = "YYYY-MM-DD") => {
  return date?.format(dateFormat);
};

/**
 *
 * @param {date} date
 * @param {boolean} isEpoch
 * @param {boolean} doRequireMomentObject
 * @param {string} dateFormat
 * @returns date in utc if date is coming in epoch. date format depends on user preference if we require as moment object or final formatted date
 */
export const formatStringDate = (
  date,
  isEpoch = false,
  doRequireMomentObject = false,
  dateFormat = "YYYY-MM-DD"
) => {
  let newDate = moment(date);
  if (isEpoch) {
    newDate.utc();
  }
  return doRequireMomentObject
    ? moment(newDate)
    : formatMomentDate(moment(newDate), dateFormat);
};

/**
 * @func
 * @desc Test search string against valuestring for even a partial match and return true else false
 * @param {String} searchString
 * @param {String} valueString
 * @returns
 */
export const isStringIncluded = (searchString, valueString) => {
  return (
    valueString &&
    valueString
      .toString()
      .replace(/\s/g, "")
      .toUpperCase()
      .includes(searchString.toString().replace(/\s/g, "").toUpperCase())
  );
};

/**
 * @function
 * @description Function is used to return string by replacing the special characters with respective key mapped to SPECIAL_CHARACTER_MAPPING
 * @param {String} str
 * @returns {String} key of mapped special character used in the string
 */

export const transformSpecialChars = (str) => {
  if (typeof str !== "string") {
    return str; // If not a string, return as-is
  }

  // Regex to match __ia_char_01 and its suffix (e.g., S)
  return str.replace(/__ia_char_01([A-Z]*)/g, "'$1");
};

export const getFilteredSpecialCharMapping = () => {
  const coreConfig = JSON.parse(localStorage.getItem("coreScreenNames"));
  const ignoredSpecialCharacter = coreConfig?.["attribute_value"]?.["ignoredSpecialCharacter"]

  if(!ignoredSpecialCharacter) {
    return SPECIAL_CHARACTER_MAPPING;
  }

  // Create a new mapping excluding the ignored characters
  const filteredMapping = Object.fromEntries(
    Object.entries(SPECIAL_CHARACTER_MAPPING).filter(
      ([key, value]) => !ignoredSpecialCharacter?.includes(key)
    )
  );

  return filteredMapping;
};

export const replaceSpecialCharToCharCode = (str) => {
  // some characters like '.' '?' etc are special characters in regEx, they are pre defined
  // and need to be handled separately '\.' ,'\?' for them to match
  let typeCheck = typeof str === "string" || str instanceof String;
  if (!typeCheck) {
    return str;
  }
  const specialCharacterMapping = getFilteredSpecialCharMapping();

  let re = new RegExp(
    `[${Object.values(specialCharacterMapping).join("\\")}]`,
    "g"
  );
  return str.replace(re, function (matched) {
    let code;
    for (const [key, value] of Object.entries(specialCharacterMapping)) {
      if (value === matched) {
        code = key;
        return code;
      }
    }
    return code;
  });
};

/**
 *
 * @func will check if the two parameters passed to it is equal or not
 * @param {String} str1
 * @param {String} str2
 * @returns true or else false based on the result of the comparison of the params
 */
export const checkIfEqual = (str1, str2) => {
  return str1.toString().replace(/\s/g, "").toUpperCase() ===
    str2.toString().replace(/\s/g, "").toUpperCase()
    ? true
    : false;
};
export const replaceSpecialCharacter = (str) => {
  const specialCharacterMapping = getFilteredSpecialCharMapping();
  let re = new RegExp(Object.keys(specialCharacterMapping).join("|"), "gi");
  return str?.toString()?.replace(re, function (matched) {
    return specialCharacterMapping[matched.toLowerCase()];
  });
};

/**
 *
 * @func will formats the headers for excel download
 * @param {Array} data - formattedColumns
 * @returns Array - updated header list
 */

export const getHeaderForExcel = (data) => {
  let header = [];
  let tempData = cloneDeep(data);

  tempData?.forEach((item) => {
    if (item.sub_headers?.length > 0) {
      for (let i of item.sub_headers) {
        header.push({
          label: `${item.label}/${i.label}`,
          key: i.column_name,
        });
      }
    } else {
      if (item.label && item.column_name !== "action")
        header.push({ label: item.label, key: item.column_name });
    }
  });
  return header;
};

/**
 * pxToRem function will convert the px value
 * to rem value and return it
 */
export const pxToRem = (pxValue) => {
  try {
    return pxValue / 16 + "rem";
  } catch (error) {
    console.error("pxToRem error:", error);
  }
};

export const getFiltersAppliedData = (selectedFilters) => {
  let filters_applied = {};
  //If none of the value selected for filters_applied, then send empty data
  if (selectedFilters["clearance"]) {
    filters_applied["clearance"] =
      selectedFilters["clearance"] === "clearance" ? [true] : [false];
  }
  if (selectedFilters["carryover"]) {
    filters_applied["carryover_new_flag"] = [
      selectedFilters["carryover"],
    ];
  }
  return filters_applied;
};

export const getFileExtension = (url) => {
  // Extract the file extension from the URL using a regular expression
  const extensionRegex = /\.([0-9a-z]+)(?:[?#]|$)/i;
  const match = url.match(extensionRegex);

  // If a match is found, return the file extension, otherwise return null
  return match ? match[1] : null;
};

export const giveBackFileType = (type) => {
  try {
    if (imageExtensions.includes(type)) {
      return "image";
    } else if (excelExtensions.includes(type)) {
      return "excel";
    }
  } catch (error) {
    console.error("giveBackFileType error", error);
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

/**
 * This function adds the suffix for a given week for better UI readability.
 * @param n (week number like 1,2,3,4,5)
 * @returns week with suffix 1st,2nd,3rd,4th,5th
 */
export const getOrdinal = (n) => {
  const suffixes = ["st", "nd", "rd", "th"];
  const suffixIndex = (n - 1) % 10 < 3 ? (n - 1) % 10 : 3;
  const suffix = suffixes[suffixIndex];
  return `${n}${suffix}`;
};

//this function gives the next date of current date
export const getCurrentDatePluseOne = ()=> {
 
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);
  let formattedDate =
    '"' +
    `${currentDate.getFullYear()}-${("0" + (currentDate.getMonth() + 1)).slice(
      -2
    )}-${("0" + currentDate.getDate()).slice(-2)}` +
    '"';
    return formattedDate

};

export const extractParentUrl = (path) => {
  const match = path.match(/^\/[^/]+/);
  return match ? match[0] : null;
};

export const formateDate = (date) => {
  const dateFormat = localStorage.getItem('tenantDateFormat');
  
  return typeof date === "string"
    ? moment(date, dateFormat )
    : date?.format(dateFormat);
}

export const getValueBetweenZeroToOne = (newValue) => {
  if (typeof newValue !== 'number' || isNaN(newValue)) {
    newValue = 0;
  } else if (newValue > 1) {
    newValue = 1;
  } else if (newValue < 0) {
    newValue = 0;
  }
  return newValue;
}

export const getUserName = () => {
  try {
    const userID = localStorage.getItem("name");
    let userName = userID ? userID.split("@")[0] : "User";
    let shortName = "";
    if(userName.indexOf(".") > 0) {
      shortName = userName
      .split(".")
      .map((item) => item[0].toUpperCase())
      .join("");
    }
    else {
      shortName = userName.charAt(0).toUpperCase() + userName.slice(1);
    }
    return shortName;
  } catch (error) {
    console.error("userName error", error);
  }
};

export const isBackEndPaginatedTable = (inventorysmartScreenConfig, screenName) => {
  return !inventorysmartScreenConfig?.clientSideReports?.includes(screenName);
};
