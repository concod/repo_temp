import colours from "core/Styles/colours";
import "Styles/mixins.scss";
import { pxToRem } from "core/Utils/functions/utils";
import TicketBlue from "assets/ticketing/ticket_blue.png";
import TicketGreen from "assets/ticketing/ticket_green.png";
import TicketOrange from "assets/ticketing/ticket_orange.png";
import TicketRed from "assets/ticketing/ticket_red.png";
import TicketYellow from "assets/ticketing/ticket_yellow.png";
import TicketGrey from "assets/ticketing/ticket_grey.png";
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

export const chartStyle = {
  fontSize: pxToRem(16),
  lineHeight: pxToRem(24),
  fontFamily: "Manrope",
  letterSpacing: pxToRem(0),
  color: colours.mirage,
  fontWeight: 800, // Make the X-axis title bold
  color: "#60697D",
  marginTop: pxToRem(16),
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
      y: 16,
    },
  },
  yAxis: {
    min: 0,
    title: {
      text: "",
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
  urgent: "error",
  solved: "info",
  low: "info",
  normal: "warning",
  "information requested": "warning",
  "in progress": "warning",
};

export const ticketTypeConfig = {
         "Total Tickets": {
           label: "Total Tickets",
           icon: TicketBlue,
           color: colours.blue_01,
         },
         "Solved Tickets": {
           label: "Solved Tickets",
           icon: TicketBlue,
           color: colours.blue_01,
         },
         "Open Tickets": {
           label: "Open Tickets",
           icon: TicketRed,
           color: colours.errorRed,
         },
         "Closed Tickets": {
           label: "Closed Tickets",
           icon: TicketGreen,
           color: colours.successGreen,
         },
         "Closed Ticket": {
           label: "Closed Ticket",
           icon: TicketGreen,
           color: colours.successGreen,
         },
         "Emergency Tickets": {
           label: "Emergency Tickets",
           icon: TicketRed,
           color: colours.errorRed,
         },
         "Info Requested Tickets": {
           label: "Info Requested Tickets",
           icon: TicketGrey,
           color: colours.neutralText,
         },
         "Urgent Tickets": {
           label: "Urgent Tickets",
           icon: TicketOrange,
           color: colours.lightPeach,
         },
         "In Progress Tickets": {
           label: "In Progress Tickets",
           icon: TicketYellow,
           color: colours.surfaceYellow,
         },
         "Normal Tickets": {
           label: "Normal Tickets",
           icon: TicketBlue,
           color: colours.blue_01,
         },
         "Low Tickets": {
           label: "Low Tickets",
           icon: TicketGreen,
           color: colours.successGreen,
         },
         "New Tickets": {
           label: "New Tickets",
           icon: TicketRed,
           color: colours.errorRed,
         },
       };


export const SET_TICKETING_DATES = "SET_TICKETING_DATES";
export const SET_TICKET = "SET_TICKET";
