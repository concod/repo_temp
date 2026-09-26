import React, { useEffect, useState } from "react";
import { Button, FormControl, Grid, Typography } from "@mui/material";
import { Switch } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import Charts from "core/Utils/charts";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import DownloadIcon from "@mui/icons-material/Download";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { Stack } from "@mui/system";
import {
  setForecastDataLoader,
  setSelectedFilters,
  getForecastFiscalWeekGraph,
  setForecastFiscalGraphData,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/vendor-projections-forecasts-service";

const VendorForecastGraph = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [barGraphByUnits, setBarGraphByUnits] = useState({});
  const [barGraphByCosts, setBarGraphByCosts] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);

  useEffect(() => {
    const fetchGraphData = async () => {
      props.setForecastDataLoader(true);

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

      let response = await props.getForecastFiscalWeekGraph(body);
      if (response.data.status) {
        setBarGraphByCosts(response?.data?.data.costs);
        setBarGraphByUnits(response?.data?.data.units);
        if (response?.data?.data.costs.length > 0) setToRenderGraph(true);
        else setToRenderGraph(false);
        props.setForecastDataLoader(false);
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
      type: "column",
      chartType: "barChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          categories: barGraphByUnits.map((item) => item.month),
          title: "",
        },
        yaxis: { title: "Projected Forecast" },
      },
      series: [
        {
          name: "Fiscal Month",
          data: barGraphByUnits.map((item) => Math.round(item.projections)),
        },
      ],
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
            format: "{point.y:,.0f}",
          },
        },
      },
      // to customize later the format to be displayed on hover
      tooltip: {},
      isPercentLabel: false,
    };
  };

  const buildCostsGraphComponent = () => {
    return {
      type: "column",
      chartType: "barChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          categories: barGraphByCosts.map((item) => item.month),
          title: "",
        },
        yaxis: { title: "Projected Forecast" },
      },
      series: [
        {
          name: "Fiscal Month",
          data: barGraphByCosts.map((item) => Math.round(item.projections)),
        },
      ],
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
            format: "{point.y:,.0f}",
          },
        },
      },
      // to customize later the format to be displayed on hover
      tooltip: {},
      isPercentLabel: false,
    };
  };

  return (
    <div>
      <Loader loader={props.forecastDataLoader} minHeight={"260px"}>
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

          {/* <Button
            variant="outlined"
            onClick={() => console.log("Button Clicked")}
            disabled={!toRenderGraph}
            startIcon={<DownloadIcon />}
          >
            Download
          </Button> */}
        </Grid>

        {toRenderGraph ? (
          <>
            {props.showProjectionCosts ? (
              <Charts options={buildCostsGraphComponent()} omsGraph={true} />
            ) : (
              <Charts options={buildUnitsGraphComponent()} omsGraph={true} />
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
      store.inventorysmartReducer.inventorySmartOrdersService.selectedFilters,
    forecastDataLoader:
      store.inventorysmartReducer.inventorySmartForecastService
        .forecastDataLoader,
    forecastFiscalWeekGraph:
      store.inventorysmartReducer.inventorySmartForecastService
        .forecastFiscalWeekGraph,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getForecastFiscalWeekGraph: (payload) =>
    dispatch(getForecastFiscalWeekGraph(payload)),
  setForecastDataLoader: (payload) => dispatch(setForecastDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setForecastFiscalGraphData: (payload) =>
    dispatch(setForecastFiscalGraphData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorForecastGraph);
