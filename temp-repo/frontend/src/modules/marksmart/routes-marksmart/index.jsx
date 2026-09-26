import React from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import "core/commonComponents/layout/layout.css";
import Layout from "core/commonComponents/layout";
import {
  DASHBOARD,
  DIRECTORYVIEW,
  YEARVIEW,
} from "../constants-marksmart/routesConstants";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Dashboard from "../pages-marksmart/dashboard";
import DirectoryView from "../pages-marksmart/dashboard/directory-view";
export const sideBarOptions = [
  {
    link: DASHBOARD,
    title: "Dashboard",
    icon: React.createElement(CalendarTodayIcon),
    order: 1,
  },
];

const Routes = () => {
  const routes = [
    {
      path: DASHBOARD,
      component: Dashboard,
      title: "Dashboard",
    },
    {
      path: YEARVIEW,
      component: Dashboard,
      title: "Dashboard",
    },
    {
      path: DIRECTORYVIEW,
      component: DirectoryView,
      title: "Directory View",
    },
  ];
  return (
    <Layout routes={routes} sideBarOptions={sideBarOptions} app={"marksmart"} />
  );
};
const mapStateToProps = () => ({});

const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(withRouter(Routes));
