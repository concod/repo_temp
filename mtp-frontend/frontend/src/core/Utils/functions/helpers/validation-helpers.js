import moment from "moment";
import { END_DATE } from "config/constants";

/**
 * Add validation functions here
 */

export const dateValidationMessage = (startDate, endDate) => {
  let errMessage = "";
  startDate = moment(startDate);
  endDate = moment(endDate);
  if (
    !startDate.isValid() ||
    !endDate.isValid() ||
    startDate.isAfter(END_DATE, "year") ||
    endDate.isAfter(END_DATE, "year")
  ) {
    errMessage = "Invaid date entered";
  } else if (endDate.isBefore(startDate)) {
    errMessage = "To date must be greater than from date";
  }
  return errMessage;
};

/**
 * returns true,false if dates in list overlap each other
 * @param {Array} inputList - array { object, { start_time: "string", end_time: "string"} ...}
 * [
 *  { start_time: "2022/04/03", end_time: "2022/05/03" },
 *  { start_time: "2022/02/03", end_time: "2022/03/03" },
 * ]
 * @param {String} dateFormat - format of dates in input list Ex. "YYYY-MM-DD", "DD-MM-YYYY"
 * @param {String} inclusivity - "[" indicates inclusion of a value and "(" indicates exclusion.
 * Example. "[]", "[)" "()", "(]". Please refer moment js docs for more info on inclusivity param.
 * "[]" means that both start date and end date are included in range
 *
 * @returns Boolean - returns true if overlap is present in date ranges, and false otherwise
 */

export const isDateRangeConflict = (inputList, dateFormat, inclusivity) => {
  let hasConflict = false;

  inputList.sort((a, b) =>
    moment(a.start_time, dateFormat).diff(moment(b.start_time, dateFormat))
  );

  for (let i = 0; i < inputList.length - 1; i++) {
    const dateRangeOne = inputList[i];
    const dateRangeTwo = inputList[i + 1];
    if (
      !(
        moment(dateRangeOne.end_time).isBefore(
          moment(dateRangeTwo.start_time)
        ) ||
        moment(dateRangeTwo.end_time).isBefore(moment(dateRangeOne.start_time))
      )
    ) {
      hasConflict = true;
      break;
    }
  }

  return hasConflict;
};

/**
 * checks if input date is in between the input range
 * returns true if date lies in between range, and false otherwise
 */

const isDateBetween = (date, dateRange, inclusivity) => {
  return moment(date).isBetween(
    dateRange.start_time,
    dateRange.end_time,
    undefined,
    inclusivity
  );
};

export const isValidDate = (date) => {
  // Check if the date is a Date instance and not 'Invalid Date'
  return date instanceof Date && !isNaN(date.getTime());
}
