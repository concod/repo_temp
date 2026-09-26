import classNames from "classnames";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Grid, Typography } from "@mui/material";
import { EventBusy, Inventory2Outlined } from "@mui/icons-material";

const InventoryDashboardStyleInventoryKPI = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const kpiValue = String(props.kpi.value).split(" ");

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
