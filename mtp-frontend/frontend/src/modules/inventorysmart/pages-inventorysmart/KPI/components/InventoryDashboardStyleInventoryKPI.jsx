import classNames from "classnames";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Grid, Typography } from "@mui/material";
import { EventBusy, Inventory2Outlined } from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";

const InventoryDashboardStyleInventoryKPI = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const kpiValue = String(props.kpi.value).split(" ");
  const tooltipInfo = props?.inventorysmartScreenConfig?.dashboard?.dashboardKPIsToolTipInfo?.find(info => info.label === props.kpi.label);

  return (
    <Grid
      container
      rowGap={2}
      className={classNames(
        classes.kpiCardContainer,
        globalClasses.marginVertical1rem
      )}
    >
      <Grid
        item
        xs={12}
        display={"flex"}
        justifyContent={"flex-start"}
        alignItems={"center"}
      >
        <div className={classes.kpiItemIcon}>
          <Inventory2Outlined />
        </div>
        <Typography variant="h5">{props.kpi.label}</Typography>
        {tooltipInfo && (
          <Tooltip title={tooltipInfo.toolTipInfo} placement="top">
            <InfoIcon
              fontSize="medium"
              sx={{ cursor: "pointer", color: "#0055AF", marginLeft: 1 }}
            />
          </Tooltip>
        )}
        {!props.isDateHidden && !props.kpi.is_date_range_applicable && (
          <EventBusy className={globalClasses.marginHorizontal} />
        )}
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h3" color={"primary"}>
          {kpiValue.length > 1
            ? `${kpiValue[0]} ${Number(kpiValue[1])?.toLocaleString()}`
            : Number(kpiValue[0])?.toLocaleString()}
        </Typography>
        <Typography variant="body">
          Cost - ${Math.round(props.kpi.cost)?.toLocaleString()}
        </Typography>
      </Grid>
    </Grid>
  );
};

export default InventoryDashboardStyleInventoryKPI;
