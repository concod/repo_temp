import React from "react";
import CategoryIcon from "@mui/icons-material/Category";
import DialpadIcon from "@mui/icons-material/Dialpad";
import TungstenOutlinedIcon from "@mui/icons-material/TungstenOutlined";
import PsychologyIcon from "@mui/icons-material/Psychology";
import GridViewIcon from "@mui/icons-material/GridView";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import {
  PRODUCT_PROFILE,
  CONFIGURATION,
  STORE_ELIGIBILITY_GROUP,
  ADA_VISUAL,
  VIEW_PAST_ALLOCATION,
  CREATE_ALLOCATION,
  DASHBOARD,
} from "../constants-inventorysmart/routesConstants";

/** Default Side Bar Options & Routes for Inventory Smart */
export const sideBarOptions = [
  {
    link: DASHBOARD,
    title: "Dashboard",
    icon: React.createElement(GridViewIcon),
    order: 1,
    screenName: "InventoryDashboard",
    module: "dashboard",
  },
  {
    link: `${CREATE_ALLOCATION}?step=0`,
    title: "Create New Allocation",
    icon: React.createElement(BubbleChartIcon),
    order: 2,
    screenName: "Allocation",
    module: "inventorysmart_create_allocation",
  },
  {
    link: STORE_ELIGIBILITY_GROUP,
    title: "Grouping",
    icon: React.createElement(DialpadIcon),
    order: 3,
    screenName: "Inventorysmart Store Eligibility Group",
    module: "inventorysmart_store_eligibility_group",
  },
  {
    link: CONFIGURATION,
    title: "Configuration",
    icon: React.createElement(TungstenOutlinedIcon),
    order: 4,
    screenName: "Inventorysmart Configurations",
    module: "inventorysmart_configuration",
  },
  {
    link: PRODUCT_PROFILE,
    title: "",
    icon: React.createElement(CategoryIcon),
    order: 6,
    screenName: "Product Profile",
    module: "inventorysmart_product_profile",
  },
  {
    link: ADA_VISUAL,
    title: "ADA Visual",
    icon: React.createElement(PsychologyIcon),
    order: 7,
    screenName: "Inventorysmart ADA Dashboard",
    module: "inventorysmart_ada_visual",
  },
  {
    link: VIEW_PAST_ALLOCATION,
    title: "View Past Allocation",
    icon: React.createElement(AccessTimeIcon),
    order: 10,
    screenName: "Inventorysmart View Past Allocations",
    module: "inventorysmart_view_past_allocation",
  },
];