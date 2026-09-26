import React from "react";
import { Typography } from "@mui/material";
import { cloneDeep } from "lodash";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";

/**
 * Retrieves possible months and weeks based on date ranges and fiscal calendar details
 * @param {Array} dateRanges - Array of objects containing start_date and end_date
 * @param {Array} fiscalCalendarDetails - Array of fiscal calendar week objects
 * @param {number} [defaultWeekCount=26] - Number of weeks to return when no valid date ranges are provided
 * @returns {Object} Object containing arrays of possible weeks and months
 */
export const getPossibleMonthsAndWeeks = (
  dateRanges = [],
  fiscalCalendarDetails = [],
  displaySnackMessages,
  formatWeeksAsEndDate = false,
  defaultWeekCount = 26
) => {
  // Early return for empty fiscal calendar
  if (
    !Array.isArray(fiscalCalendarDetails) ||
    fiscalCalendarDetails.length === 0
  ) {
    displaySnackMessages("No fiscal calendar details provided", "info");
    return { possibleWeeks: [], possibleMonths: [], weekOptions: [] };
  }

  const possibleWeeks = new Set();
  const possibleMonths = new Set();
  const weekOptionsMap = new Map();

  // Helper function to safely convert any date format to timestamp
  const toTimestamp = (date) => {
    if (date === null || date === undefined) return null;
    if (typeof date === "number") return date;

    try {
      const dateObj = new Date(date);
      // Check for Unix epoch which could be from a null input
      if (
        dateObj.getTime() === 0 &&
        (date === null || date === "null" || date === "")
      ) {
        return null;
      }
      return isNaN(dateObj.getTime()) ? null : dateObj.getTime();
    } catch (e) {
      console.log("error: ", e);
      displaySnackMessages(ERROR_MESSAGE, "error");
      return null;
    }
  };

  // Helper function to format fiscal week end date as "WE MM-DD-YYYY"
  const formatWeekEndDate = (fiscalWeekEndDate) => {
    try {
      if (!fiscalWeekEndDate) return null;
      const endDate = new Date(fiscalWeekEndDate);
      if (isNaN(endDate.getTime())) return null;

      const month = (endDate.getMonth() + 1).toString().padStart(2, "0");
      const day = endDate.getDate().toString().padStart(2, "0");
      const year = endDate.getFullYear();

      return `WE ${month}-${day}-${year}`;
    } catch (e) {
      console.log("Error formatting week end date: ", e);
      return null;
    }
  };

  // Helper function to add week with proper mapping
  const addWeekWithMapping = (week) => {
    const originalValue = week.fiscal_year_week;
    possibleWeeks.add(originalValue);

    if (formatWeeksAsEndDate) {
      const formattedLabel = formatWeekEndDate(week.fiscal_week_end_date);
      if (formattedLabel) {
        weekOptionsMap.set(originalValue, formattedLabel);
      } else {
        weekOptionsMap.set(originalValue, originalValue); // Fallback to original
      }
    } else {
      weekOptionsMap.set(originalValue, originalValue);
    }
  };

  // Helper function to check if a date is valid
  const isValidDate = (date) =>
    date !== null && date !== undefined && toTimestamp(date) !== null;

  // Helper function to get fiscal week timestamps with error handling
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
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  // Process date ranges if provided
  if (Array.isArray(dateRanges) && dateRanges.length > 0) {
    const validDateRanges = dateRanges.filter(
      (range) =>
        range &&
        typeof range === "object" &&
        "start_date" in range &&
        "end_date" in range &&
        isValidDate(range.start_date) &&
        isValidDate(range.end_date)
    );

    // Log information about invalid date ranges
    if (dateRanges.length > validDateRanges.length) {
      console.log(
        `Filtered out ${
          dateRanges.length - validDateRanges.length
        } invalid date ranges`
      );
    }

    // Process each valid date range
    validDateRanges.forEach(({ start_date, end_date }) => {
      const startTimestamp = toTimestamp(start_date);
      const endTimestamp = toTimestamp(end_date);

      if (startTimestamp === null || endTimestamp === null) return;

      // Ensure start date is before end date
      if (startTimestamp > endTimestamp) {
        console.log("Warning: Start date is after end date, skipping range");
        return;
      }

      // Find weeks and months within range
      fiscalCalendarDetails.forEach((week) => {
        try {
          const weekTimestamps = getFiscalWeekTimestamps(week);
          if (!weekTimestamps) return;

          const {
            beginTimestamp,
            endTimestamp: weekEndTimestamp,
          } = weekTimestamps;

          // Add week and month if it falls within the date range
          if (
            beginTimestamp >= startTimestamp &&
            weekEndTimestamp <= endTimestamp
          ) {
            addWeekWithMapping(week);
            addMonthFromTimestamp(beginTimestamp);
          }
        } catch (error) {
          console.error("Error processing fiscal week:", error);
        }
      });
    });
  }

  // If no valid date ranges processed, get next N weeks from current date
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

      // Second try: find the closest past or future week
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

    if (currentWeek) {
      // Create a map for quick week lookup
      const weekMap = new Map();
      fiscalCalendarDetails.forEach((week) => {
        try {
          if (!("fiscal_year_week" in week)) {
            console.log(
              `Missing fiscal_year_week property in week object: ${JSON.stringify(
                week
              )}`
            );
          }
          weekMap.set(week.fiscal_year_week, week);
        } catch (error) {
          console.error("Error creating week map:", error);
        }
      });

      // Helper functions for week format validation and parsing
      const isValidWeekFormat = (weekNum) =>
        typeof weekNum === "number" ||
        (typeof weekNum === "string" && !isNaN(parseInt(weekNum, 10)));

      const parseWeekNumber = (weekNum) =>
        typeof weekNum === "number" ? weekNum : parseInt(weekNum, 10);

      // Only proceed if the current week has a valid format
      if (isValidWeekFormat(currentWeek.fiscal_year_week)) {
        let weekNumber = parseWeekNumber(currentWeek.fiscal_year_week);
        let weeksAdded = 0;
        const processedWeeks = new Set(); // Prevent infinite loops

        while (
          weeksAdded < defaultWeekCount &&
          !processedWeeks.has(weekNumber)
        ) {
          processedWeeks.add(weekNumber);
          const weekDetails = weekMap.get(weekNumber);

          if (!weekDetails) {
            console.log("No more weeks available");
            break;
          }

          addWeekWithMapping(weekDetails);

          // Add month for this week
          try {
            const weekTimestamps = getFiscalWeekTimestamps(weekDetails);
            if (weekTimestamps) {
              addMonthFromTimestamp(weekTimestamps.beginTimestamp);
            }
          } catch (error) {
            console.error("Error processing week details:", error);
          }

          try {
            // Parse and validate week number format
            const currentYear = Math.floor(weekNumber / 100);
            const weekInYear = weekNumber % 100;

            if (isNaN(currentYear) || isNaN(weekInYear)) {
              console.log(
                "Invalid format, can't continue",
                currentYear,
                weekInYear
              );
              break;
            }

            // Find weeks in the current year
            const weeksInCurrentYear = fiscalCalendarDetails
              .filter((week) => {
                try {
                  if (!isValidWeekFormat(week.fiscal_year_week)) return false;
                  const weekYear = Math.floor(
                    parseWeekNumber(week.fiscal_year_week) / 100
                  );
                  return weekYear === currentYear;
                } catch (error) {
                  console.error("Error filtering weeks:", error);
                  return false;
                }
              })
              .map((week) => parseWeekNumber(week.fiscal_year_week) % 100);

            if (weeksInCurrentYear.length === 0) break;

            const weeksInYear = Math.max(...weeksInCurrentYear);

            // Calculate next week, handling year rollover if needed
            if (weekInYear === weeksInYear) {
              const nextYear = currentYear + 1;
              const nextYearFirstWeek = nextYear * 100 + 1;

              if (!weekMap.has(nextYearFirstWeek)) {
                console.log("Next year not available");
                break;
              }

              weekNumber = nextYearFirstWeek;
            } else {
              const nextWeek = weekNumber + 1;

              if (!weekMap.has(nextWeek)) {
                console.log("Next week not available");
                break;
              }

              weekNumber = nextWeek;
            }
          } catch (e) {
            console.log("error: ", e);
            break;
          }

          weeksAdded++;
        }
      }
    }
  }

  // Create week options array with proper label/value mapping
  const weekOptions = Array.from(possibleWeeks).map((weekValue) => ({
    label: weekOptionsMap.get(weekValue) || weekValue,
    value: weekValue,
  }));

  return {
    possibleWeeks: Array.from(possibleWeeks),
    possibleMonths: Array.from(possibleMonths),
    weekOptions: weekOptions,
  };
};

