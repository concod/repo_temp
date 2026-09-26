import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import WebhookIcon from "@mui/icons-material/Webhook";
import HolidayVillageIcon from "@mui/icons-material/HolidayVillage";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import {
  PLAN,
  VIEW,
  DASHBOARD,
  COMPAREPLAN,
  OMNI_DASHBOARD,
  OMNI_MAPPING_SCREEN,
  CORE_CHOICE_CONFIGURATION_DASHBOARD,
  CORE_STYLE_CONFIGURATION_DASHBOARD,
  ASSORT_CLUSTER_DASHBOARD,
  MASTER_PLAN_DASHBOARD,
  MASTER_PLAN,
  MFP_DASHBOARD,
  CREATE_STORE_GROUP,
  HINDSIGHT_DASHBOARD,
  CREATE_HINDSIGHT_VIEW,
  HINDSIGHT_PLAN_VIEW
} from "../constants-assortsmart/routesContants";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import Cluster_en from "assets/home/clustersmart.svg";
import PlanComponent from "../pages-assortsmart/Plan/plan-stepper-component";
import DashboardComponent from "../pages-assortsmart/Plan-Dashboard";
import ClusteringComponent from "../../clusterSmart/pages-clustersmart/Clustering/cluster-stepper-component";
import ComparePlanContainer from "../pages-assortsmart/ComparePlan/Compare-plan-root-component";
import CreateOmniChannel from "../pages-assortsmart/Omni-Channel/omni-channel-root-component";
import AllDoorChoiceDashboard from "../pages-assortsmart/AllDoorChoiceConfiguration/all-door-choice-configuration-dashboard";
import CreateStoreGroup from "core/pages/store-grouping/components/createGroup";
import "core/commonComponents/layout/layout.css";
import Layout from "core/commonComponents/layout";
import { cloneDeep } from "lodash";
import MasterPlan from "../pages-assortsmart/Plan-Dashboard/components/master-plan-summary-view";
import CreateHindsightView from "../pages-assortsmart/Hindsight-Dashboard/hindsight-create-new-view";
import {
  setScreenConfiguration,
} from "modules/assortsmart/services-assortsmart/common-assort-service";
import HindsightViewPlan from "../pages-assortsmart/Hindsight-Dashboard/hindsight-view-plan";

const ClusterDashboardIcon = () => (
  <div className="cluster-icon">
    {" "}
    <Cluster_en viewBox="0 0 1024 1024" />{" "}
  </div>
);

