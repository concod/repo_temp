import { cloneDeep } from "lodash";
import {
  getPlottingDataForOtherGraphs,
  getWeeksMonthsQuartersArrays,
  isDateInRange,
} from "core/pages/ticketing-system/utils";
import { chartData as chartInfo } from "../../../../constants";

/**
 * dummy chartData object with empty categories and series which
 * will be used to append graph data to it
 */
const chartData = cloneDeep(chartInfo);
chartData.colors = ["#ED9C7E", "#F0CF61", "#77B0ED",  "#C3C3C3"];

/**
 * getGraphData will prepare the required graph data and append that data to the chartData
 * object and return it
 * @param {Array} ticketData contains all the tickets in this Array
 * @param {object} dateRange contains all years, months, weeks data in it
 * @param {string} viewType it will say whether the viewType is Historic or Current
 * @param {string} viewBy it will say whether the viewBy is Week/Month/Quarter
 * @param {object} appliedFilterData it will contain the applied filter data
 * @returns the chartData
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
    let totalNormal = 0;
    let totalUrgent = 0;
    let totalEmergency = 0;
    let totalLow = 0;

    let xAxisValues = getWeeksMonthsQuartersArrays(dateRange);
    weeks = xAxisValues.weeks;
    months = xAxisValues.months;
    quarters = xAxisValues.quarters;

    let priorityObj = {
      emergency: [],
      urgent: [],
      normal: [],
      low: [],
    };

    let totalPrioritiesData = getTotalPrioritiesData(ticketData);
    totalNormal = totalPrioritiesData.normal;
    totalUrgent = totalPrioritiesData.urgent;
    totalEmergency = totalPrioritiesData.emergency;
    totalLow = totalPrioritiesData.low;

    if (viewBy === "Week") {
      Object.keys(priorityObj).forEach((key) => {
        priorityObj[key] = Array(weeks.length).fill(0);
      });
      let plottingData = getPlottingDataForOtherGraphs(
        dateRange,
        ticketData,
        "priority",
        priorityObj,
        weeks,
        "weeks",
        "week",
        "FW"
      );
      priorityObj = plottingData;
      chartData.xAxis.categories = weeks;
    } else if (viewBy === "Month") {
      Object.keys(priorityObj).forEach((key) => {
        priorityObj[key] = Array(months.length).fill(0);
      });
      let plottingData = getPlottingDataForOtherGraphs(
        dateRange,
        ticketData,
        "priority",
        priorityObj,
        months,
        "months",
        "month",
        "FM"
      );
      priorityObj = plottingData;
      chartData.xAxis.categories = months;
    } else if (viewBy === "Quarter") {
      Object.keys(priorityObj).forEach((key) => {
        priorityObj[key] = Array(quarters.length).fill(0);
      });
      let plottingData = getPlottingDataForOtherGraphs(
        dateRange,
        ticketData,
        "priority",
        priorityObj,
        quarters,
        "quarters",
        "quarter",
        "Q"
      );
      priorityObj = plottingData;
      chartData.xAxis.categories = quarters;
    }

    chartData.series = [
      {
        name: '<span style="color: #ED9C7E;">Emergency</span>',
        borderRadiusTopLeft: 8,
        borderRadiusTopRight: 8,
        data: priorityObj["emergency"],
      },
      {
        name: '<span style="color: #F0CF61;">Urgent</span>',
        data: priorityObj["urgent"],
      },
      {
        name: '<span style="color: #77B0ED;">Normal</span>',
        data: priorityObj["normal"],
      },
      {
        name: '<span style="color: #C3C3C3;">Low</span>',
        data: priorityObj["low"],
      },
    ];
    return chartData;
  } catch (error) {
    console.error("getGraphData error", error);
  }
};

/**
 *
 * getTotalPrioritiesData function takes the tickets data
 * and then uses them to return the count's of all tickets priority
 * @param {Array} tickets
 * @returns an object which contains count's of all tickets priority
 */
const getTotalPrioritiesData = (tickets) => {
  try {
    let totalPriorityObj = {
      emergency: 0,
      urgent: 0,
      normal: 0,
      low: 0,
    };

    tickets.forEach((ticket) => {
      totalPriorityObj[ticket.priority] += 1;
    });

    return totalPriorityObj;
  } catch (error) {
    console.error("getAllPrioritiesData error:", error);
  }
};
