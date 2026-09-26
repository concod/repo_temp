import React from "react";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
} from "modules/ada/constants-ada/routesContants";
import { useNavigate } from "react-router-dom-v5-compat";

const AdaBreadcrumb = () => {
  const navigate = useNavigate();

  return (
    <HeaderBreadCrumbs
      options={[
        {
          label: "ADA Visual",
          id: 1,
          action: () => {
            navigate(ADA_DASHBOARD);
          },
        },
      ]}
    />
  );
};

export default AdaBreadcrumb;
