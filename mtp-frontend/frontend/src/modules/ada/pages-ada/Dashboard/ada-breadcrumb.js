import React, { useEffect, useState } from "react";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
} from "modules/ada/constants-ada/routesContants";
import { useNavigate } from "react-router-dom-v5-compat";

const AdaBreadcrumb = ({ isMFPEnabled }) => {
  const navigate = useNavigate();
  const [routeOptions, setRouteOptions] = useState([]);
  const ADA_DASHBOARD_ROUTE = {
    label: "ADA Visual",
    id: 1,
    action: () => {
      navigate(ADA_DASHBOARD);
    },
  };

  const ADA_VISUAL_ROUTE = {
    label: "ADA Visual Dashboard",
    id: 1,
    action: () => {
      navigate(ADA_FORECAST_MANGEMENT);
    },
  };

  useEffect(() => {
    if (isMFPEnabled) {
      let routes = [ADA_DASHBOARD_ROUTE, ADA_VISUAL_ROUTE];
      setRouteOptions(routes);
    } else {
      let routes = [ADA_VISUAL_ROUTE];
      setRouteOptions(routes);
    }
  }, [isMFPEnabled]);

  return <HeaderBreadCrumbs options={routeOptions} />;
};

export default AdaBreadcrumb;
