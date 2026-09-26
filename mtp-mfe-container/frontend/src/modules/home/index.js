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
import KeyboardShortcutIcon from "coreAssets/keyboardShortcutIcon.svg";

const Home = (props) => {

  const tenantConfigReducerState = useSelector(
    (state) => state?.tenantConfigReducer
  );
  const keyboardShortcutsVisible = useSelector(
    (state) => state?.sideBarReducer?.keyboardShortcutsVisible
  );
  const enableHelpdeskLink = useSelector(
    (state) => state?.tenantUserRoleMgmtReducer?.userRoleManagementReducer?.enableHelpdeskLink
  )
  const enableKeyboardShortcutsUI = useSelector(
    (state) => state?.sideBarReducer?.shortcutsUiException?.navigation
  );
  const  disableTicketingReports = useSelector(
    (state) => state.tenantUserRoleMgmtReducer?.userRoleManagementReducer?.ticketingConfig?.disableTicketingReports
  );
  const userScreenData = useSelector(
    (state) => state.sideBarReducer?.userScreenData
  );
  const workflowScreenData = userScreenData?.[appName.WORKFLOW_INPUT_CENTER];
  const workflowScreens = workflowScreenData?.screens || [];
  const hasTicketingViewAccess =
    workflowScreens.includes("Individual View") ||
    workflowScreens.includes("Organization View");
  const sideBarOptions = [
    {
      link: "/home",
      title: "Home",
      icon: React.createElement(HomeIcon),
      order: 1,
    },
    ...(keyboardShortcutsVisible && enableKeyboardShortcutsUI ? [{
      link: "/keyboard-shortcuts",
      title: "Keyboard Shortcuts",
      icon: React.createElement(KeyboardShortcutIcon),
      order: 2,
      openInNewPage: true,
      isPositionBottom: true,
    }] : []),
    {
      isParent: true,
      isParentBottom: true,
      isPositionBottom: true,
      title: "Support",
      icon: React.createElement(LocalActivityOutlinedIcon),
      childList: [
        ...(enableHelpdeskLink ? [
              {
                link: tenantConfigReducerState?.helpDesk
                  ? tenantConfigReducerState?.helpDesk
                  : "",
                title: "Raise a ticket",
                icon: React.createElement(HelpOutlineOutlinedIcon),
                order: 3,
                openInNewPage: true,
              },
            ]
          : []),
        ...(!disableTicketingReports && hasTicketingViewAccess
          ? [
              {
                link: "/ticketing-system/individual-view",
                title: "View Ticket Reports",
                appTitle: "ticketing",
                icon: React.createElement(FlagOutlinedIcon),
                order: 4,
              },
            ]
          : []),
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
