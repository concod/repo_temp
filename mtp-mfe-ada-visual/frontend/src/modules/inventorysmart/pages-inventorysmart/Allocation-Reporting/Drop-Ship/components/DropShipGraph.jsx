import React, { useEffect, useState } from "react";
import { Button, FormControl, Grid, Typography } from "@mui/material";
import { Switch } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import theme from "core/Styles/theme";
import {
  getDropShipFiscalWeekGraph,
  setDropShipDataLoader,
  setSelectedFilters,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/drop-ship-service";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import DownloadIcon from "@mui/icons-material/Download";
import { Box, Stack } from "@mui/system";
import LoadingOverlay from "core/Utils/Loader/loader";

const DropShipGraph = (props) => {
  const globalClasses = globalStyles();

  const [graphDataByUnits, setGraphDataByUnits] = useState(false);
  const [graphDataByCosts, setGraphDataByCosts] = useState(false);
  const [fiscalYearMonth, setFiscalYearMonth] = useState(false);
  const [toRenderGraph, setToRenderGraph] = useState(false);

  const fetchGraphData = async () => {
    props.setDropShipDataLoader(true);

    let filterArray = [];
    if (props?.selectedFilters?.length > 0) {
      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          filterArray.push(filter);
        }
      });
    }
    let body = {
      filters: filterArray, //  ...props.startEndDate,
    };

    let response = await props.getDropShipFiscalWeekGraph(body);
    if (response.data.status) {
      let graphData = response?.data?.data;

      const predictions = [];
      const adjusted_predictions = [];
      const total_cost = [];
      const adjusted_total_cost = [];
      const fiscal_year_month = [];

      graphData.forEach((data) => {
        predictions.push(Math.round(data.predictions) || null);
        adjusted_predictions.push(
          Math.round(data.adjusted_predictions) || null
        );
        total_cost.push(Math.round(data.total_cost) || null);
        adjusted_total_cost.push(Math.round(data.adjusted_total_cost) || null);
        fiscal_year_month.push(data.fiscal_year_month);
      });

      let seriesDataForUnits = [
        {
          name: "Original IA Predictions",
          data: predictions,
          color: theme.palette.graphColours[0],
        },
        {
          name: "Adjusted User Predictions",
          data: adjusted_predictions,
          color: theme.palette.graphColours[2],
        },
      ];
      setGraphDataByUnits([...seriesDataForUnits]);

      let seriesDataForCosts = [
        {
          name: "Original Total Cost",
          data: total_cost,
          color: theme.palette.graphColours[0],
        },
        {
          name: "Adjusted Total Cost",
          data: adjusted_total_cost,
          color: theme.palette.graphColours[2],
        },
      ];
      setGraphDataByCosts([...seriesDataForCosts]);

      setFiscalYearMonth([...fiscal_year_month]);

      props.setDropShipDataLoader(false);
    }
  };

  useEffect(() => {
    if (fiscalYearMonth.length > 0) setToRenderGraph(true);
    else setToRenderGraph(false);
  }, [fiscalYearMonth]);

  useEffect(() => {
    fetchGraphData();
  }, [props.selectedFilters]);

  useEffect(() => {
    if (props.updateDropShipPredictionsSuccess) fetchGraphData();
  }, [props.updateDropShipPredictionsSuccess]);

  const onProjectionsSwitchChange = (event) => {
    let displayType = event.target.checked;
    props.setShowProjectionCosts(displayType);
  };

  const buildGraphComponent = () => {
    let build_graph_component = {
      type: "line",
      chartType: "multiLineChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          categories: fiscalYearMonth,
          title: "Fiscal Month",
          crosshair: true,
        },
        yaxis: { title: "Projected Forecast" },
      },
      series: props.showProjectionCosts ? graphDataByCosts : graphDataByUnits,
      labelFormatter: "{point.y:.0f}",
      isBudgetLabel: true,
      tooltip: {
        valueDecimals: 0,
      },
    };
    return build_graph_component;
  };

  return (
    <div className={globalClasses.marginBottom}>
      <Grid
        container
        alignItems={"center"}
        item
        xs={6}
        justifyContent={"space-between"}
      >
        <Typography variant="h5" className={globalClasses.paddingVertical}>
          Vendor Projections
        </Typography>

        <FormControl>
          <Stack direction="row" spacing={0} alignItems="center" sx={{ mx: 2 }}>
            <Switch
              onChange={onProjectionsSwitchChange}
              disabled={!toRenderGraph}
              rightLabel="Cost($)"
              leftLabel="Units"
            />
          </Stack>
        </FormControl>
      </Grid>

      {toRenderGraph ? (
        <LoadingOverlay loader={props.dropShipDataLoader} minHeight={"260px"}>
          <Box sx={{ pb: 1 }}>
            <Charts options={buildGraphComponent()} omsGraph={true} />
          </Box>
        </LoadingOverlay>
      ) : (
        <LoadingOverlay loader={props.dropShipDataLoader}>
          <div
            className={globalClasses.centerAlign}
            style={{ minHeight: "100px" }}
          >
            <Typography variant="h7" className={globalClasses.paperWrapper}>
              No data is present for the selected filters
            </Typography>
          </div>
        </LoadingOverlay>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDropShipService.selectedFilters,
    dropShipDataLoader:
      store.inventorysmartReducer.inventorySmartDropShipService
        .dropShipDataLoader,
    updateDropShipPredictionsSuccess:
      store.inventorysmartReducer.inventorySmartDropShipService
        .updateDropShipPredictionsSuccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getDropShipFiscalWeekGraph: (payload) =>
    dispatch(getDropShipFiscalWeekGraph(payload)),
  setDropShipDataLoader: (payload) => dispatch(setDropShipDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(DropShipGraph);