export const getTabProps = (tabOption) => {
  return {
    id: `simple-tab-${tabOption?.label}`,
    label: tabOption?.label,
    value: tabOption?.value,
    "aria-controls": `simple-tabpanel-${tabOption?.label}`,
  };
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

export const createTableHeader = (label, value) => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Typography
        style={{ fontSize: "12px", fontWeight: "500", lineHeight: "14px" }}
      >
        {label}: &nbsp;{" "}
      </Typography>
      <Typography
        style={{ fontSize: "14px", fontWeight: "700", lineHeight: "14px" }}
      >
        {replaceSpecialCharacter(value)}
      </Typography>
    </div>
  );
};

export const displayCreateScenarioFootNote = (isTablePaginated = false) => {
  return (
    <Typography
      variant="body2"
      component="p"
      sx={{
        color: "text.secondary",
        fontStyle: "italic",
        ...(!isTablePaginated && { marginBottom: "1rem" }),
      }}
    >
      Note: Clicking <strong>Apply</strong> under{" "}
      <strong>Create Scenario</strong> overrides recommendations for the{" "}
      <strong>first upcoming order cycle</strong> only.
    </Typography>
  );
};

/**
 * Utility function to validate pack ID
 * @param {Object} selectedSubClass - The selected subclass object
 * @returns {Object} Object containing hasPackId and isPackIdValid boolean values
 */
