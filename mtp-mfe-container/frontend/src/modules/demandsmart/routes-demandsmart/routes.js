import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";

import "core/commonComponents/layout/layout.css";

export const sideBarOptions = [
  {
    link: "/demand-smart/forecast-management/forecast-summary",
    screenName: "demand-smart",
    title: "Demand Smart",
    icon: React.createElement(DashboardIcon),
    order: 1,
  },
  {
    link: "/demand-smart/about",
    screenName: "demand-smart",
    title: "About",
    icon: React.createElement(DashboardIcon),
    order: 2,
  }
];


