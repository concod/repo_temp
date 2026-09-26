import React, { useEffect, useState } from "react";
import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
} from "modules/ada/constants-ada/routesContants";
import { useHistory } from "react-router-dom";
import { Breadcrumbs } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

const useStyles = makeStyles((theme) => ({
  breadCrumbStyle: {
    "& .ia-styles.ia-breadcrumb.ia-breadcrumb-noLink": {
      fontWeight: 700,
    },
  },
}));

const AdaBreadcrumb = ({ isMFPEnabled }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const history = useHistory();
  const [routeOptions, setRouteOptions] = useState([]);
  const ADA_DASHBOARD_ROUTE = {
    label: "ADA Visual",
    id: 3,
    action: () => {
      history.push(ADA_DASHBOARD);
    },
    // to: ADA_DASHBOARD,
  };
  const ADA_VISUAL_ROUTE = {
    label: "ADA Visual Dashboard",
    id: 2,
    action: () => {
      history.push(ADA_FORECAST_MANGEMENT);
    },
    // to: ADA_FORECAST_MANGEMENT,
  };

  const ADA_VISUAL_HOME_ROUTE = {
    label: "Home",
    id: 1,
    to: "/home",
  };

  useEffect(() => {
    if (isMFPEnabled) {
      let routes = [
        ADA_VISUAL_HOME_ROUTE,
        ADA_DASHBOARD_ROUTE,
        ADA_VISUAL_ROUTE,
      ];
      setRouteOptions(routes);
    } else {
      let routes = [ADA_VISUAL_HOME_ROUTE, ADA_VISUAL_ROUTE];
      setRouteOptions(routes);
    }
  }, [isMFPEnabled]);

  return (
    <div className={`${classes.breadCrumbStyle}`}>
      <HeaderBreadCrumbs options={routeOptions} />
    </div>
  );
};

export default AdaBreadcrumb;