export const validatePackId = (selectedSubClass) => {
  const hasPackId = selectedSubClass?.pack_id;
  const isPackIdValid = hasPackId && hasPackId !== "WP";
  return { hasPackId, isPackIdValid };
};

export const getFormattedDataForDownload = (dataResponse) => {
  const data = cloneDeep(dataResponse);
  let formattedData = agGridRowFormatter(data);
  formattedData = formattedData.map((obj) =>
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        typeof value === "string" ? replaceSpecialCharacter(value) : value,
      ])
    )
  );
  return formattedData;
};

export const addSelectedHierarchyToFilters = (
  highLevelSummaryState,
  filters
) => {
  try {
    const hierarchyName = highLevelSummaryState?.level_of_hierarchy_id;
    const hierarchyValue = highLevelSummaryState?.level_of_hierarchy_value;
    const sublevelsHierarchyFilters =
      highLevelSummaryState?.applied_filters_for_sublevels_hierarchy;

    if (!Array.isArray(filters)) return [];

    if (!hierarchyName || !hierarchyValue) return filters;

    if (!highLevelSummaryState?.show_sublevels_hierarchy_columns)
      return filters;

    if (
      Array.isArray(sublevelsHierarchyFilters) &&
      sublevelsHierarchyFilters.length
    ) {
      sublevelsHierarchyFilters.forEach((sublevelFilter) => {
        const attributeName = sublevelFilter?.attribute_name;
        const hasValues = Array.isArray(sublevelFilter?.values);
        if (!attributeName || !hasValues) return;

        const existingIndex = filters.findIndex(
          (f) => f?.attribute_name === attributeName
        );

        if (existingIndex >= 0) {
          filters[existingIndex].values = cloneDeep(sublevelFilter.values);
        } else {
          filters.push(cloneDeep(sublevelFilter));
        }
      });
    }

    const hierarchyFilterIndex = filters.findIndex(
      (data) => data?.attribute_name === hierarchyName
    );

    if (hierarchyFilterIndex >= 0) {
      filters[hierarchyFilterIndex].values = [
        replaceSpecialCharToCharCode(hierarchyValue),
      ];
      return filters;
    }

    filters.push({
      attribute_name: hierarchyName,
      dimension: "Product",
      filter_type: "cascaded",
      operator: "in",
      values: [replaceSpecialCharToCharCode(hierarchyValue)],
    });
    return filters;
  } catch (error) {
    console.log("Error in addSelectedHierarchyToFilters", error);
    return filters;
  } finally {
    return filters;
  }
};
