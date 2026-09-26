import colours from "core/Styles/colours";
import "Styles/mixins.scss";
import { pxToRem } from "core/Utils/functions/utils";

/**
 * openStatus array will contain all
 * the status's name which indicates
 * the tickets are open
 */
export const openStatus = [
  "new",
  "in progress",
  "on hold",
  "information requested",
  "solved",
];

/**
 * checkBoxOpenStatus array will contain
 * open status's which are included in
 * checkbox fields for ticketing
 */
export const checkBoxOpenStatus = [
  "in progress",
  "information requested",
  "solved",
];

export const emergencyPriorities = ["emergency", "urgent"];

/**
 * Dropdown values for viewType dropdown
 */
export const viewTypeDropdownOptions = [
  {
    label: "Historic",
    value: "Historic",
  },
  {
    label: "Current",
    value: "Current",
  },
];

/**
 * Dropdown values for viewBy dropdown
 */
export const viewByDropdownOptions = [
  {
    label: "Week",
    value: "Week",
  },
  {
    label: "Month",
    value: "Month",
  },
  {
    label: "Quarter",
    value: "Quarter",
  },
];

/**
 * Dropdown values for viewBy dropdown for week-to-date
 */
export const viewByDropdownOptionsForWeekToDate = [
  {
    label: "Status",
    value: "Status",
  },
  {
    label: "Priority",
    value: "Priority",
  },
  // {
  //   label: "Detailed Status",
  //   value: "Detailed Status",
  // },
];

const chartStyle = {
  fontStyle: "normal",
  fontVariant: "normal",
  fontSize: pxToRem(12),
  lineHeight: pxToRem(17),
  fontFamily: "Poppins",
  letterSpacing: pxToRem(0),
  color: colours.mirage,
  fontWeight: 500, // Make the X-axis title bold
};

/**
 * dummy chartData object with empty categories and series which
 * will be used to append graph data to it
 */
export const chartData = {
  chart: {
    type: "column",
  },
  title: {
    text: "",
  },
  // Your other chart configurations...
  exporting: {
    enabled: false, // Disable the exporting module to remove the hamburger sign
  },
  credits: {
    enabled: false, // Disable the Highcharts.com credits
  },
  xAxis: {
    categories: [],
    title: {
      text: "Time Period",
      style: chartStyle,
    },
  },
  yAxis: {
    min: 0,
    title: {
      text: "Ticket Volume",
      style: chartStyle,
    },
    stackLabels: {
      enabled: true,
      style: {
        fontWeight: "bold",
        color: "gray",
      },
    },
  },
  plotOptions: {
    column: {
      stacking: "normal",
      pointWidth: 14, // Adjust the width of the columns
      borderWidth: 0,
      groupPadding: 0, // Adjust the spacing between the bars
    },
  },
  colors: [colours.tradewind, colours.froly],
  legend: {
    align: "right",
  },
  series: [],
};

/**
 * chipConfig is the config
 * sent to the detailed view
 * table to show the colored
 * chips
 */
export const chipConfig = {
  closed: "success",
  open: "error",
  emergency: "warning",
  urgent: "warning-light",
  solved: "info",
  low: "tertiary",
  normal: "primary",
  "information requested": "warning-gold",
  "in progress": "success-info",
};
