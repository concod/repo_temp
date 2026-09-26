import React from "react";
import { Divider, Grid, Typography } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";

import { Inventory2Outlined } from "@mui/icons-material";
import classNames from "classnames";

const KPIReceiptsCost = (props) => {
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
        xs={6}
        display={"flex"}
        justifyContent={"flex-start"}
        alignItems={"center"}
      >
        <div className={classes.kpiItemIcon}>
          <Inventory2Outlined />
        </div>
        <Typography variant="h5">{props.title}</Typography>
      </Grid>

      <Grid
        item
        xs={1}
        display={"flex"}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <Divider orientation="vertical" />
      </Grid>

      <Grid
        item
        xs={5}
        display={"flex"}
        justifyContent={"center"}
        flexDirection={"column"}
        alignItems={"center"}
      >
        <Typography variant="body" className={globalClasses.marginHorizontal}>
          {props.label}
        </Typography>
        <Typography variant="h2" color={"primary"}>
          {props.costValue.toLocaleString()}
        </Typography>
      </Grid>
    </Grid>
  );
};

export default KPIReceiptsCost;
