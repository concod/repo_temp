import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import { getCurrentApplicationName } from "core/Utils/functions/utils";
import Layout from "core/commonComponents/layout";
import React, { lazy } from "react";

export const releaseNotesSidebarOptions = [
  {
    link: "/release-notes",
    title: "Release Notes",
    icon: React.createElement(DashboardOutlined),
    order: 1,
    disabled: false,
  },
];

const ReleaseNotesRoutes = () => {
  const ReleaseNotesScreen = lazy(() => import("modules/release-notes"));

  const routes = [
    {
      path: `/release-notes`,
      component: ReleaseNotesScreen,
      title: "ReleaseNotesScreen",
      screenName: "ReleaseNotesScreen View",
      module: "release_notes",
    },
  ];

  return (
    <Layout
      routes={routes}
      sideBarOptions={releaseNotesSidebarOptions}
      app={getCurrentApplicationName()}
    />
  );
};

export default ReleaseNotesRoutes;
