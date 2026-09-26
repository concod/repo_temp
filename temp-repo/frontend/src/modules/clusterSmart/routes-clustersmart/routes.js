import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { CLUSTERING_DASHBOARD, CLUSTER } from "../constants-clustersmart/routesConstants";
import DashboardComponent from "../../assortsmart/pages-assortsmart/Plan-Dashboard";
import ClusteringComponent from "../pages-clustersmart/Clustering/cluster-stepper-component";
import Layout from "core/commonComponents/layout";
import "core/commonComponents/layout/layout.css";
import Cluster_en from "assets/home/clustersmart.svg";

const ClusterDashboardIcon = () => <div className="cluster-icon"> <Cluster_en viewBox="0 0 1024 1024" /> </div>

export let sideBarOptions = [
    {
      link: CLUSTERING_DASHBOARD,
      title: "Clustering",
      icon: <ClusterDashboardIcon />,
      order: 1,
    }
];

const Routes = (props) => {
    const [sideBarValues, setSideBarValues] = useState([]);

    useEffect(() => {
      const getSideBarOptions = async () => {
        const excludeSideBarOptions = props.screenConfiguration?.common?.assort_sidebar_value_exclude;
        sideBarOptions = sideBarOptions.filter(
          (option) => option.title !== excludeSideBarOptions
        );
        setSideBarValues(sideBarOptions);
      };
      getSideBarOptions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.screenConfiguration]);

    const routes = [
      {
        path: CLUSTERING_DASHBOARD,
        component: DashboardComponent,
        title: "Clustering",
      },
      {
        path: `${CLUSTER}/:planCode`,
        component: ClusteringComponent,
        title: "Clustering",
      },
    ];

    return (
        <Layout
          routes={routes}
          sideBarOptions={sideBarValues}
          app={"clustersmart"}
        />
      );
};
const mapStateToProps = (store) => {
  return {
    screenConfiguration:
      store.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapActionsToProps = {};

export default connect(mapStateToProps, mapActionsToProps)(withRouter(Routes));