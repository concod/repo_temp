import { common } from "modules/assortsmart/constants-assortsmart/stringContants";
import { Month_mapping_list } from "config/constants";

export const formatFileHierarchy = (path, action = null, icon = null) => {
  return {
    id: `${path}_scr`,
    label: path,
    icon: icon,
    action: action,
  };
};

/**
 *
 * @param {string} monthName
 * @returns index in the month constant list
 */
const findMonthIndex = (monthName) => {
  const normalizedInput = monthName.toLowerCase();
  return Month_mapping_list.findIndex((month) =>
    normalizedInput.startsWith(month.toLowerCase())
  );
};

/**
 *
 * @param {string} nameStr - can be month or year or month year pattern
 * @param {*} nameArray - name split array with space delimiter
 * @returns year value or month index
 */
const findMonthOrYearIndex = (nameStr, nameArray) => {
  const yearRegex = /^(?:\d{4})$/;
  if (yearRegex.test(nameStr)) {
    return nameArray[0];
  } else {
    return findMonthIndex(nameArray[0]);
  }
};
/**
 *
 * @param {first File Name} first
 * @param {second File Name} second
 * @returns order
 *
 * This methods takes in file objects and split the folder name into year and month and sorts based on
 * year and month
 *
 * Format Accepted - File Name should in space seperated format Ex: August 2019
 */
export const compareByYearMonth = (first, second) => {
  let firstYearMonthArray = first.name.split(" ");
  let secondYearMonthArray = second.name.split(" ");
  let firstMonth = -1;
  let secondMonth = -1;
  firstMonth = findMonthOrYearIndex(first.name, firstYearMonthArray);
  secondMonth = findMonthOrYearIndex(second.name, secondYearMonthArray);
  //If the years are not same, then return the year which is smaller
  if (firstYearMonthArray[1] !== secondYearMonthArray[1]) {
    return firstYearMonthArray[1] - secondYearMonthArray[1];
  }
  //If the years are same, then return the difference between month indexes
  return firstMonth - secondMonth;
};