export let sideBarOptions = [
  {
    link: DASHBOARD,
    title: "Dashboard",
    order: 1,
    icon: React.createElement(DashboardIcon),
    module: "dashboard",
    screenName: "AssortDashboard",
  },
  {
    link: ASSORT_CLUSTER_DASHBOARD,
    title: "Clustering",
    icon: <ClusterDashboardIcon />,
    order: 2,
    module: "cluster_dashboard",
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
];

const Routes = (props) => {
  const [sideBarValues, setSideBarValues] = useState([]);
  const [sideBarRoutes, setSideBarRoutes] = useState([]);

  const routes = [
    {
      path: `${PLAN}/:planCode`,
      component: PlanComponent,
      title: "Dashboard",
      module: "plan",
      screenName: "Plan",
    },
    {
      path: `${VIEW}/:planCode`,
      component: PlanComponent,
      title: "Dashboard",
      module: "plan",
      screenName: "Plan",
    },
    {
      path: DASHBOARD,
      component: DashboardComponent,
      title: "Dashboard",
      module: "dashboard",
      screenName: "AssortDashboard",
    },
    {
      path: ASSORT_CLUSTER_DASHBOARD,
      component: DashboardComponent,
      title: "Clustering",
      module: "cluster_dashboard",
      screenName: "AssortDashboard",
    },
    {
      path: `${ASSORT_CLUSTER_DASHBOARD}/cluster/:planCode`,
      component: ClusteringComponent,
      title: "Dashboard",
      module: "cluster_plan",
      screenName: "Cluster Input",
    },
    {
      path: COMPAREPLAN,
      component: ComparePlanContainer,
      title: "Compare Plan",
      module: "compare_plan",
      screenName: "Assort Compare Plan",
    },
    {
      path: OMNI_DASHBOARD,
      component: DashboardComponent,
      title: "Omni channel Daashboard",
      module: "omni_dashboard",
      screenName: "AssortDashboard",
    },
    {
      path: `${OMNI_MAPPING_SCREEN}/:planCode`,
      component: CreateOmniChannel,
      title: "Omni Channel",
      module: "omni_mapping",
      screenName: "assort omni mapping",
    },
    {
      path: MASTER_PLAN_DASHBOARD,
      component: DashboardComponent,
      title: "Master Plan Dashboard",
      module: "master_plan_dashboard",
      screenName: "AssortDashboard",
    },
    {
      path: MASTER_PLAN,
      component: MasterPlan,
      title: "Master Plan",
      module: "master_plan",
      screenName: "AssortDashboard",
    },
    {
      path: MFP_DASHBOARD,
      component: DashboardComponent,
      title: "MFP Plan Dashboard",
      module: "mfp_plan_dashboard",
      screenName: "AssortDashboard",
    },
    {
      path: CREATE_STORE_GROUP,
      component: CreateStoreGroup,
      title: "Create Store Group",
      module: "create_store_group",
      screenName: "AssortDashboard",
    },
    {
      path: HINDSIGHT_DASHBOARD,
      component: DashboardComponent,
      title: "Hindsight Dashboard",
      module: "hindsight_dasboard",
      screenName: "AssortDashboard"
    },
    {
      path: CREATE_HINDSIGHT_VIEW,
      component: CreateHindsightView,
      title: "Create Hindsight View",
      module: "create_hindsight_view",
      screenName: "Hindsight View"
    },
    {
      path: `${HINDSIGHT_PLAN_VIEW}/:planCode`,
      component: HindsightViewPlan,
      title: "Hindsight View",
      module: "hindsight_view",
      screenName: "Hindsight View"
    }
  ];

  useEffect(() => {
    const setSidebarOptions = async () => {
      try {
        let configResp = await props.getTenantConfigApplicationLevel(2, {
          attribute_name: "assort_smart_screen_configuration",
        });
        if (configResp?.data?.status) {
          props.setScreenConfiguration(
            configResp?.data?.data?.[0]?.attribute_value
          );
          const excludeSideBarOptions =
            configResp?.data?.data?.[0]?.attribute_value?.common
              ?.assort_sidebar_value_exclude;
          sideBarOptions = sideBarOptions.filter((option) => {
            return !excludeSideBarOptions.includes(option.title);
          });
          setSideBarValues(sideBarOptions);
          let updatedRoutes = cloneDeep(routes);
          if (
            !excludeSideBarOptions.includes("All-door Choice Configuration")
          ) {
            if (
              configResp?.data?.data?.[0]?.attribute_value?.common
                ?.plan_step_names_assort?.["2.2"] === "Depth & Style"
            ) {
              sideBarOptions.push({
                link: CORE_STYLE_CONFIGURATION_DASHBOARD,
                title: "All-door Style Configuration",
                icon: React.createElement(HolidayVillageIcon),
                order: 4,
                module: "all_door_style_configuration",
                screenName: "AssortCoreStyleDashboard",
              });
              updatedRoutes.push({
                path: CORE_STYLE_CONFIGURATION_DASHBOARD,
                component: AllDoorChoiceDashboard,
                title: "All-door Style Configuration",
                module: "all_door_style_configuration",
                screenName: "AssortCoreStyleDashboard",
              });
            } else {
              sideBarOptions.push({
                link: CORE_CHOICE_CONFIGURATION_DASHBOARD,
                title: "All-door Choice Configuration",
                icon: React.createElement(HolidayVillageIcon),
                order: 4,
                module: "all_door_choice_configuration",
                screenName: "AssortCoreChoiceDashboard",
              });
              updatedRoutes.push({
                path: CORE_CHOICE_CONFIGURATION_DASHBOARD,
                component: AllDoorChoiceDashboard,
                title: "All-door Choice Configuration",
                module: "all_door_choice_configuration",
                screenName: "AssortCoreChoiceDashboard",
              });
            }
          }
          // Remove duplicate sideBarOptions
          sideBarOptions = sideBarOptions.filter((option, index) => {
            return (
              index ===
              sideBarOptions.findIndex((obj) => option.module === obj.module)
            );
          });
          setSideBarValues(sideBarOptions);
          setSideBarRoutes(updatedRoutes);
        }
      } catch (error) { }
    };
    setSidebarOptions();
  }, []);

  return (
    <Layout
      routes={sideBarRoutes}
      sideBarOptions={sideBarValues}
      app={"assortsmart"}
    />
  );
};
const mapStateToProps = (store) => {
  return {
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapActionsToProps = {
  getTenantConfigApplicationLevel,
  setScreenConfiguration
};

export default connect(mapStateToProps, mapActionsToProps)(withRouter(Routes));
