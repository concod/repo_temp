import moment from "moment";

/**
 * getDefaultDate returns us a object which will contain
 * formatted startDate and endDate.
 * If the endWeekDate params is present then the params
 * endDate will be considered or else by defailt it will
 * consider today's date
 * @param {Date | null} endWeekDate
 * @returns
 */
export const getDefaultDate = (endWeekDate) => {
  try {
    let date = new Date();
    let startDate = `${moment(date)
      .subtract(1, "years")
      .format("YYYY-MM-DD")} 00:00:00.000`;
    let endDate = endWeekDate
      ? `${endWeekDate} 23:59:59.000`
      : `${moment(date).format("YYYY-MM-DD")} 23:59:59.000`;

    return {
      start_date: startDate,
      end_date: endDate,
    };
  } catch (error) {
    console.error("getDefaultDate error", error);
  }
};

/**
 * getStartAndEndDateOfAnyWeekFromCurrentYear is used to get the
 * start and end date of any week
 * @param {object} dateRangeData is the data object
 * @param {number} weeksNumberFromEnd will be used to subtract the weeks length and use that
 * subtracted value as an index of the week to get that weeks data
 * @returns
 */
export const getStartAndEndDateOfAnyWeekFromCurrentYear = (
  dateRangeData,
  weeksNumberFromEnd
) => {
  try {
    let currentYear = dateRangeData?.year[dateRangeData?.year.length - 1];
    let week =
      currentYear?.weeks[currentYear?.weeks.length - weeksNumberFromEnd];
    let startDate = week.start_date;
    let endDate = week.end_date;
    return {
      start_date: startDate,
      end_date: endDate,
    };
  } catch (error) {
    console.error("getStartAndEndDateOfAnyWeekFromCurrentYear error:", error);
  }
};

/**
 * getAllDataOfTickets function is used to get
 * all the data of tickets based on status,
 * priority and detailedStatus
 * @param {Array} tickets
 * @returns an object containing all the data
 */
export const getAllDataOfTickets = (tickets) => {
  try {
    let openTickets = [];
    let status = {
      open: 0,
      closed: 0,
    };

    let priority = {
      emergency: 0,
      urgent: 0,
      normal: 0,
      low: 0,
    };

    let detailedStatus = {
      "in progress": 0,
      "information requested": 0,
      solved: 0,
      new: 0,
    };

    tickets.forEach((ticket) => {
      const isValidDate = moment(ticket.closed_on, "YYYY-MM-DD").isValid();
      if (isValidDate) {
        status.closed += 1;
      } else {
        status.open += 1;
        openTickets.push(ticket);
      }
    });

    openTickets.forEach((ticket) => {
      priority[ticket.priority] += 1;
      detailedStatus[ticket.status] += 1;
    });

    return {
      ...status,
      ...priority,
      ...detailedStatus,
    };
  } catch (error) {
    console.error("getDataTillCurrentAndLastWeek error:", error);
  }
};

/**
 * getPercentageDifference is function which
 * takes two object as a arguments which contains the data of the
 * currentWeek and lastWeek, then the percentage difference
 * between these data is calculated
 * @param {object} currentWeek
 * @param {object} lastWeek
 * @returns the object which contains
 * data of the calculated percentages
 */
export const getPercentageDifference = (currentWeek, lastWeek) => {
  try {
    let finalObj = {};
    for (const key in currentWeek) {
      for (const property in lastWeek) {
        if (property === key) {
          finalObj[key + "Percent"] = calculatePercentageChange(
            lastWeek[property],
            currentWeek[key]
          );
          break;
        }
      }
    }
    return finalObj;
  } catch (error) {
    console.error("getPercentageDifference error:", error);
  }
};

/**
 * calculatePercentageChange is a function which
 * calculates the percentage difference between
 * the previouseWeek number and currentWeek number
 * @param {number} previousWeek
 * @param {number} currentWeek
 * @returns the calculated percentage difference.
 */
const calculatePercentageChange = (previousWeek, currentWeek) => {
  if (previousWeek === 0 && currentWeek > 0) {
    return currentWeek.toFixed(2);
  }
  if (previousWeek === 0) {
    return currentWeek === 0 ? 0 : Infinity; // Handle division by zero
  }

  const changePercentage = ((currentWeek - previousWeek) / previousWeek) * 100;
  return changePercentage.toFixed(2);
};
