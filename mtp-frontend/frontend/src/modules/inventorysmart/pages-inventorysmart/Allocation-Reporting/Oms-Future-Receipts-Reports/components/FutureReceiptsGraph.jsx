import React, { useEffect, useState } from "react";
import { FormControl, Grid, Typography } from "@mui/material";
import { Switch } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { Stack } from "@mui/system";
import theme from "core/Styles/theme";
import {
  setSelectedFilters,
  getFutureReceiptsChartData,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/future-receipts-reports";

const VendorOrderGraph = (props) => {
  const globalClasses = globalStyles();

  const [graphDataByUnits, setGraphDataByUnits] = useState({});
  const [graphDataByCosts, setGraphDataByCosts] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const [isLoaderVisible, setIsLoaderVisible] = useState(false);
  const graphColours = [
    theme.palette.graphColours[22],
    theme.palette.graphColours[21],
    theme.palette.graphColours[2],
  ];
  const projectionLabels = ["Sales Forecast", "Projected Receipts", "On Order"];

  useEffect(() => {
    const fetchGraphData = async () => {
      setIsLoaderVisible(true);

      let filterArray = [];
      if (props.selectedFilters.length > 0) {
        props.selectedFilters.forEach((filter) => {
          if (filter.dimension === "Product" && filter?.values?.length > 0) {
            filterArray.push(filter);
          }
        });
      }

      let body = {
        filters: filterArray,
        //  ...props.startEndDate,
      };

      let response = await props.getFutureReceiptsChartData(body);
      if (response.data.status) {
        setGraphDataByCosts(response?.data?.data.costs);
        setGraphDataByUnits(response?.data?.data.units);
        if (response?.data?.data.costs.length > 0) setToRenderGraph(true);
        else setToRenderGraph(false);
        setIsLoaderVisible(false);
      }
    };

    fetchGraphData();
  }, [props.selectedFilters]);

  const onProjectionsSwitchChange = (event) => {
    let displayType = event.target.checked;
    props.setShowProjectionCosts(displayType);
  };

  const buildUnitsGraphComponent = () => {
    return {
      chartType: "multiLineChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          categories: graphDataByUnits.map((item) => item.month),
          title: "",
        },
        yaxis: { title: "Future Receipts" },
      },
      series: [
        {
          name: projectionLabels[0],
          type: "spline",
          color: graphColours[0],
          data: graphDataByUnits.map((item) =>
            Math.round(item.forecasted_sales)
          ),
        },
        {
          name: projectionLabels[1],
          type: "spline",
          color: graphColours[1],
          data: graphDataByUnits.map((item) =>
            Math.round(item.projected_receipts)
          ),
        },
        {
          name: projectionLabels[2],
          type: "spline",
          color: graphColours[2],
          data: graphDataByUnits.map((item) => Math.round(item.on_order)),
        },
      ],
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
          },
        },
      },
      exporting: {
        buttons: {
          contextButton: {
            enabled: false,
          },
        },
      },
      tooltip: {},
      isPercentLabel: false,
    };
  };

  const buildCostsGraphComponent = () => {
    return {
      chartType: "multiLineChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          categories: graphDataByCosts.map((item) => item.month),
          title: "",
        },
        yaxis: { title: "Future Receipts" },
      },
      series: [
        {
          name: projectionLabels[0],
          type: "spline",
          color: graphColours[0],
          data: graphDataByCosts.map((item) =>
            Math.round(item.forecasted_sales)
          ),
        },
        {
          name: projectionLabels[1],
          type: "spline",
          color: graphColours[1],
          data: graphDataByCosts.map((item) =>
            Math.round(item.projected_receipts)
          ),
        },
        {
          name: projectionLabels[2],
          type: "spline",
          color: graphColours[2],
          data: graphDataByCosts.map((item) => Math.round(item.on_order)),
        },
      ],
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
          },
        },
      },
      exporting: {
        buttons: {
          contextButton: {
            enabled: false,
          },
        },
      },
      tooltip: {},
      isPercentLabel: false,
    };
  };

  return (
    <div>
      <Loader loader={isLoaderVisible} minHeight={"260px"}>
        <Grid
          container
          alignItems={"center"}
          item
          xs={6}
          justifyContent={"space-between"}
        >
          <Typography variant="h5" className={globalClasses.paddingVertical}>
            Future Receipts Projection
          </Typography>

          <FormControl>
            <Stack
              direction="row"
              spacing={0}
              alignItems="center"
              sx={{ mx: 2 }}
            >
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
          <>
            {props.showProjectionCosts ? (
              <Charts options={buildCostsGraphComponent()} mapView={true} />
            ) : (
              <Charts options={buildUnitsGraphComponent()} mapView={true} />
            )}
          </>
        ) : (
          <div className={globalClasses.centerAlign}>
            <Typography variant="h7" className={globalClasses.paperWrapper}>
              No data is present for the selected filters
            </Typography>
          </div>
        )}
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOMSFutureReceiptsService
        .selectedFilters,
    ordersFiscalWeekGraph:
      store.inventorysmartReducer.inventorySmartOMSFutureReceiptsService
        .ordersFiscalWeekGraph,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getFutureReceiptsChartData: (payload) =>
    dispatch(getFutureReceiptsChartData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setOrdersFiscalGraphData: (payload) =>
    dispatch(setOrdersFiscalGraphData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(VendorOrderGraph);
