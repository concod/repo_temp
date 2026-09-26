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
  setOrdersDataLoader,
  setSelectedFilters,
  getOrdersFiscalWeekGraph,
  setOrdersFiscalGraphData,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/vendor-projections-orders-service";

const VendorOrderGraph = (props) => {
  const [barGraphByUnits, setBarGraphByUnits] = useState({});
  const [barGraphByCosts, setBarGraphByCosts] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    const fetchGraphData = async () => {
      props.setOrdersDataLoader(true);

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

      let response = await props.getOrdersFiscalWeekGraph(body);
      if (response.data.status) {
        setBarGraphByCosts(response?.data?.data.costs);
        setBarGraphByUnits(response?.data?.data.units);
        if (response?.data?.data.costs.length > 0) setToRenderGraph(true);
        else setToRenderGraph(false);
        props.setOrdersDataLoader(false);
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
        yaxis: { title: "Projected Orders" },
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
        yaxis: { title: "Projected Orders" },
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
      <Loader loader={props.ordersDataLoader} minHeight={"260px"}>
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
    ordersDataLoader:
      store.inventorysmartReducer.inventorySmartOrdersService.ordersDataLoader,
    ordersFiscalWeekGraph:
      store.inventorysmartReducer.inventorySmartOrdersService
        .ordersFiscalWeekGraph,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrdersFiscalWeekGraph: (payload) =>
    dispatch(getOrdersFiscalWeekGraph(payload)),
  setOrdersDataLoader: (payload) => dispatch(setOrdersDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setOrdersFiscalGraphData: (payload) =>
    dispatch(setOrdersFiscalGraphData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(VendorOrderGraph);
