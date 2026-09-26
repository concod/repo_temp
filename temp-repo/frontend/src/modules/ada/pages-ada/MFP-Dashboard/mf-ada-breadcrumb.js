import React from "react";

import {
  ADA_DASHBOARD,
  ADA_FORECAST_MANGEMENT,
} from "modules/ada/constants-ada/routesContants";
import { useHistory } from "react-router-dom";
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

const AdaMfpBreadcrumb = () => {
  const history = useHistory();
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <div className={`${classes.breadCrumbStyle}`}>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Home",
            id: 1,
            to: "/home",
          },

          {
            label: "ADA Visual",
            to: ADA_DASHBOARD,
            id: 2,
          },
        ]}
      />
    </div>
  );
};

export default AdaMfpBreadcrumb;
