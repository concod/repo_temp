import { Grid, Typography } from "@mui/material";
import React from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { ACTUAL_PREDICTED } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Tooltip from "@mui/material/Tooltip";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpward from "@mui/icons-material/ArrowUpward";
import { Inventory2Outlined } from "@mui/icons-material";
import classNames from "classnames";

const InventoryDashboardKPI = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <div
      className={classNames(
        classes.kpiCardContainer,
        globalClasses.marginVertical1rem
      )}
    >
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="stretch"
        style={{ position: "relative" }}
      >
        <Grid
          item
          xs={6}
          md={10}
          display={"flex"}
          justifyContent={"flex-start"}
          alignItems={"center"}
        >
          <div className={classes.kpiItemIcon}>
            <Inventory2Outlined />
          </div>
          <Tooltip title={props.kpi.label}>
            <Typography variant={"h5"} className={classes.kpiLabel}>
              {props.kpi.label}
            </Typography>
          </Tooltip>
        </Grid>
        <Grid item xs={6} md={2}>
          <label className={classes.kpiItemRightAlign}>
            <div className={classes.KPIPercentage}>
              {props.kpi.value_delta_percentage < 0 && (
                <div className={classes.kpiRomanColor}>
                  <ArrowDownwardIcon
                    sx={classes.kpiUPDownMark}
                    className={classes.KPIPercentage}
                  />
                  {props.kpi.value_delta_percentage}%
                </div>
              )}
              {props.kpi.value_delta_percentage > 0 && (
                <div className={classes.kpiEucalyptusColor}>
                  <ArrowUpward
                    sx={classes.kpiUPArrowMark}
                    className={classes.KPIPercentage}
                  />
                  {props.kpi.value_delta_percentage}%
                </div>
              )}
              {props.kpi.value_delta_percentage === 0 && (
                <>{props.kpi.value_delta_percentage}%</>
              )}
            </div>
          </label>
        </Grid>
        <Grid item xs={12} className={classes.kpiPADVertical}>
          <Typography className={classes.kpiSubLabel}>
            {ACTUAL_PREDICTED}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant={"h3"} className={classes.kpiNumberBig}>
            {props.kpi.value?.toLocaleString()}{" "}
            {props.kpi.label?.includes("%") && "%"}
          </Typography>
        </Grid>
      </Grid>
      {/* Commenting out for now */}
      {/* <Divider light />
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="stretch"
        style={{ position: "relative" }}
        className={classes.kpiPADVertical}
      >
        <Grid item xs={6}>
          <Typography className={classes.kpiSubLabel}>
            {KPI_RECOMMENDED}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant={"h6"} className={classes.kpiItemRightAlign}>
            {props.kpi?.ia_forecast_value?.toLocaleString() || "N.A"}
          </Typography>
        </Grid>
        <Grid item xs={6} className={classes.kpiContainerPadTop}>
          <Typography className={classes.kpiSubLabel}>{KPI_PLANNED}</Typography>
        </Grid>
        <Grid item xs={6} className={classes.kpiContainerPadTop}>
          <Typography variant={"h6"} className={classes.kpiItemRightAlign}>
            {props.kpi?.ia_adj_forecast_value?.toLocaleString() || "N.A"}
          </Typography>
        </Grid>
      </Grid> */}
    </div>
  );
};

export default InventoryDashboardKPI;
