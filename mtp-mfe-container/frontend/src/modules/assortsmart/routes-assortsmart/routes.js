import React from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import WebhookIcon from "@mui/icons-material/Webhook";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  OMNI_DASHBOARD,
  ASSORT_CLUSTER_DASHBOARD,
  MASTER_PLAN_DASHBOARD,
  MFP_DASHBOARD,
  HINDSIGHT_DASHBOARD,
  STRATEGY_DASHBOARD,
  PRE_SEASON_DASHBOARD
} from "../constants-assortsmart/routesContants";
import Cluster_en from "assets/home/clustersmart.svg";
import "core/commonComponents/layout/layout.css";

const ClusterDashboardIcon = () => (
  <div className="cluster-icon">
    {" "}
    <Cluster_en viewBox="0 0 1024 1024" />{" "}
  </div>
);

export let sideBarOptions = [
  {
    link: ASSORT_CLUSTER_DASHBOARD,
    title: "Clustering",
    icon: <ClusterDashboardIcon />,
    order: 2,
    module: "cluster_dashboard",
    screenName: "AssortDashboard",
  },
  {
    link: PRE_SEASON_DASHBOARD,
    title: "Dashboard",
    order: 1,
    icon: React.createElement(DashboardIcon),
    module: "dashboard",
    screenName: "AssortDashboard",
  },
  {
    link: OMNI_DASHBOARD,
    title: "OMNI Dashboard",
    icon: React.createElement(WebhookIcon),
    order: 3,
    module: "omni_dashboard",
    screenName: "AssortDashboard",
  },
  {
    link: MASTER_PLAN_DASHBOARD,
    title: "Master plan dashboard",
    icon: React.createElement(AnalyticsIcon),
    order: 5,
    module: "master_plan_dashboard",
    screenName: "AssortDashboard",
  },
  {
    link: MFP_DASHBOARD,
    title: "MFP dashboard",
    icon: React.createElement(FileUploadIcon),
    order: 6,
    module: "mfp_plan_dashboard",
    screenName: "AssortDashboard",
  },
  {
    link: HINDSIGHT_DASHBOARD,
    title: "Hindsight dashboard",
    icon: React.createElement(BubbleChartIcon),
    order: 7,
    module: "hindsight_dashboard",
    screenName: "AssortDashboard",
  },
  {
    link: STRATEGY_DASHBOARD,
    title: "Strategy dashboard",
    icon: React.createElement(DashboardIcon),
    order: 7,
    module: "strategy_dashboard",
    screenName: "AssortDashboard",
  },
];
