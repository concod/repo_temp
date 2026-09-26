import React, { useEffect } from "react";
import { connect, useSelector } from "react-redux";
import HomeIcon from "@mui/icons-material/Home";
import Layout from "core/commonComponents/layout/index.js";
import HomePage from "./HomePage.jsx";
import "core/commonComponents/layout/layout.css";
import { setActiveUserApp } from "core/actions/sideBarActions.js";
import { appName } from "config/constants/index.js";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import LocalActivityOutlinedIcon from "@mui/icons-material/LocalActivityOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";

const Home = (props) => {

  const tenantConfigReducerState = useSelector(
    (state) => state?.tenantConfigReducer
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
          link: tenantConfigReducerState?.helpDesk
            ? tenantConfigReducerState?.helpDesk
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
    props.setActiveUserApp(appName.WORKFLOW_INPUT_CENTER);
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
