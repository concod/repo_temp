import React from "react";
import CalendarToday from "@mui/icons-material/CalendarToday";
import FactCheck from "@mui/icons-material/FactCheck";
import PieChart from "@mui/icons-material/PieChart";
import {
  PLAN_SMART_PRE_SEASON_DASHBOARD,
  PLAN_SMART_REPORT,
  PLAN_SMART_IN_SEASON_DASHBOARD,
} from "../constants-plansmart/routesConstants";
import "core/commonComponents/layout/layout.css";

export const sideBarOptions = [
  {
    link: PLAN_SMART_PRE_SEASON_DASHBOARD,
    title: "Pre-Season Planning",
    icon: React.createElement(CalendarToday),
    order: 1,
  },
  {
    link: PLAN_SMART_IN_SEASON_DASHBOARD,
    title: "In-Season Planning",
    icon: React.createElement(FactCheck),
    order: 2,
    componentToRender: "inSeasonPlan",
  },
  {
    link: PLAN_SMART_REPORT,
    title: "Reports",
    icon: React.createElement(PieChart),
    order: 3,
  },
];
