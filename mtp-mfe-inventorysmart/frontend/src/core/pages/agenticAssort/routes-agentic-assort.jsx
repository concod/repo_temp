import { getCurrentApplicationName } from "core/Utils/functions/utils";
import Layout from "core/commonComponents/layout";
import HomeIcon from "@mui/icons-material/Home";
import React, { lazy } from "react";

export const AgenticAssortSidebarOptions = [
  {
    link: "/home",
    title: "Home",
    icon: React.createElement(HomeIcon),
    order: 1,
    disabled: false,
  },
];

const AgenticAssortRoutes = () => {
  const AgenticAssort = lazy(() => import("core/pages/agenticAssort"));

  const routes = [
    {
      path: `/agentic-assort`,
      component: AgenticAssort,
      title: "Agentic Assort",
      screenName: "Agentic Assort",
      module: "Agentic Assort",
    },
  ];

  return (
    <Layout
      routes={routes}
      sideBarOptions={AgenticAssortSidebarOptions}
      app={getCurrentApplicationName()}
    />
  );
};

export default AgenticAssortRoutes;
