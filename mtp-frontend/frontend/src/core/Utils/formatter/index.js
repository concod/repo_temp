import { DATE_FORMATS } from "config/constants";
import { attributeFormatter } from "core/Utils/utils";
import moment from "moment";
import { Link } from "react-router-dom-v5-compat";
import DescriptionIcon from "@mui/icons-material/Description";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FolderIcon from "@mui/icons-material/Folder";
import FileOpenIcon from "@mui/icons-material/FileOpen";
import ArticleIcon from "@mui/icons-material/Article";
import { DEFAULT_ROUNDOFF, IGNORE_ROUNDOFF } from "core/Utils/agGrid/constants";
import { isNumber, isString } from "lodash";

// Here's a breakdown of what the code does:

// The getNumberFormatter function takes two optional parameters: minimumFractionDigits and maximumFractionDigits, which default to a constant value called DEFAULT_ROUNDOFF.
// It constructs a cache key by concatenating the minimumFractionDigits and maximumFractionDigits values, separated by a hyphen (-).
// It checks if the formatter instance corresponding to the cache key exists in the formatCache using the has() method.
// If the formatter instance does not exist in the cache, a new instance of Intl.NumberFormat is created with the specified minimumFractionDigits and maximumFractionDigits, using the "en-US" locale.
// The new formatter instance is then stored in the formatCache map using the cache key as the key and the formatter instance as the value.
// Finally, the function returns the formatter instance retrieved from the cache using the get() method.
// ex:
// const nf = new Intl.NumberFormat("en-US", {
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });
// input = 12345
// output = nf.format(input) -- 12,345.00
// this approach solves 2 use cases  a. numbersWithComma b. fraction digits.

const formatCache = new Map();

const getNumberFormatter = (
  minimumFractionDigits = DEFAULT_ROUNDOFF,
  maximumFractionDigits = DEFAULT_ROUNDOFF,
  p_instance
) => {
  if (IGNORE_ROUNDOFF?.includes(p_instance?.colDef?.type)) {
    return new Intl.NumberFormat("en-US");
  }
  const cacheKey = `${minimumFractionDigits}-${maximumFractionDigits}`;

  if (!formatCache.has(cacheKey)) {
    formatCache.set(
      cacheKey,
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits,
        maximumFractionDigits,
      })
    );
  }

  return formatCache.get(cacheKey);
};

