import moment from "moment";
import { END_DATE } from "config/constants";
import { displaySnackMessages } from "core/Utils/utils";

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

/**
 * Renders a range as "start - end" so notifications can name the range that
 * caused a conflict.
 */
export const formatDateRangeLabel = (range, displayFormat = "YYYY-MM-DD") =>
  `${moment(range?.start_time).format(displayFormat)} - ${moment(
    range?.end_time
  ).format(displayFormat)}`;

/**
 * Finds the first range in the list that shares any day with the candidate.
 * Unlike isDateRangeConflict this returns the offending range rather than a
 * boolean, so the caller can name it in the conflict notification.
 *
 * Ranges that merely touch on a single day are treated as overlapping, matching
 * the "[]" inclusivity used elsewhere for status ranges.
 *
 * @param {Object} candidate - { start_time, end_time }
 * @param {Array} ranges - other ranges to compare against
 * @param {String} dateFormat - format of the incoming date strings
 * @returns {Object|null} the overlapping range, or null when there is none
 */
export const findOverlappingRange = (
  candidate,
  ranges = [],
  dateFormat = "YYYY-MM-DD"
) => {
  const start = moment(candidate?.start_time, dateFormat);
  const end = moment(candidate?.end_time, dateFormat);
  if (!start.isValid() || !end.isValid()) {
    return null;
  }

  return (
    (ranges || []).find((range) => {
      // Guards against the candidate being compared with itself when the
      // caller passes the full list.
      if (!range || range === candidate) {
        return false;
      }
      const rangeStart = moment(range.start_time, dateFormat);
      const rangeEnd = moment(range.end_time, dateFormat);
      if (!rangeStart.isValid() || !rangeEnd.isValid()) {
        return false;
      }
      return !(
        end.isBefore(rangeStart, "day") || rangeEnd.isBefore(start, "day")
      );
    }) || null
  );
};

/**
 * True when the range sits entirely inside the base range. Incomplete or
 * invalid dates return true so that partially filled rows are reported by the
 * required-field checks rather than as containment failures.
 */
export const isRangeWithin = (range, baseRange, dateFormat = "YYYY-MM-DD") => {
  const start = moment(range?.start_time, dateFormat);
  const end = moment(range?.end_time, dateFormat);
  const baseStart = moment(baseRange?.start_time, dateFormat);
  const baseEnd = moment(baseRange?.end_time, dateFormat);

  if (
    !start.isValid() ||
    !end.isValid() ||
    !baseStart.isValid() ||
    !baseEnd.isValid()
  ) {
    return true;
  }

  return !start.isBefore(baseStart, "day") && !end.isAfter(baseEnd, "day");
};

/**
 * Runs the three checks a status date range must pass before it can be saved,
 * in the order they are specified:
 *  1. the range must not overlap any other normal range on the same record
 *  2. its exclude ranges must not overlap each other
 *  3. its exclude ranges must stay inside the range itself
 *
 * @returns {Object|null} null when valid, otherwise { type, conflict, range }
 * where type is one of "rangeOverlap" | "excludeOverlap" | "excludeOutsideBase"
 */
export const validateStatusDateRanges = ({
  range,
  exclusions = [],
  otherRanges = [],
  dateFormat = "YYYY-MM-DD",
}) => {
  const overlappingRange = findOverlappingRange(range, otherRanges, dateFormat);
  if (overlappingRange) {
    return { type: "rangeOverlap", conflict: overlappingRange, range };
  }

  const excludeList = exclusions || [];
  for (let index = 0; index < excludeList.length; index++) {
    const others = excludeList.filter((_, position) => position !== index);
    const overlappingExclude = findOverlappingRange(
      excludeList[index],
      others,
      dateFormat
    );
    if (overlappingExclude) {
      return {
        type: "excludeOverlap",
        conflict: overlappingExclude,
        range: excludeList[index],
      };
    }
  }

  const outsideBase = excludeList.find(
    (exclusion) => !isRangeWithin(exclusion, range, dateFormat)
  );
  if (outsideBase) {
    return { type: "excludeOutsideBase", conflict: range, range: outsideBase };
  }

  return null;
};

export const isValidDate = (date) => {
  // Check if the date is a Date instance and not 'Invalid Date'
  return date instanceof Date && !isNaN(date.getTime());
}

export const dateValidation = (startDate, endDate, dispatch) => {
  const errMessage = dateValidationMessage(startDate, endDate);
  if (errMessage) {
    displaySnackMessages(errMessage, "error", dispatch);
    return false;
  }
  return true;
};