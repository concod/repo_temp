import moment from "moment";
import styled from "styled-components";
import { chartData as chartInfo } from "./constants";
import { cloneDeep } from "lodash";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

/**
 * getDefaultDate gives the startDate starting from last month till todays date
 * which will be the end date.
 * It is used to give default date when no dates are mentioned
 * @returns Object containing startDate and EndDate
 */
export const getDefaultDate = () => {
  try {
    let date = new Date();
    let startDate = `${moment(date)
      .subtract(1, "months")
      .format("YYYY-MM-DD")} 00:00:00.000`;
    let endDate = `${moment(date).format("YYYY-MM-DD")} 23:59:59.000`;

    return {
      start_date: startDate,
      end_date: endDate,
    };
  } catch (error) {
    console.error("getDefaultDate error", error);
  }
};

/**
 * getLast24HoursDateRange function will
 * return a object which contains start_date
 * which is the date 24 hours before from current
 * date and end_date is current date
 * @returns
 */
export const getLast24HoursDateRange = () => {
  try {
    let date = new Date();
    let startDate = `${moment(date)
      .subtract(24, "hours")
      .format("YYYY-MM-DD")} 00:00:00.000`;
    let endDate = `${moment(date).format("YYYY-MM-DD")} 23:59:59.000`;
    return {
      start_date: startDate,
      end_date: endDate,
    };
  } catch (error) {
    console.error("getLast24HoursDateRange error:", error);
  }
};

/**
 * getFormattedDate formats the date into this format "YYYY-MM-DD 00:00:00.000"
 * for startDate and this format "YYYY-MM-DD 23:59:59.000" for endDate and returns them
 * in a object
 * @param {Date} date
 * @returns
 */
export const getFormattedDate = (startDateInfo, endDateInfo) => {
  try {
    let date = new Date();
    let startDate = `${startDateInfo.format("YYYY-MM-DD")} 00:00:00.000`;
    let endDate = endDateInfo ? `${endDateInfo.format("YYYY-MM-DD")} 23:59:59.000` : `${moment(date).format("YYYY-MM-DD")} 23:59:59.000`;

    return {
      start_date: startDate,
      end_date: endDate,
    };
  } catch (error) {
    console.error("getFormattedDate error", error);
  }
};

/**
 * dummy chartData object with empty categories and series which
 * will be used to append graph data to it
 */
export const chartData = cloneDeep(chartInfo);

/**
 * getGraphData will prepare the required graph data and append that data to the chartData
 * object and return it
 * @param {Array} ticketData contains all the tickets in this Array
 * @param {object} dateRange contains all years, months, weeks data in it
 * @param {string} viewType it will say whether the viewType is Historic or Current
 * @param {string} viewBy it will say whether the viewBy is Week/Month/Quarter
 * @param {object} appliedFilterData it will contain the applied filter data
 * @returns the GraphData
 */
