import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";

/**
 * @param {Array} dateRanges - Array of objects containing start_date and end_date
 * @param {Array} fiscalCalendarDetails - Array of fiscal calendar week objects
 * @param {Function} displaySnackMessages - Function to display error messages
 * @param {number} [defaultWeekCount=26] - Number of weeks to return when no valid date ranges are provided
 * @returns {Object} Object containing arrays of possible weeks and months
 */
export const getPossibleMonthsAndWeeks = (
  dateRanges = [],
  fiscalCalendarDetails = [],
  displaySnackMessages,
  defaultWeekCount = 26
) => {
  // Early return for empty fiscal calendar
  if (
    !Array.isArray(fiscalCalendarDetails) ||
    fiscalCalendarDetails.length === 0
  ) {
    if (displaySnackMessages) {
      displaySnackMessages("No fiscal calendar details provided", "info");
    }
    return { possibleWeeks: [], possibleMonths: [] };
  }

  const possibleWeeks = new Set();
  const possibleMonths = new Set();

  const toTimestamp = (date) => {
    if (date === null || date === undefined) return null;
    if (typeof date === "number") return date;

    try {
      const dateObj = new Date(date);
      if (
        dateObj.getTime() === 0 &&
        (date === null || date === "null" || date === "")
      ) {
        return null;
      }
      return isNaN(dateObj.getTime()) ? null : dateObj.getTime();
    } catch (e) {
      console.log("error: ", e);
      if (displaySnackMessages) {
        displaySnackMessages("Error processing date", "error");
      }
      return null;
    }
  };

  const isValidDate = (date) =>
    date !== null && date !== undefined && toTimestamp(date) !== null;

  const getFiscalWeekTimestamps = (week) => {
    const beginTimestamp = toTimestamp(week.fiscal_week_begin_date);
    const endTimestamp = toTimestamp(week.fiscal_week_end_date);

    return beginTimestamp === null || endTimestamp === null
      ? null
      : { beginTimestamp, endTimestamp };
  };

  // Helper function to add months based on timestamp
  const addMonthFromTimestamp = (timestamp) => {
    try {
      const month = new Date(timestamp).toLocaleString("en-US", {
        month: "long",
      });
      possibleMonths.add(month);
    } catch (e) {
      console.log("error: ", e);
      if (displaySnackMessages) {
        displaySnackMessages("Error processing month", "error");
      }
    }
  };

  // Helper function to add weeks and months based on the given date range
  const addWeeksAndMonths = (startDate, endDate) => {
    const startTimestamp = toTimestamp(startDate);
    const endTimestamp = toTimestamp(endDate);

    if (!startTimestamp || !endTimestamp) return;

    fiscalCalendarDetails.forEach((week) => {
      try {
        const weekTimestamps = getFiscalWeekTimestamps(week);
        if (!weekTimestamps) return;

        const {
          beginTimestamp,
          endTimestamp: weekEndTimestamp,
        } = weekTimestamps;

        // Add week if it falls within the date range
        if (
          beginTimestamp >= startTimestamp &&
          weekEndTimestamp <= endTimestamp
        ) {
          possibleWeeks.add(week.fiscal_year_week);
          addMonthFromTimestamp(beginTimestamp);
        }
      } catch (error) {
        console.error("Error processing fiscal week:", error);
      }
    });
  };

  // Filter and validate the date ranges provided as input
  const validDateRanges = (dateRanges || []).filter((range) => {
    return (
      range &&
      range.start_date &&
      range.end_date &&
      isValidDate(range.start_date) &&
      isValidDate(range.end_date)
    );
  });

  // Process each valid date range
  validDateRanges.forEach(({ start_date, end_date }) =>
    addWeeksAndMonths(start_date, end_date)
  );

  if (possibleWeeks.size === 0 && fiscalCalendarDetails.length > 0) {
    const currentDate = Date.now();

    // Find the current fiscal week
    const findCurrentWeek = () => {
      // First try: find the week that contains today's date
      for (const week of fiscalCalendarDetails) {
        try {
          const weekTimestamps = getFiscalWeekTimestamps(week);
          if (!weekTimestamps) continue;

          const { beginTimestamp, endTimestamp } = weekTimestamps;
          if (currentDate >= beginTimestamp && currentDate <= endTimestamp) {
            return week;
          }
        } catch (error) {
          console.error("Error processing fiscal week:", error);
          continue;
        }
      }

      // Process the next 26 fiscal weeks
      let closestPastWeek = null;
      let smallestPastDiff = Infinity;
      let closestFutureWeek = null;
      let smallestFutureDiff = Infinity;

      for (const week of fiscalCalendarDetails) {
        try {
          const weekTimestamps = getFiscalWeekTimestamps(week);
          if (!weekTimestamps) continue;

          const { beginTimestamp } = weekTimestamps;
          const diff = beginTimestamp - currentDate;

          // Past week (closest start date before current date)
          if (diff <= 0 && Math.abs(diff) < smallestPastDiff) {
            smallestPastDiff = Math.abs(diff);
            closestPastWeek = week;
          }

          // Future week (closest start date after current date)
          if (diff > 0 && diff < smallestFutureDiff) {
            smallestFutureDiff = diff;
            closestFutureWeek = week;
          }
        } catch (error) {
          console.error("Error processing fiscal week:", error);
          continue;
        }
      }

      // Prefer past week, fall back to future week or first week
      return closestPastWeek || closestFutureWeek || fiscalCalendarDetails[0];
    };

    const currentWeek = findCurrentWeek();
    if (!currentWeek) {
      console.warn("No current week found");
      return { possibleWeeks: [], possibleMonths: [] };
    }

    // Add weeks starting from current week
    fiscalCalendarDetails.forEach((week) => {
      try {
        const weekTimestamps = getFiscalWeekTimestamps(week);
        if (!weekTimestamps) return;

        if (week.fiscal_year_week >= currentWeek.fiscal_year_week) {
          possibleWeeks.add(week.fiscal_year_week);
          addMonthFromTimestamp(weekTimestamps.beginTimestamp);
        }
      } catch (error) {
        console.error("Error processing fiscal week:", error);
      }
    });

    if (possibleWeeks.size > defaultWeekCount) {
      const sortedWeeks = Array.from(possibleWeeks).sort((a, b) => a - b);
      possibleWeeks.clear();
      sortedWeeks
        .slice(0, defaultWeekCount)
        .forEach((week) => possibleWeeks.add(week));
    }
  }

  const result = {
    possibleWeeks: Array.from(possibleWeeks).sort((a, b) => a - b),
    possibleMonths: Array.from(possibleMonths),
  };

  return result;
};

export const getValidCheckConfiguration = (checkConfiguration) => {
  let validCheckConfiguration = [];
  if (Array.isArray(checkConfiguration)) {
    validCheckConfiguration = checkConfiguration.filter(
      (item) => item !== null && item !== undefined
    );
  }
  if (validCheckConfiguration.length === 0) return [];
  else return validCheckConfiguration;
};

export const getHighLevelSummaryHierarchyFilter = (hierarchyInfo) => {
  if (
    hierarchyInfo?.level_of_hierarchy_value &&
    hierarchyInfo?.level_of_hierarchy_id
  ) {
    const hierarchyFilter = {
      filter_type: "cascaded",
      attribute_name: hierarchyInfo.level_of_hierarchy_id,
      operator: "in",
      dimension: "Product",
      values: [
        replaceSpecialCharToCharCode(hierarchyInfo.level_of_hierarchy_value),
      ],
    };
    return hierarchyFilter;
  }
  return;
};
