/**
 * Add generic functions here which are abstract tasks and dont contain business logic
 * Ex: all lodash functions are generic functions
 */

import moment from "moment";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { SPECIAL_CHARACTER_MAPPING } from "config/constants";
import { cloneDeep } from "lodash";
import DOMPurify from "dompurify";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { getApplicationMaster } from "core/actions/tenantConfigActions";
import { getUserDetails } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Management/user-management-service";
import { EXCLUDED_SPECIAL_CHARACTERS } from "core/constants";
import { ENV } from "config/api";

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
    case "configurator":
      return "module configurator";
    case "inventory-smart":
      return "InventorySmart";
    case "ada":
      return "ADA";
    case "plan-smart":
      return "PlanSmart";
    case "adaconfigurator":
      return "ADAConfigurator";
    case "item-smart":
      return "ItemSmart";
    case "item-smart-new":
      return "ItemSmart-New"
    case "pricesmart":
      return "PriceSmart";
    case "source-smart":
      return "SourceSmart"
    case "size-smart":
      return "SizeSmart"
    case "agentic-assort":
      return "AssortSmart";
    case "agentic-plan":
      return "PlanSmart";
    case "demand-smart":
      return "Demand Smart";
    default:
      return "workflow input center";
  }
};

export const getCurrentApplicationName = () => {
  let applicationURL = window.location.pathname.split("/")?.[1];

  if (
    applicationURL === "ada" &&
    sessionStorage.getItem("isRedirectedFromInventorySmart") === "true"
  ) {
    applicationURL = "inventory-smart";
  }
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

//this function gives the next date of current date
export const getCurrentDatePluseOne = () => {
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1);
  let formattedDate =
    '"' +
    `${currentDate.getFullYear()}-${("0" + (currentDate.getMonth() + 1)).slice(
      -2
    )}-${("0" + currentDate.getDate()).slice(-2)}` +
    '"';
  return formattedDate;
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
export const timeConversionToUTC = (value) => {
  const utcDate = moment.utc(value).format();
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

export const replaceSpecialCharacter = (str) => {
  if (typeof str === "object") {
    return str;
  } else {
    let re = new RegExp(Object.keys(SPECIAL_CHARACTER_MAPPING).join("|"), "gi");
    return str?.toString()?.replace(re, function (matched) {
      return SPECIAL_CHARACTER_MAPPING[matched.toLowerCase()];
    });
  }
};

/**
 * @function
 * @description Function is used to return string by replacing the special characters with respective key mapped to SPECIAL_CHARACTER_MAPPING
 * @param {String} str
 * @returns {String} key of mapped special character used in the string
 */
export const replaceSpecialCharToCharCode = (str) => {
  let re = new RegExp(
    `[${Object.values(SPECIAL_CHARACTER_MAPPING).join("")}]`,
    "g"
  );
  return str.replace(re, function (matched) {
    let code;
    for (const [key, value] of Object.entries(SPECIAL_CHARACTER_MAPPING)) {
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

/**
 *
 * @func will formats the headers for excel download
 * @param {Array} data - formattedColumns
 * @returns Array - updated header list
 */

export const getHeaderForExcel = (data) => {
  let header = [];
  let tempData = cloneDeep(data);

  tempData.forEach((item) => {
    if (item.sub_headers?.length > 0) {
      for (let i of item.sub_headers) {
        // Remove the column if exclude_from_download is true
        if (!i?.extra?.exclude_from_download) {
          let columnHeader = `${item.label}/${i.label}`;
          // Remove the hidden parent column from Column Header
          if (item?.extra?.exclude_from_download) {
            columnHeader = `${i.label}`;
          }
          header.push({
            label: columnHeader,
            key: i.column_name,
          });
        }
      }
    } else {
      // Remove the column if exclude_from_download is true
      if (
        !item?.extra?.exclude_from_download &&
        item.label &&
        item.column_name !== "action"
      ) {
        header.push({ label: item.label, key: item.column_name });
      }
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
    filters_applied["carryover_new_flag"] = Array.isArray(
      selectedFilters["carryover"]
    )
      ? selectedFilters["carryover"]
      : [selectedFilters["carryover"]];
  }
  return filters_applied;
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
 * @function
 * @description Find duplicate String in an array ignoring cases.
 * @param {Array} array
 * @returns {Boolean}
 */
export const hasCaseInsensitiveDuplicates = (array) => {
  const stringMap = new Map();
  return array.some((str) => {
    const lowercaseStr = str.toLowerCase();
    if (stringMap.has(lowercaseStr)) {
      return true;
    }
    stringMap.set(lowercaseStr, true);
    return false;
  });
};

export const extractParentUrl = (path) => {
  const match = path?.match(/^\/[^/]+/);
  return match ? match[0] : null;
};

export const sanitizeHtml = (inputHtml, extraParams = {}) => {
  return DOMPurify.sanitize(inputHtml, { ...extraParams });
};

/**
 * Sanitizes specific fields in a payload object to prevent XSS attacks
 * @param {Object} payload - The payload object to sanitize
 * @param {string|string[]} fieldsToSanitize - Field name(s) to sanitize (e.g., 'comment' or ['comment', 'html_msg'])
 * @param {Object} sanitizeOptions - DOMPurify options (default: allows only span tags)
 * @returns {Object} - Sanitized payload with specified fields cleaned
 */
export const sanitizePayloadFields = (
  payload,
  fieldsToSanitize,
  sanitizeOptions = {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class', 'contenteditable'],
    ALLOW_DATA_ATTR: false
  }
) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const fields = Array.isArray(fieldsToSanitize) ? fieldsToSanitize : [fieldsToSanitize];
  const sanitizedPayload = { ...payload };

  fields.forEach((field) => {
    if (sanitizedPayload[field] && typeof sanitizedPayload[field] === 'string') {
      sanitizedPayload[field] = sanitizeHtml(sanitizedPayload[field], sanitizeOptions);
    }
  });

  return sanitizedPayload;
};
/**
 *
 * @param {string} str  // String to to parse and return the value from
 * @param {*} valueFlag // Flag to check if the value after the last underscore is to be returned
 * @returns
 */
export const splitStringFromLastUnderscore = (str, valueFlag) => {
  try {
    const lastIndex = str.lastIndexOf("_");
    // Check if underscore exists in the string
    if (lastIndex !== -1) {
      if (valueFlag) {
        // Return the string after the last underscore if flag is true
        return str.substring(lastIndex + 1, str.length);
      }
      return str.substring(0, lastIndex);
    } else {
      // If underscore doesn't exist, return the original string
      return str;
    }
  } catch (error) {
    console.error("splitStringFromLastUnderscore error", error);
  }
};

export const isNonPrimitiveArray = (p_array) => {
  const isNonPrimitive = (item) => typeof item === "object";
  if (p_array.every(isNonPrimitive)) return true;
  return false;
};

// function to filter data of API
export const processData = (responseData, queryParam) => {
  // Check if attribute is not present
  if (Object.keys(queryParam).length === 0) {
    return responseData; // return the response for all attributes
  }
  const { data } = responseData;
  const filteredData = data?.data?.filter(
    (item) => item.name === queryParam?.attribute_name
  );
  return {
    ...responseData,
    data: {
      ...data,
      data: filteredData,
    },
  };
};

// function to filter the response of user-management API
export const filterApiResponseByApp = (response, appName) => {
  if (!response?.data?.data?.data || appName === "") {
    return response; // Return the original response if the structure is not valid
  }
  // Filter the response based on the app name
  const filteredData = response?.data?.data?.data.filter(
    (item) => item.users.app.toLowerCase() === appName.toLowerCase()
  );
  // Create a new response object with filtered data
  return {
    ...response,
    data: {
      ...response.data,
      data: {
        data: filteredData,
      },
    },
  };
};

export const getUserName = () => {
  try {
    const userID = localStorage.getItem("name");
    let userName = userID ? userID.split("@")[0] : "User";
    let shortName = "";
    if (userName.indexOf(".") > 0) {
      shortName = userName
        .split(".")
        .map((item) => item[0].toUpperCase())
        .join("");
    } else {
      shortName = userName.charAt(0).toUpperCase() + userName.slice(1);
    }
    return shortName;
  } catch (error) {
    console.error("userName error", error);
  }
};

export const getCurrentUserId = async () => {
  try {
    const postBody = {
      meta: {
        search: [],
        range: [],
        sort: [],
      },
    };
    const users = await getUserDetails(postBody)();
    const loggedInUserEmail = localStorage.getItem("name");
    const user = users?.data?.data?.filter((item) => {
      return item.email === loggedInUserEmail;
    });
    return user[0]?.user_code;
  } catch (error) {
    console.error("getCurrentUserId error", error);
  }
};

export const fetchApplicationCode = async (getApplicationMaster) => {
  const {
    applicationCode,
    applicationCodesList,
  } = getCurrentApplicationDetails();
  let finalApplicationCode = applicationCode;
  let finalApplicationCodesList = applicationCodesList;
  if (!finalApplicationCode) {
    let applicationURL = window.location.pathname.split("/")?.[1];
    let applicationName = getFormattedApplicationName(applicationURL);
    // Fetching application Name from url
    if (applicationName === "workflow input center") {
      applicationName = "Workflow Input Center";
    }
    // compare and find code for application name in the url
    let getApplicationMasterList = await getApplicationMaster();
    localStorage.setItem(
      "applicationCodesList",
      JSON.stringify(getApplicationMasterList?.data?.data)
    );
    finalApplicationCodesList = getApplicationMasterList?.data?.data;
    finalApplicationCodesList?.forEach(async (app) => {
      if (app.name === applicationName) {
        finalApplicationCode = app.application_code;
      }
    });
  }

  return {
    applicationCode: finalApplicationCode,
    applicationCodesList: finalApplicationCodesList,
  };
};

export const fetchBaseUrl = async () => {
  try {
    let { applicationCode } = await fetchApplicationCode(getApplicationMaster);
    let baseUrlData = await tenantConfigApiCache(applicationCode, {
      attribute_name: "base_url",
    })();
    return baseUrlData?.data?.data?.[0]?.attribute_value?.value;
  } catch (error) {
    console.error("fetchBaseUrl error", error);
    return null;
  }
};

export const fetchLegacyAgentScreen = async () => {
  try {
    let { applicationCode } = await fetchApplicationCode(getApplicationMaster);
    let legacyAgentScreenData = await tenantConfigApiCache(applicationCode, {
      attribute_name: "legacy_agent_screen",
    })();
    return legacyAgentScreenData?.data?.data?.[0]?.attribute_value?.value;
  } catch (error) {
    console.error("fetchLegacyAgentScreen error", error);
    return null;
  }
};

export const replaceSpecialCharsInSearchPattern = (str) => {
  if (!str || typeof str !== "string") return str;

  // escape special characters in the pattern
  const escapedChars = Object.values(SPECIAL_CHARACTER_MAPPING)
    .map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("");

  const re = new RegExp(`[${escapedChars}]`, "g");

  const result = str.replace(re, function (matched) {
    // search the code for the matched special character
    for (const [key, value] of Object.entries(SPECIAL_CHARACTER_MAPPING)) {
      if (value === matched) {
        return key;
      }
    }
    return matched;
  });
  return result;
};

export const getEnvName = () => {
  switch (ENV) {
    case "test":
      return "[TEST]";
    case "uat":
      return "[UAT]";
    case "devs":
      return "[DEVS]";
    default:
      return "[PROD]";
  }
};

// Build the regex lazily to avoid touching EXCLUDED_SPECIAL_CHARACTERS during module initialization (prevents TDZ in circular deps)
let _excludedSpecialCharactersRegex;
const getExcludedSpecialCharactersRegex = () => {
  if (_excludedSpecialCharactersRegex) return _excludedSpecialCharactersRegex;
  const escapedCharClass = EXCLUDED_SPECIAL_CHARACTERS.map((ch) =>
    ch.replace(/[\\\-\]]/g, "\\$&")
  ).join("");
  _excludedSpecialCharactersRegex = new RegExp(`[${escapedCharClass}]`);
  return _excludedSpecialCharactersRegex;
};

export const hasExcludedSpecialCharacters = (text) => {
  if (!text || typeof text !== "string") return false;
  return getExcludedSpecialCharactersRegex().test(text);
};
