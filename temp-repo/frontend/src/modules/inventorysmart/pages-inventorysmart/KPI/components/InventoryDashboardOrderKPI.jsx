import classNames from "classnames";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Divider, Grid, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const InventoryDashboardOrderKPI = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [kpiData, setKpiData] = useState([]);

  useEffect(() => {
    if (props.kpi.kpis.length === 4) setKpiData([...props.kpi.kpis]);
    else setKpiData([]);
  }, [props]);

  return (
    <>
      {kpiData.length > 0 && (
        <Grid
          container
          className={classNames(
            classes.kpiCardContainer,
            globalClasses.marginVertical1rem
          )}
        >
          <Grid
            container
            xs={5.5}
            rowSpacing={2}
            display={"flex"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Grid
              item
              xs={12}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
            >
              <div className={classes.kpiValue}>
                <Typography variant="h6">{kpiData[0]?.label}</Typography>
              </div>
              <Typography variant="h3" color={"primary"}>
                {parseInt(kpiData[0]?.value)}%
              </Typography>
            </Grid>

            <Grid
              item
              xs={12}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
            >
              <Divider style={{ width: "100%" }} />
            </Grid>

            <Grid
              item
              xs={12}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
            >
              <div className={classes.kpiValue}>
                <Typography variant="h6"> {kpiData[1]?.label}</Typography>
              </div>
              <Typography variant="h3" color={"primary"}>
                {parseInt(kpiData[1]?.value)}%
              </Typography>
            </Grid>
          </Grid>

          <Grid
            container
            xs={1}
            display={"flex"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Divider orientation="vertical" />
          </Grid>

          <Grid
            container
            xs={5.5}
            rowSpacing={1.8}
            display={"flex"}
            justifyContent={"center"}
            alignItems={"center"}
          >
            <Grid
              item
              xs={12}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
            >
              <div className={classes.kpiValue}>
                <Typography variant="h6"> {kpiData[2]?.label}</Typography>
              </div>
              <Typography variant="h3" color={"primary"}>
                {parseInt(kpiData[2]?.value)}
              </Typography>
            </Grid>

            <Grid
              item
              xs={12}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
            >
              <Divider style={{ width: "100%" }} />
            </Grid>

            <Grid
              item
              xs={12}
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
            >
              <div className={classes.kpiValue}>
                <Typography variant="h6"> {kpiData[3]?.label}</Typography>
              </div>
              <Typography variant="h3" color={"primary"}>
                {parseInt(kpiData[3]?.value)}
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      )}
    </>
  );
};

export default InventoryDashboardOrderKPI;
