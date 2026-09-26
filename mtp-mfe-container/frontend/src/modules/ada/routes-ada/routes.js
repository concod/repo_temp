import React from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DashboardIcon from "@mui/icons-material/Dashboard";
import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
} from "../constants-ada/routesContants";
import "core/commonComponents/layout/layout.css";

export const sideBarOptions = [
  {
    link: ADA_DASHBOARD,
    screenName: "ada-visual",
    title: "ADA Visual",
    icon: React.createElement(DashboardIcon),
    order: 1,
  },
  {
    link: ADA_FORECAST_MANGEMENT,
    screenName: "ada-visual",
    title: "ADA Visual Dashboard",
    icon: React.createElement(CalendarTodayIcon),
    order: 2,
  },
];
