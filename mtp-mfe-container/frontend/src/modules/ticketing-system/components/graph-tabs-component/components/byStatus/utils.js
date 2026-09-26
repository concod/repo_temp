import {
  getPlottingDataForOtherGraphs,
  getWeeksMonthsQuartersArrays,
} from "modules/ticketing-system/utils";
import { chartData as chartInfo } from "../../../../constants";
import { cloneDeep } from "lodash";

/**
 * dummy chartData object with empty categories and series which
 * will be used to append graph data to it
 */
export const chartData = cloneDeep(chartInfo);
chartData.plotOptions = {
  column: {
    pointPadding: 0.2,
    borderWidth: 0,
    pointWidth: 12,
  },
  series: {
    borderRadiusTopLeft: 8,
    borderRadiusTopRight: 8,
  },
};
chartData.legend ={
  align: "center",
  verticalAlign: "bottom",
  layout: "horizontal",
  y:8
}
chartData.yAxis = {
  title: { ...chartData.yAxis.title },
  min: 0,
};
chartData.colors = [
  "#00ACCB",
  "#EAC096",
  "#BCD56C",
  "#3D67DB",
  "#EF767A",
  "#6BB9AD",
];


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
    let totalInprogress = 0;
    let totalInformationRequested = 0;
    let totalSolved = 0;
    let totalClosed = 0;
    let totalOpen = 0;
    let totalNew = 0;

    let xAxisValues = getWeeksMonthsQuartersArrays(dateRange);
    weeks = xAxisValues.weeks;
    months = xAxisValues.months;
    quarters = xAxisValues.quarters;

    let statusObj = {
      "in progress": [],
      "information requested": [],
      solved: [],
      closed: [],
      open: [],
      new: [],
    };

    let totalStatusData = getTotalStatusData(ticketData);
    totalInprogress = totalStatusData["in progress"];
    totalInformationRequested = totalStatusData["information requested"];
    totalSolved = totalStatusData["solved"];
    totalClosed = totalStatusData["closed"];
    totalOpen = totalStatusData["open"];
    totalNew = totalStatusData["new"];

    if (viewBy === "Week") {
      Object.keys(statusObj).forEach((key) => {
        statusObj[key] = Array(weeks.length).fill(0);
      });
      let plottingData = getPlottingDataForOtherGraphs(
        dateRange,
        ticketData,
        "status",
        statusObj,
        weeks,
        "weeks",
        "week",
        "FW"
      );
      statusObj = plottingData;
      chartData.xAxis.categories = weeks;
    } else if (viewBy === "Month") {
      Object.keys(statusObj).forEach((key) => {
        statusObj[key] = Array(months.length).fill(0);
      });
      let plottingData = getPlottingDataForOtherGraphs(
        dateRange,
        ticketData,
        "status",
        statusObj,
        months,
        "months",
        "month",
        "FM"
      );
      statusObj = plottingData;
      chartData.xAxis.categories = months;
    } else if (viewBy === "Quarter") {
      Object.keys(statusObj).forEach((key) => {
        statusObj[key] = Array(quarters.length).fill(0);
      });
      let plottingData = getPlottingDataForOtherGraphs(
        dateRange,
        ticketData,
        "status",
        statusObj,
        quarters,
        "quarters",
        "quarter",
        "Q"
      );
      statusObj = plottingData;
      chartData.xAxis.categories = quarters;
    }

    chartData.series = [
      {
        name: '<span style="color: #687AF1;">Solved</span>',
        data: statusObj["solved"],
        color: "#687AF1",
      },
      {
        name: '<span style="color: #E15554;">Information Requested</span>',
        data: statusObj["information requested"],
        color: "#E15554",
      },
      {
        name: '<span style="color: #E1BC29;">In Progress</span>',
        data: statusObj["in progress"],
        color: "#E1BC29",
      },
      {
        name: '<span style="color: #BF6EB6;">New</span>',
        data: statusObj["new"],
        color: "#BF6EB6",
      },
      {
        name: '<span style="color: #F76D9A;">Open</span>',
        data: statusObj["open"],
        color: "#F76D9A",
      },
      {
        name: '<span style="color: #89D1AB;">Closed</span>',
        data: statusObj["closed"],
        color: "#89D1AB",
      },
    ];
    return chartData;
  } catch (error) {
    console.error("getGraphData error", error);
  }
};

/**
 *
 * getTotalStatusData function takes the tickets data
 * and then uses them to return the count's of all tickets status's
 * @param {Array} tickets
 * @returns an object which contains count's of all tickets status's
 */
const getTotalStatusData = (tickets) => {
  try {
    let totalStatusObj = {
      "in progress": 0,
      "information requested": 0,
      solved: 0,
      closed: 0,
      open: 0,
      new: 0,
    };

    tickets.forEach((ticket) => {
      totalStatusObj[ticket.status] += 1;
    });

    return totalStatusObj;
  } catch (error) {
    console.error("getTotalStatusData error:", error);
  }
};
