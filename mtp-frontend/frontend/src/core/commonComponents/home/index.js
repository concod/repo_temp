import HomeIcon from "@mui/icons-material/Home";
import LocalActivityOutlinedIcon from "@mui/icons-material/LocalActivityOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { setActiveUserApp } from "core/actions/sideBarActions.js";
import { appName } from "config/constants/index.js";
import Layout from "core/commonComponents/layout/index.js";
import "core/commonComponents/layout/layout.css";
import React, { useEffect } from "react";
import { connect, useSelector } from "react-redux";
import HomePage from "./HomePage.jsx";

const Home = (props) => {
  const tenantConfigReducerState = useSelector(
    (state) => state.tenantConfigReducer
  );

  const sideBarOptions = [
    {
      link: "/home",
      title: "Home",
      icon: React.createElement(HomeIcon),
      order: 1,
    },
    {
      isParentBottom: true,
      isPositionBottom: true,
      title: "Support",
      icon: React.createElement(LocalActivityOutlinedIcon),
      childList: [
        {
          link: tenantConfigReducerState.helpDesk
            ? tenantConfigReducerState.helpDesk
            : "",
          title: "Raise a ticket",
          icon: React.createElement(HelpOutlineOutlinedIcon),
          order: 2,
          openInNewPage: true,
        },
        {
          link: "/ticketing-system/individual-view",
          title: "View Ticket Reports",
          appTitle: "ticketing",
          icon: React.createElement(FlagOutlinedIcon),
          order: 3,
        },
      ],
    },
  ];

  const routes = [
    {
      path: "/home",
      component: HomePage,
      title: "Home",
    },
  ];

  useEffect(() => {
    props.setActiveUserApp(appName.HOME);
  }, []);

  return (
    <>
      <Layout
        routes={routes}
        sideBarOptions={sideBarOptions}
        app={appName.WORKFLOW_INPUT_CENTER}
      />
    </>
  );
};

const mapStateToProps = () => ({});

const mapActionsToProps = { setActiveUserApp };

export default connect(mapStateToProps, mapActionsToProps)(Home);
