import { getCurrentApplicationName } from "core/Utils/functions/utils";
import Layout from "core/commonComponents/layout";
import HomeIcon from "@mui/icons-material/Home";
import React, { lazy } from "react";

export const KeyboardShortcutsSidebarOptions = [
  {
    link: "/home",
    title: "Home",
    icon: React.createElement(HomeIcon),
    order: 1,
    disabled: false,
  },
];

const KeyboardShortcutsRoutes = () => {
  const KeyboardShortcuts = lazy(() => import("core/pages/keyboardShortcuts"));

  const routes = [
    {
      path: `/keyboard-shortcuts`,
      component: KeyboardShortcuts,
      title: "Keyboard Shortcuts",
      screenName: "Keyboard Shortcuts",
      module: "keyboard_shortcuts",
    },
  ];

  return (
    <Layout
      routes={routes}
      sideBarOptions={KeyboardShortcutsSidebarOptions}
      app={getCurrentApplicationName()}
    />
  );
};

export default KeyboardShortcutsRoutes;
