import React from "react";
import { Grid, Typography } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";

import { Inventory2Outlined } from "@mui/icons-material";
import classNames from "classnames";

const KPIAlertsData = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <Grid
      container
      className={classNames(
        classes.kpiCardContainer,
        globalClasses.marginVertical1rem
      )}
    >
      <Grid
        item
        xs={1.5}
        display={"flex"}
        justifyContent={"flex-start"}
        alignItems={"center"}
        className={classes.kpiGridItem}
      >
        <div className={classes.kpiItemIcon}>
          <Inventory2Outlined />
        </div>
        <Typography variant="h5">Alerts</Typography>
      </Grid>
      {props.alerts.map((alert, index) => (
        <Grid
          item
          xs={3.5}
          display={"flex"}
          justifyContent={"center"}
          alignItems={"center"}
          className={index < props.alerts.length - 1 && classes.kpiGridItem}
        >
          <Typography variant="h2" color={"primary"}>
            {alert.value?.toLocaleString()}
          </Typography>
          <Typography variant="body" className={globalClasses.marginHorizontal}>
            {alert.label}
          </Typography>
        </Grid>
      ))}
    </Grid>
  );
};

export default KPIAlertsData;
