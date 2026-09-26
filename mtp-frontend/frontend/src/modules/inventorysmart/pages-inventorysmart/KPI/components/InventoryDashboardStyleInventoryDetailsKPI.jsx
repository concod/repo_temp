import classNames from "classnames";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Grid, Typography } from "@mui/material";
import { EventBusy } from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";

const InventoryDashboardStyleInventoryDetailsKPI = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();


  return (
    <Grid
      container
      rowSpacing={1.8}
      className={classNames(
        classes.kpiCardContainer,
        globalClasses.marginVertical1rem
      )}
    >
      <Grid
        item
        xs={12}
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
      >
        <div className={classes.kpiValue}>
          <Typography variant="h6" className={classes.kpiValueLabel}>
            LW Weekly In Stock %
          </Typography>
        { props?.inventorysmartScreenConfig?.dashboard?.dashboardKPIsToolTipInfo &&  (<Tooltip title="Last week weekly instock % for Program and Selldown." placement="top">
          <InfoIcon
            fontSize="medium"
            sx={{ cursor: "pointer", color: "#0055AF", marginLeft: 1 }}
          />
        </Tooltip>) }
          {!props.kpi?.is_date_range_applicable && (
            <EventBusy className={globalClasses.marginHorizontal} />
          )}
        </div>
        <Typography variant="h4" color={"primary"}>
          {props.kpi.in_stock === 0
            ? props.kpi.in_stock
            : parseFloat(props.kpi.in_stock).toFixed(2)}
          %
        </Typography>
      </Grid>
      <Grid
        item
        xs={12}
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
      >
        <Typography variant="h6" className={classes.kpiValueLabel}>
          # POs in DC
        </Typography>
        <Typography variant="h4" color={"primary"}>
          {props.kpi.po_in_dc}
        </Typography>
      </Grid>
      <Grid
        item
        xs={12}
        display={"flex"}
        justifyContent={"space-between"}
        alignItems={"center"}
      >
        <Typography variant="h6" className={classes.kpiValueLabel}>
          Open POs%
        </Typography>
        <Typography variant="h4" color={"primary"}>
          {props.kpi.open_po === 0
            ? props.kpi.open_po
            : parseFloat(props.kpi.open_po * 100).toFixed(2)}
          %
        </Typography>
      </Grid>
    </Grid>
  );
};

export default InventoryDashboardStyleInventoryDetailsKPI;
