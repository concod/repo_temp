import { getCurrentApplicationName } from "core/Utils/functions/utils";
import Layout from "core/commonComponents/layout";
import HomeIcon from "@mui/icons-material/Home";
import React, { lazy } from "react";

export const AgenticPlanSidebarOptions = [
  {
    link: "/home",
    title: "Home",
    icon: React.createElement(HomeIcon),
    order: 1,
    disabled: false,
  },
];

const AgenticPlanRoutes = () => {
  const AgenticPlan = lazy(() => import("core/pages/agenticPlan"));

  const routes = [
    {
      path: `/agentic-plan`,
      component: AgenticPlan,
      title: "Agentic Plan",
      screenName: "Agentic Plan",
      module: "Agentic Plan",
    },
  ];

  return (
    <Layout
      routes={routes}
      sideBarOptions={AgenticPlanSidebarOptions}
      app={getCurrentApplicationName()}
    />
  );
};

export default AgenticPlanRoutes;
