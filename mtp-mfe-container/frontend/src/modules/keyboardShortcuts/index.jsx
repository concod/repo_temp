import React from "react";
import HomeIcon from "@mui/icons-material/Home";
import HomePage from "modules/home/HomePage";
import Layout from "core/commonComponents/layout/index.js";
import { getCurrentApplicationName } from "core/Utils/functions/utils";
import { KeyboardShortcutsPage } from "./components/index.jsx";

export const KeyboardShortcutsSidebarOptions = [
  {
    link: "/home",
    title: "Home",
    icon: React.createElement(HomeIcon),
    order: 1,
    disabled: false,
  },
];

const KeyboardShortcutsRoute = () => {
  const routes = [
    {
      path: "/home",
      component: HomePage,
      title: "Home",
    },
    {
      path: `/keyboard-shortcuts`,
      title: "Access your keyboard shortcuts here",
      screenName: "Keyboard Shortcuts",
      module: "keyboard_shortcuts",
      component: KeyboardShortcutsPage,
    },
  ];

  return (<>
    <Layout
      routes={routes}
      sideBarOptions={KeyboardShortcutsSidebarOptions}
      app={getCurrentApplicationName()}
    />
  </>);
}

export default KeyboardShortcutsRoute;