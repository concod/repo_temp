import React from "react";
import { Divider, Grid, Typography } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Inventory2Outlined } from "@mui/icons-material";
import classNames from "classnames";

const KPIReceiptUnitsOpenOrders = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <Grid
      container
      className={classNames(
        classes.kpiCardContainer,
        globalClasses.marginVertical1rem
      )}
      rowGap={1}
    >
      {props.alerts.map((alert, index) => (
        <>
          <Grid container>
            <Grid
              item
              xs={4.5}
              display={"flex"}
              justifyContent={"flex-start"}
              alignItems={"center"}
              className={classes.kpiGridItem}
            >
              <div className={classes.kpiItemIcon}>
                <Inventory2Outlined />
              </div>
              <Typography variant="h5">{alert.label}</Typography>
            </Grid>

            <Grid
              item
              xs={3}
              display={"flex"}
              justifyContent={"center"}
              alignItems={"center"}
              className={classes.kpiGridItem}
            >
              <Typography
                variant="body"
                className={globalClasses.marginHorizontal}
              >
                {alert.units}
              </Typography>
            </Grid>

            <Grid
              item
              xs={4.5}
              display={"flex"}
              justifyContent={"center"}
              alignItems={"center"}
            >
              <Typography variant="h2" color={"primary"}>
                ${alert.value.toLocaleString()}
              </Typography>
            </Grid>
          </Grid>

          {index < props.alerts.length - 1 && (
            <Grid item xs={12}>
              <Divider />
            </Grid>
          )}
        </>
      ))}
    </Grid>
  );
};

export default KPIReceiptUnitsOpenOrders;