export const apostropheHandler = (inputPayload) => {
  //escaped characters on the UI to unescaped on the postgres DB
  var newVal;
  if (typeof inputPayload === "string") {
    newVal = unescape(inputPayload.replace(/'/g, "''"));
    inputPayload = newVal;
  }
  return inputPayload;
};

export const numbersWithComma = (
  value,
  roundOffTo,
  disableCommaFormatting = false,
  displayBlank = false
) => {
  const nf = getNumberFormatter(roundOffTo, roundOffTo, value);
  //roundOffTo key is used to return value with 1 or 2 or 3 decimals
  if (value?.value === "-" || value?.value === null) {
    if (displayBlank) return "";
    else return "-"; // must return "-" instead of NaN/ empty hence adding the condition (it expects a hypen or a num)
  } else if (disableCommaFormatting) {
    return value?.value || "";
  } else if (value?.value) {
    if (Number.isInteger(value?.value)) {
      let tempValue =
        parseInt(value?.value) > -1 ? Math.abs(value?.value) : value?.value;
      return nf.format(tempValue);
    } else {
      let replaceCommaValue = (value?.value).toString().replace(",", "");
      let tempValue =
        parseFloat(replaceCommaValue) > -1
          ? Math.abs(replaceCommaValue)
          : replaceCommaValue;
      if (roundOffTo > 0) {
        return nf.format(Number.parseFloat(tempValue).toFixed(roundOffTo));
      } else {
        return nf.format((Math.round(tempValue * 100) / 100).toFixed(0));
      }
    }
  } else if (value?.value === 0) {
    return nf.format(value?.value);
  } else {
    return value?.value || "";
  }
};

export const dollarFormatter = function (value, roundOffTo) {
  //Function adds dollar sign in front of value
  //roundOffTo is used return value with dollar sign in front and with 1 or 2 or 3 decimal point
  const nf = getNumberFormatter(roundOffTo, roundOffTo, value);

  /**
   * This condition is added because in the grouped rows the value here is empty string and
   * Number("") is 0, thus it always returns 0 instead of null or empty string.
   */
  if (!value.value && value.value !== 0) {
    return value.value || "";
  }

  if (typeof value.value == Number || !isNaN(Number(value.value))) {
    let valsfor;
    const cellData = value.value;
    const toVal = Math.abs(value.value);
    if (toVal < 1 && toVal > -1) {
      valsfor = toVal.toFixed(roundOffTo);
    } else {
      valsfor = roundOffTo ? toVal : Math.round(toVal);
    }
    let newvalsfor = nf.format(Math.abs(Number(valsfor)).toFixed(roundOffTo));
    if (cellData > -1) {
      return "$" + newvalsfor;
    } else {
      return "-$" + newvalsfor;
    }
  } else {
    // Need to test this on other screens, please let me know if this change is breaking on any screens,
    return value?.value
      ? value?.value
      : value?.cell?.row?.subRows?.length > 0
      ? ""
      : "-";
  }
};

export const percentFormatter = function (
  value,
  roundOffTo,
  dontMultiply,
  displayBlank = false
) {
  //Used to multiply the given value by 100 and add percentage sign... "dontMultiply" key is used when we dont need the value to be multiplied by 100
  if (value && value.value && !isNaN(Number(value.value))) {
    let cellData;
    let multiplier = dontMultiply ? 1 : 100;
    if (typeof value.value == Number || !isNaN(Number(value.value))) {
      cellData = value.value;
      let newVal = (cellData * multiplier).toFixed(roundOffTo);
      if (Math.abs(Number(newVal)) === 0) {
        newVal = 0?.toFixed(roundOffTo);
      }
      return newVal + "%";
    } else {
      return value.value;
    }
  } else if (value.value === 0) {
    return value.value?.toFixed(roundOffTo) + "%";
  } else if (displayBlank && (value.value === null || isNaN(value.value))) {
    return "";
  } else {
    return "-";
  }
};

export const decimalsFormatter = function (
  x,
  toFix,
  shouldRoundOff,
  displayBlank = false
) {
  const nf = getNumberFormatter(toFix, toFix, x);
  if (displayBlank && (x.value === null || isNaN(x.value))) {
    return "";
  }
  if (x?.colDef?.extra?.displayActualValue) {
    return x.value;
  }
  //Function returns values with 2 decimal point
  //toFix key is  false used to return  with or without decimals based in toFix value
  if (toFix === 3) {
    if (x.value === null || isNaN(x.value)) return "-";
    else return parseFloat(x.value).toFixed(3);
  }
  if (x.value === 0) {
    return nf.format(0);
  } else if (x.value > 0) {
    if (toFix === 0) {
      return parseInt((Math.round(x.value * 100) / 100).toFixed());
    }
    // can be rounded off to n decimal places, by default 2
    let roundOffTo = x?.colDef?.extra?.hasOwnProperty("roundOffTo")
      ? x?.colDef?.extra?.roundOffTo
      : toFix
      ? toFix
      : 2;
    // to display upto n decimal places w/o rounding off the value
    if (x?.colDef?.extra?.doNotRoundOff)
      return parseFloat(x.value).toFixed(roundOffTo);
    else {
      let roundOffNumber = +("1" + "0".repeat(roundOffTo));
      let res = Math.round(x.value * roundOffNumber) / roundOffNumber;
      return shouldRoundOff ? nf.format(res) : res;
    }
  } else {
    /**
     * This condition is added because in the grouped rows the value here is empty string or
     * sometimes hyphen, thus want to return empty string for grouped rows and '-'(hyphen) for default
     */
    if (!x?.value || isNaN(Number(x?.value))) {
      if (x?.node?.group) {
        return "";
      }
      return "-";
    }
    if (toFix === 0 && x.value < 0) {
      return parseInt((Math.round(x.value * 100) / 100).toFixed());
    }
    if (
      toFix > 0 &&
      x.value < 0 &&
      (x.is_negative_value_allowed || !x.is_negative_value_allowed)
    ) {
      return shouldRoundOff
        ? nf.format(
            parseFloat((Math.round(x.value * 100) / 100).toFixed(toFix))
          )
        : parseFloat((Math.round(x.value * 100) / 100).toFixed(toFix));
    }
    return shouldRoundOff
      ? nf.format(parseFloat(x.value))
      : parseFloat(x.value);
  }
};

export const capitalize = (string) => {
  //Function used to capitalize the first letter
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};

export const capitalizeEachLetter = (string) => {
  //Function used to capitalize the first letter of each sting
  var splitStr = string.toLowerCase().split(" ");
  for (var i = 0; i < splitStr.length; i++) {
    // You do not need to check if i is larger than splitStr length, as your for does that for you
    // Assign it back to the array
    splitStr[i] =
      splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }
  // Directly return the joined string
  return splitStr.join(" ");
};

export const formattedDate = (date, format, currentDateFormat) => {
  return date && moment(date, DATE_FORMATS).isValid()
    ? moment(date, currentDateFormat ? currentDateFormat : DATE_FORMATS).format(
        format
      )
    : "-";
};

export const arrayToCommaFormatter = (value) => {
  if (value) {
    return value?.length ? value?.join(", ") : value;
  }
  return "";
};

export const setAllLabelFormatter = (value) => {
  //It removes "_ty" from the value and passes to attribute formatter
  return attributeFormatter(value ? value.replace("_ty", "") : "");
};

export const fileLabelFormatter = (value) => {
  const fileNameSplit = value.split(".");
  let extension = "";
  if (fileNameSplit.length > 1) {
    extension = fileNameSplit.pop();
  }
  const fileName = value.substr(0, value.lastIndexOf("."));
  switch (extension) {
    case "xlsx":
    case "csv":
      return (
        <span>
          <ArticleIcon fontSize="large" /> {fileName}
        </span>
      );
    case "pdf":
      return (
        <span>
          <InsertDriveFileIcon fontSize="large" /> {fileName}
        </span>
      );
    case "doc":
    case "txt":
      return (
        <span>
          <DescriptionIcon fontSize="large" /> {fileName}
        </span>
      );
    case "":
      const currentLocation = window.location;
      const currentPath = currentLocation.pathname;
      return (
        <span>
          <FolderIcon fontSize="large" />
          <Link to={`${currentPath}/${value}`}>{value}</Link>
        </span>
      );
    default:
      return (
        <span>
          <FileOpenIcon fontSize="large" /> {fileName}
        </span>
      );
  }
};

/**
 *
 * @param { size of the product } size
 * @returns size if size is not null or empty. Otherwise it returns N/A
 */
export const productSizeFormatter = (size) => {
  return size ? size : "N/A";
};

export const dataParser = (type, data) => {
  //Based on the type formats the data and returns
  switch (type) {
    case "float":
      return parseFloat(data || 0);
    case "int":
      return parseInt(data || 0);
    case "textToNum":
      return Math.round(data?.toString()?.replaceAll(",", "") || 0);
    case "textToNumWithDecimal":
      return parseFloat(data?.toString()?.replaceAll(",", "") || 0);
    default:
      return data;
  }
};

/**
 *
 * @param {String} channel - channel arg is of string type
 * @returns boolean - whether channel is Ecomm or wholesale or not
 */
export const isEcommOrWholeSale = (channel) => {
  return channel === "Ecom" || channel === "Wholesale";
};

export const replaceCharacter = (str, oldChar, newChar) => {
  return str.replace(oldChar, newChar);
};

export const groupByCustom = ({ Group: array, By: props }) => {
  const getGroupedItems = (item) => {
    let returnArray = [];
    for (let data of props) {
      returnArray.push(item[data]);
    }
    return returnArray;
  };

  let groups = {};
  if (array)
    for (let data of array) {
      const arrayRecord = data;
      const group = JSON.stringify(getGroupedItems(arrayRecord));
      groups[group] = groups[group] || [];
      groups[group].push(arrayRecord);
    }
  return Object.keys(groups).map((group) => {
    return groups[group];
  });
};

/**
 * adds plural character 's' based on count sent
 * @param {String} input - string Ex. User, Product
 * @param {int} count - count of string type
 * @returns String - returns singular or plural string
 */
export const getInputNoun = (input, count) => {
  return `${input}${count > 1 ? "s" : ""}`;
};

/**
 *
 * @param {str} string
 * @returns str
 *
 * This function captializes the string, i.e It will make first letter capital and rest of chars as
 * lower case, only if the first character is strictly lower case else it will return back the string
 */
export const captializeStringIfCamelCase = (string) => {
  const firstChar = string.charAt(0);
  if (firstChar === firstChar.toUpperCase()) {
    return string;
  }
  return capitalize(string);
};

/**
 *
 * @param {string or Array} listOrStr
 * @returns lower case values
 * This function takes in list or String as an argument
 * and converts those values to lower case. If the function
 * receives any other data structure/value, it will return
 * the value as it is without making any changes
 */
export const mapConvertToLowerCase = (listOrStr) => {
  if (Array.isArray(listOrStr)) {
    return listOrStr.map((element) => element.toLowerCase());
  }
  if (isString(listOrStr)) return listOrStr.toLowerCase();
  return listOrStr;
};
