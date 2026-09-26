import React from "react";
import { connect } from "react-redux";

import Loader from "core/Utils/Loader/loader";

import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { Grid, Icon, Paper, Typography } from "@mui/material";
import classNames from "classnames";

const OrderBatchingMetrics = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  return (
    <>
      <Loader
        loader={props.inventorysmartOrderBatchingMetricsLoader}
        minHeight={"120px"}
      >
        <Grid
          container
          className={classes.kpiContainer}
          spacing={!props.inventorysmartOrderBatchingMetricsLoader ? 3 : 0}
        >
          {props.inventorysmartOrderBatchingMetrics?.map((metric) => (
            <Grid item xs={3} key={metric.label}>
              <Paper elevation={3} className={globalClasses.evenPaddingAround}>
                <Grid
                  container
                  direction="row"
                  spacing={1}
                  justifyContent="space-between"
                  alignItems="stretch"
                  style={{ position: "relative" }}
                >
                  <Grid item xs={8} md={10}>
                    <Typography variant={"h4"} className={classes.flexRow}>
                      <Icon className={classes.kpiIcon}>{metric.icon}</Icon>
                      <label
                        className={classNames(
                          classes.kpiMainHead,
                          classes.textEllipsis
                        )}
                      >
                        {metric.label}
                      </label>
                    </Typography>
                  </Grid>
                  <Grid item xs={4} md={2}>
                    <Typography variant={"h3"} className={classes.kpiNumberBig}>
                      {metric.value}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    inventorysmartOrderBatchingMetricsLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingMetricsLoader,
    inventorysmartOrderBatchingMetrics:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingMetrics,
  };
};

export default connect(mapStateToProps, null)(OrderBatchingMetrics);