export const getGraphData = (
  ticketData,
  dateRange,
  viewType,
  viewBy,
  appliedFilterData
) => {
  try {
    let weeks = [];
    let months = [];
    let quarters = [];
    let open = [];
    let closed = [];

    let xAxisValues = getWeeksMonthsQuartersArrays(dateRange);
    weeks = xAxisValues.weeks;
    months = xAxisValues.months;
    quarters = xAxisValues.quarters;

    if (viewType === "Current") {
      let totalOpen = 0;
      let totalClosed = 0;
      let openTickets = [];
      let closedTickets = [];
      let totalTicketsOpenAndClosed = getTotalNumberOfOpenAndClosedTickets(
        ticketData
      );
      totalOpen = totalTicketsOpenAndClosed.open;
      totalClosed = totalTicketsOpenAndClosed.closed;
      openTickets = totalTicketsOpenAndClosed.openTickets;
      closedTickets = totalTicketsOpenAndClosed.closedTickets;

      if (viewBy === "Week") {
        open = Array(weeks.length).fill(0);
        closed = Array(weeks.length).fill(0);
        let plottingData = getPlottingData(
          dateRange,
          openTickets,
          closedTickets,
          open,
          closed,
          "weeks",
          "week",
          weeks,
          "FW"
        );
        open = plottingData.open;
        closed = plottingData.closed;
        chartData.xAxis.categories = weeks;
      } else if (viewBy === "Month") {
        open = Array(months.length).fill(0);
        closed = Array(months.length).fill(0);
        let plottingData = getPlottingData(
          dateRange,
          openTickets,
          closedTickets,
          open,
          closed,
          "months",
          "month",
          months,
          "FM"
        );
        open = plottingData.open;
        closed = plottingData.closed;
        chartData.xAxis.categories = months;
      } else if (viewBy === "Quarter") {
        open = Array(quarters.length).fill(0);
        closed = Array(quarters.length).fill(0);
        let plottingData = getPlottingData(
          dateRange,
          openTickets,
          closedTickets,
          open,
          closed,
          "quarters",
          "quarter",
          quarters,
          "Q"
        );
        open = plottingData.open;
        closed = plottingData.closed;
        chartData.xAxis.categories = quarters;
      }
    }

    if (viewType === "Historic") {
      if (viewBy === "Week") {
        open = Array(weeks.length).fill(0);
        closed = Array(weeks.length).fill(0);
        dateRange?.year.forEach((yearData) => {
          yearData.weeks.forEach((weekData) => {
            ticketData.forEach((ticket) => {
              let startDate = new Date(weekData.start_date);
              let endDate = new Date(weekData.end_date);
              let targetDate;
              if (moment(ticket.created_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                targetDate = convertToISODate(ticket.created_on);
              } else {
                targetDate = new Date(ticket.created_on);
              }
              if (
                appliedFilterData &&
                Object.keys(appliedFilterData).includes("status")
              ) {
                if (
                  appliedFilterData.status.includes("new") ||
                  appliedFilterData.status.includes("on hold") ||
                  appliedFilterData.status.includes("information requested") ||
                  appliedFilterData.status.includes("in progress") ||
                  appliedFilterData.status.includes("solved")
                ) {
                  if (isDateInRange(startDate, endDate, targetDate)) {
                    let index = weeks.findIndex(
                      (elem) => elem === `FW${weekData.week}-${yearData.id}`
                    );
                    open[index] += 1;
                  }
                }
                if (appliedFilterData.status.includes("closed")) {
                  if (moment(ticket.closed_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                    targetDate = convertToISODate(ticket.closed_on);
                  } else {
                    targetDate = new Date(ticket.closed_on);
                  }
                  if (isDateInRange(startDate, endDate, targetDate)) {
                    let index = weeks.findIndex(
                      (elem) => elem === `FW${weekData.week}-${yearData.id}`
                    );
                    closed[index] += 1;
                  }
                }
              } else {
                if (isDateInRange(startDate, endDate, targetDate)) {
                  let index = weeks.findIndex(
                    (elem) => elem === `FW${weekData.week}-${yearData.id}`
                  );
                  open[index] += 1;
                }
                if (moment(ticket.closed_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                  targetDate = convertToISODate(ticket.closed_on);
                } else {
                  targetDate = new Date(ticket.closed_on);
                }
                if (isDateInRange(startDate, endDate, targetDate)) {
                  let index = weeks.findIndex(
                    (elem) => elem === `FW${weekData.week}-${yearData.id}`
                  );
                  closed[index] += 1;
                }
              }
            });
          });
        });
        chartData.xAxis.categories = weeks;
      } else if (viewBy === "Month") {
        open = Array(months.length).fill(0);
        closed = Array(months.length).fill(0);
        dateRange?.year.forEach((yearData) => {
          yearData.months.forEach((monthData) => {
            ticketData.forEach((ticket) => {
              let startDate = new Date(monthData.start_date);
              let endDate = new Date(monthData.end_date);
              let targetDate;
              if (moment(ticket.created_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                targetDate = convertToISODate(ticket.created_on);
              } else {
                targetDate = new Date(ticket.created_on);
              }
              if (
                appliedFilterData &&
                Object.keys(appliedFilterData).includes("status")
              ) {
                if (
                  appliedFilterData.status.includes("new") ||
                  appliedFilterData.status.includes("on hold") ||
                  appliedFilterData.status.includes("information requested") ||
                  appliedFilterData.status.includes("in progress")
                ) {
                  if (isDateInRange(startDate, endDate, targetDate)) {
                    let index = months.findIndex(
                      (elem) => elem === `FM${monthData.month}-${yearData.id}`
                    );
                    open[index] += 1;
                  }
                }
                if (
                  appliedFilterData.status.includes("closed") ||
                  appliedFilterData.status.includes("solved")
                ) {
                  if (moment(ticket.closed_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                    targetDate = convertToISODate(ticket.closed_on);
                  } else {
                    targetDate = new Date(ticket.closed_on);
                  }
                  if (isDateInRange(startDate, endDate, targetDate)) {
                    let index = months.findIndex(
                      (elem) => elem === `FM${monthData.month}-${yearData.id}`
                    );
                    closed[index] += 1;
                  }
                }
              } else {
                if (isDateInRange(startDate, endDate, targetDate)) {
                  let index = months.findIndex(
                    (elem) => elem === `FM${monthData.month}-${yearData.id}`
                  );
                  open[index] += 1;
                }
                if (moment(ticket.closed_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                  targetDate = convertToISODate(ticket.closed_on);
                } else {
                  targetDate = new Date(ticket.closed_on);
                }
                if (isDateInRange(startDate, endDate, targetDate)) {
                  let index = months.findIndex(
                    (elem) => elem === `FM${monthData.month}-${yearData.id}`
                  );
                  closed[index] += 1;
                }
              }
            });
          });
        });
        chartData.xAxis.categories = months;
      } else if (viewBy === "Quarter") {
        open = Array(quarters.length).fill(0);
        closed = Array(quarters.length).fill(0);
        dateRange?.year.forEach((yearData) => {
          yearData.quarters.forEach((quarterData) => {
            ticketData.forEach((ticket) => {
              let startDate = new Date(quarterData.start_date);
              let endDate = new Date(quarterData.end_date);
              let targetDate;
              if (moment(ticket.created_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                targetDate = convertToISODate(ticket.created_on);
              } else {
                targetDate = new Date(ticket.created_on); 
              }
              if (
                appliedFilterData &&
                Object.keys(appliedFilterData).includes("status")
              ) {
                if (
                  appliedFilterData.status.includes("new") ||
                  appliedFilterData.status.includes("on hold") ||
                  appliedFilterData.status.includes("information requested") ||
                  appliedFilterData.status.includes("in progress")
                ) {
                  if (isDateInRange(startDate, endDate, targetDate)) {
                    let index = quarters.findIndex(
                      (elem) =>
                        elem === `Q${quarterData.quarter}-${yearData.id}`
                    );
                    open[index] += 1;
                  }
                }
                if (
                  appliedFilterData.status.includes("closed") ||
                  appliedFilterData.status.includes("solved")
                ) {
                  if (moment(ticket.closed_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                    targetDate = convertToISODate(ticket.closed_on);
                  } else {
                    targetDate = new Date(ticket.closed_on);
                  }
                  if (isDateInRange(startDate, endDate, targetDate)) {
                    let index = quarters.findIndex(
                      (elem) =>
                        elem === `Q${quarterData.quarter}-${yearData.id}`
                    );
                    closed[index] += 1;
                  }
                }
              } else {
                if (isDateInRange(startDate, endDate, targetDate)) {
                  let index = quarters.findIndex(
                    (elem) => elem === `Q${quarterData.quarter}-${yearData.id}`
                  );
                  open[index] += 1;
                }
                if (moment(ticket.closed_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
                  targetDate = convertToISODate(ticket.closed_on);
                } else {
                  targetDate = new Date(ticket.closed_on);
                }
                if (isDateInRange(startDate, endDate, targetDate)) {
                  let index = quarters.findIndex(
                    (elem) => elem === `Q${quarterData.quarter}-${yearData.id}`
                  );
                  closed[index] += 1;
                }
              }
            });
          });
        });
        chartData.xAxis.categories = quarters;
      }
    }
    chartData.series = [
      {
        name: '<span style="color: #6CB9AD;">Closed</span>',
        data: closed,
        borderRadiusTopLeft: 8,
        borderRadiusTopRight: 8,
      },
      { name: '<span style="color: #F76D9A;">Open</span>', data: open },
    ];
    chartData.legend = {
      align: "center",
      y: 16,
      margin: 16,
    };
    return chartData;
  } catch (error) {
    console.error("getGraphData error", error);
  }
};

/**
 * Converts a date string from DD-MM-YYYY HH:mm:ss format to ISO format.
 * @param {string} dateString - The date string in DD-MM-YYYY HH:mm:ss format.
 * @returns {Date} - Returns a JavaScript Date object.
 */
export const convertToISODate = (dateString) => {
  const [datePart, timePart] = dateString.split(' ');
  const [day, month, year] = datePart.split('-');
  const formattedDate = `${year}-${month}-${day}T${timePart}`;
  return new Date(formattedDate);
};

/**
 * in isDateInRange, if the targetDate lies in between startDate and endDate
 * it will return true or else false
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Date} targetDate
 * @returns boolean
 */
export const isDateInRange = (startDate, endDate, targetDate) => {
  return targetDate >= startDate && targetDate <= endDate;
};

/**
 * getTotalNumberOfOpenAndClosedTickets takes tickets array as params
 * and uses it to return back the count of the open and closed tickets
 * and also the returns openTickets and closedTickets seperately
 * @param {Array} tickets
 * @returns
 */
export const getTotalNumberOfOpenAndClosedTickets = (tickets) => {
  try {
    let open = 0;
    let closed = 0;
    let total = tickets?.length;
    let openTickets = [];
    let closedTickets = [];

    tickets.forEach((ticket) => {
      const isValidDate = moment(ticket.closed_on, "YYYY-MM-DD").isValid();
      if (isValidDate) {
        closed += 1;
        closedTickets.push(ticket);
      } else {
        open += 1;
        openTickets.push(ticket);
      }
    });

    return {
      open,
      closed,
      total,
      openTickets,
      closedTickets,
    };
  } catch (error) {
    console.error("getTotalNumberOfOpenAndClosedTickets error:", error);
  }
};

/**
 * getFormattedGraphData will prepare the data for the graph, ticket volume, close percentage
 * @param {Array} ticketData contains all the tickets in this Array
 * @param {object} dateRange contains all years, months, weeks data in it
 * @param {string} viewType it will say whether the viewType is Historic or Current
 * @param {string} viewBy it will say whether the viewBy is Week/Month/Quarter
 * @param {object} appliedFilterData it will contain the applied filter data
 * @returns the graph data, ticket volume(total,open and closed tickets), close percentage
 */
export const getFormattedGraphData = (
  ticketData,
  dateRange,
  viewType,
  viewBy,
  appliedFilterData
) => {
  try {
    if (ticketData?.length > 0) {
      let total = ticketData.length;
      let closedTicketPercentage = 0;

      let totalTicketsOpenAndClosed = getTotalNumberOfOpenAndClosedTickets(
        ticketData
      );

      let graphData = getGraphData(
        ticketData,
        dateRange,
        viewType,
        viewBy,
        appliedFilterData
      );

      closedTicketPercentage = Math.floor(
        (totalTicketsOpenAndClosed.closed / total) * 100
      );

      return {
        total,
        closed: totalTicketsOpenAndClosed.closed,
        open: totalTicketsOpenAndClosed.open,
        closedTicketPercentage,
        graphData,
      };
    } else {
      return {};
    }
  } catch (error) {
    console.error("getFormattedGraphData error", error);
  }
};

/**
 * getWeeksMonthsQuartersArrays will fill the
 * weeks, months and quarters array with the X-axis
 * data of the graph
 * @param {object} dateRange
 * @returns
 */
export const getWeeksMonthsQuartersArrays = (dateRange) => {
  try {
    let weeks = [];
    let months = [];
    let quarters = [];

    dateRange?.year.forEach((yearData) => {
      yearData?.weeks.forEach((weekData) => {
        weeks.push(`FW${weekData.week}-${yearData.id}`);
      });
      yearData?.months.forEach((monthData) => {
        months.push(`FM${monthData.month}-${yearData.id}`);
      });
      yearData?.quarters.forEach((quarterData) => {
        quarters.push(`Q${quarterData.quarter}-${yearData.id}`);
      });
    });

    return {
      weeks,
      months,
      quarters,
    };
  } catch (error) {
    console.error("getWeeksMonthsQuartersArrays error:", error);
  }
};

/**
 *
 * @param {object} dateRange is the object which contains data of all years, months and weeks object
 * @param {Array} openTickets is the array which contains all the open tickets
 * @param {Array} closedTickets is the array which contains all the closed tickets
 * @param {Array} openTicketsArray is the array prepopulated with 0 which will be returned as a result
 * @param {Array} closedTicketsArray is the array prepopulated with 0 which will be returned as a result
 * @param {string} duration is the string which can contain the duration(weeks/months/quarters)
 * @param {string} durationName is the string which can contain the durationName(week/month/quarter)
 * @param {Array} durationArray is the Array which is going to be displayed in xAxis
 * @param {string} appendingString is the string which is needed to match the index in durationArray
 * it can contain(FW/FM/Q)
 * @returns
 */
export const getPlottingData = (
  dateRange,
  openTickets,
  closedTickets,
  openTicketsArray,
  closedTicketsArray,
  duration,
  durationName,
  durationArray,
  appendingString
) => {
  try {
    dateRange?.year.forEach((yearData) => {
      yearData[duration].forEach((data) => {
        openTickets.forEach((ticket) => {
          let startDate = new Date(data.start_date);
          let endDate = new Date(data.end_date);
          let formattedTargetDate;
          if (moment(ticket.created_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
            // Explicitly handle DD-MM-YYYY format
            formattedTargetDate = moment(ticket.created_on, "DD-MM-YYYY").format("YYYY-MM-DD");
          } else {
            // Fallback to other formats
            formattedTargetDate = moment(ticket.created_on).format("YYYY-MM-DD");
          }
          let targetDate = new Date(formattedTargetDate);
          if (isDateInRange(startDate, endDate, targetDate)) {
            let index = durationArray.findIndex(
              (elem) =>
                elem ===
                `${appendingString}${data[durationName]}-${yearData.id}`
            );
            openTicketsArray[index] += 1;
          }
        });
        closedTickets.forEach((ticket) => {
          let startDate = new Date(data.start_date);
          let endDate = new Date(data.end_date);
          let formattedTargetDate;
          if (moment(ticket.created_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
            // Explicitly handle DD-MM-YYYY format
            formattedTargetDate = moment(ticket.created_on, "DD-MM-YYYY").format("YYYY-MM-DD");
          } else {
            // Fallback to other formats
            formattedTargetDate = moment(ticket.created_on).format("YYYY-MM-DD");
          }
          let targetDate = new Date(formattedTargetDate);
          if (isDateInRange(startDate, endDate, targetDate)) {
            let index = durationArray.findIndex(
              (elem) =>
                elem ===
                `${appendingString}${data[durationName]}-${yearData.id}`
            );
            closedTicketsArray[index] += 1;
          }
        });
      });
    });
    return {
      open: openTicketsArray,
      closed: closedTicketsArray,
    };
  } catch (error) {
    console.error("getPlottingData error:", error);
  }
};

/**
 *
 * @param {object} dateRange is the object which contains data of all years, months and weeks object
 * @param {Array} ticketData is the array which contains all the tickets
 * @param {string} ticketProperty is the string with which we decide which property of the ticket should be
 * accessed
 * @param {object} dataObj is the object which contains keys with empty values and then it will be return with
 * the values filled to it.
 * @param {Array} durationArray is the Array which is going to be displayed in xAxis
 * @param {string} duration is the string which can contain the duration(weeks/months/quarters)
 * @param {string} durationName is the string which can contain the durationName(week/month/quarter)
 * @param {string} appendingString is the string which is needed to match the index in durationArray
 * it can contain(FW/FM/Q)
 * @returns
 */
export const getPlottingDataForOtherGraphs = (
  dateRange,
  ticketData,
  ticketProperty,
  dataObj,
  durationArray,
  duration,
  durationName,
  appendingString
) => {
  try {
    dateRange?.year.forEach((yearData) => {
      yearData[duration].forEach((data) => {
        ticketData.forEach((ticket) => {
          let startDate = new Date(data.start_date);
          let endDate = new Date(data.end_date);
          let formattedTargetDate;
          if (moment(ticket.created_on, "DD-MM-YYYY HH:mm:ss", true).isValid()) {
            // Explicitly handle DD-MM-YYYY format
            formattedTargetDate = moment(ticket.created_on, "DD-MM-YYYY").format("YYYY-MM-DD");
          } else {
            // Fallback to other formats
            formattedTargetDate = moment(ticket.created_on).format("YYYY-MM-DD");
          }
          let targetDate = new Date(formattedTargetDate);
          if (isDateInRange(startDate, endDate, targetDate)) {
            let index = durationArray.findIndex(
              (elem) =>
                elem ===
                `${appendingString}${data[durationName]}-${yearData.id}`
            );
            dataObj[ticket[ticketProperty]][index] += 1;
          }
        });
      });
    });
    return dataObj;
  } catch (error) {
    console.error("getPlottingDataForGraphs error:", error);
  }
};

/**
 * getFirstNameAndLastNameInitials function will get us the initials of
 * the first and last name of the user
 * @param {string} fullname
 * @returns string
 */
export const getFirstNameAndLastNameInitials = (fullname) => {
  try {
    let firstNameInitial = fullname.split(" ")[0][0]
      ? fullname.split(" ")[0][0]
      : "";
    let secondNameInitial = "";
    if (fullname.split(" ").length > 1) {
      secondNameInitial = fullname.split(" ")[1][0]
        ? fullname.split(" ")[1][0]
        : "";
    }
    return firstNameInitial + secondNameInitial;
  } catch (error) {
    console.error("getFirstNameAndLastNameInitial error:", error);
  }
};

/**
 * getFullFirstNameAndLastNameInitials function will get us the full first name and
 * initials of the last name of the user
 * @param {string} fullname
 * @returns string
 */
export const getFullFirstNameAndLastNameInitials = (fullname) => {
  try {
    let firstNameInitial = fullname.split(" ")[0] ? fullname.split(" ")[0] : "";
    let secondNameInitial = "";
    if (fullname.split(" ").length > 1) {
      secondNameInitial = fullname.split(" ")[1][0]
        ? fullname.split(" ")[1][0]
        : "";
    }
    return firstNameInitial + "." + secondNameInitial;
  } catch (error) {
    console.error("getFirstNameAndLastNameInitial error:", error);
  }
};

/**
 * formatDate function takes a date string
 * and returns the date string in this
 * format 'Jun 23, 10:31 AM'
 * @param {string} inputDateString
 * @returns
 */
export const formatDate = (inputDateString) => {
  const date = moment(inputDateString);
  const formattedDate = date.format("MMM DD, hh:mm A");
  /**
   * above code of moment will format
   * the date into this format 'Jun 23, 10:31 AM'
   */
  return formattedDate;
};

/**
 * getTimeDifferenceInDays function will
 * give the time difference between today's
 * date and the date passed to the function
 * @param {string} dateString
 * @returns
 */
export const getTimeDifferenceInDays = (dateString, t) => {
  // Parse the input date string into a Date object
  const inputDate = new Date(dateString);

  // Get the current date and time
  const currentDate = new Date();

  // Calculate the time difference in milliseconds
  const timeDifference = currentDate - inputDate;

  // Calculate the time difference in days
  const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  // Determine the tense of the message (past or future)
  const tense = daysDifference >= 0 ? t("ticketing.ago") : t("ticketing.fromNow");

  // Calculate the absolute value of the days difference
  const absoluteDaysDifference = Math.abs(daysDifference);

  // Create the message
  const message = `${absoluteDaysDifference} ${absoluteDaysDifference === 1 ? t("ticketing.day") : t("ticketing.days")} ${tense}`;

  return message;
};

/**
 * FormatDateForTable function will take a date
 * string and return it in MM-DD-YYYY, HH:MM:SS
 * format
 * @param {string} inputDateString
 * @returns
 */
export const formatDateForTable = (inputDateString) => {
  try {
    const { tenantDateFormat } = getTenantTimeZoneDetails();
    const dateFormat = tenantDateFormat || "MM-DD-YYYY";
    const isIsoDateString = /^\d{4}-\d{2}-\d{2}/.test(inputDateString);
    const momentDate = isIsoDateString
      ? moment(inputDateString, moment.ISO_8601)
      : moment(inputDateString, `${dateFormat} HH:mm:ss`);

    if (!momentDate.isValid()) {
      return "Invalid Date";
    }

    return momentDate;
  } catch (error) {
    console.error("FormatDateForTable error:", error);
  }
};

/**
 * findIndexOfValueFromArrayOfObjects is a function
 * which will return the index of the array if any
 * object[key] === value
 * @param {object} array will be the array of object
 * @param {string} key will be the key of a particular object
 * @param {string} value will be the value of the key passed to this object
 * @returns
 */
export const findIndexOfValueFromArrayOfObjects = (array, key, value) => {
  try {
    let indexValue = 0;
    array.forEach((obj, index) => {
      if (obj[key] === value) {
        indexValue = index;
        return;
      }
    });
    return indexValue;
  } catch (error) {
    console.error("findIndexOfValueFromArrayOfObjects error", error);
  }
};

/**
 * CustomProgressBar is styled component used to
 * give background color to progress bar dynamically
 */
export const CustomProgressBar = styled.div`
  & .progressBar-status {
    background-color: ${(props) => props.backgroundColor};
  }
`;
