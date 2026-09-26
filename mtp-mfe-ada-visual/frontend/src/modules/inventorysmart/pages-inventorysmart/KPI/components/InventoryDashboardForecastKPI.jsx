import classNames from "classnames";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Grid, Tooltip, Typography } from "@mui/material";
import {
  ArrowDropDown,
  ArrowDropUp,
  Inventory2Outlined,
} from "@mui/icons-material";

const InventoryDashboardForecastKPI = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <Grid
      container
      rowGap={2}
      columns={{ xs: 16, md: 16, xl: 12 }}
      className={classNames(
        classes.kpiCardContainer,
        globalClasses.marginVertical1rem
      )}
    >
      <Grid
        item
        xs={16}
        xl={12}
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
      >
        <div className={classes.kpiItemIcon}>
          <Inventory2Outlined />
        </div>
        <Typography variant="h5">{props.kpi.label}</Typography>
      </Grid>
      <Grid item xs={3.5} md={4.5} xl={3}>
        <Typography variant="body">Actual</Typography>
        <Typography variant="h2" color={"primary"}>
          {props.kpi?.value?.toLocaleString()}
        </Typography>
      </Grid>
      <Grid
        item
        xs={12.5}
        md={11.5}
        xl={9}
        display={"flex"}
        direction={"column"}
        justifyContent={"space-around"}
      >
        <div className={classes.kpiValue}>
          <Tooltip title="Adjusted IA forecast">
            <Typography
              variant="body"
              className={classNames(classes.textEllipsis, classes.kpiLabelBody)}
            >
              Adjusted IA forecast
            </Typography>
          </Tooltip>

          <Typography variant="h5" className={classes.kpiForecastValue}>
            {props.kpi?.ia_forecast_value?.toLocaleString()}
          </Typography>

          {props.kpi.ia_forecast_value_delta > 0 ? (
            <ArrowDropUp />
          ) : (
            props.kpi.ia_forecast_value_delta < 0 && <ArrowDropDown />
          )}
          <Typography variant="body" className={classes.kpiValueText}>
            {props.kpi?.ia_forecast_value_abs_delta?.toLocaleString()}
            {props.kpi?.ia_forecast_value_delta_percentage
              ? `(${props.kpi?.ia_forecast_value_delta_percentage}%)`
              : ""}
          </Typography>
        </div>
        <div className={classes.kpiValue}>
          <Tooltip title="Adjusted User Forecast">
            <Typography
              variant="body"
              className={classNames(classes.textEllipsis, classes.kpiLabelBody)}
            >
              Adjusted User Forecast
            </Typography>
          </Tooltip>

          <Typography variant="h5" className={classes.kpiForecastValue}>
            {props.kpi?.ia_adj_forecast_value?.toLocaleString()}
          </Typography>

          {props.kpi.ia_adj_forecast_value_delta > 0 ? (
            <ArrowDropUp />
          ) : (
            props.kpi.ia_adj_forecast_value_delta < 0 && <ArrowDropDown />
          )}
          <Typography variant="body" className={classes.kpiValueText}>
            {props.kpi?.ia_adj_forecast_value_abs_delta?.toLocaleString()}
            {props.kpi?.ia_adj_forecast_value_delta_percentage
              ? `(${props.kpi.ia_adj_forecast_value_delta_percentage}%)`
              : ""}
          </Typography>
        </div>
      </Grid>
    </Grid>
  );
};

export default InventoryDashboardForecastKPI;
