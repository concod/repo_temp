import React, { useEffect, useState, useMemo } from "react";
import { FormControl, Grid, Typography } from "@mui/material";
import { Chart } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import {
  setOrdersDataLoader,
  setSelectedFilters,
  getOrdersFiscalWeekGraph,
  setOrdersFiscalGraphData,
} from "modules/oms/services-oms/Reports/vendor-projections-orders-service";
import { OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants";
import StackedLineChartIcon from "@mui/icons-material/StackedLineChart";
import StackedBarChartIcon from "assets/stackedBarChartIcon.svg";

const useStyles = makeStyles((theme) => ({
  containerCards: {
    border: "1px solid #C3C8D4",
    borderRadius: "8px",
    backgroundColor: "#fff",
    padding: "12px",
  },
  // toggleContainer: {
  //   display: "flex",
  //   alignItems: "center",
  //   justifyContent: "flex-end",
  //   margin: "1rem 0",
  // },
  // graphTitle: {
  //   fontSize: "14px",
  //   fontWeight: "700",
  // },
}));

const VendorOrderGraph = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [hideToggle, setHideToggle] = useState(false);
  const [barGraphByUnits, setBarGraphByUnits] = useState({});
  const [barGraphByCosts, setBarGraphByCosts] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState("stackedBar");
  const [chartType, setChartType] = useState("column");
  useEffect(() => {
    if (!props.selectedFilters || props.selectedFilters.length === 0) {
      return;
    }
    const fetchGraphData = async () => {
      props.setOrdersDataLoader(true);

      const filterArray = (props.selectedFilters ?? []).filter(
        (filter) => filter?.values?.length > 0
      );
      let body = {
        filters: filterArray,
      };
      let response = await props.getOrdersFiscalWeekGraph(body);

      if (response.data.status) {
        setBarGraphByCosts(response?.data?.data.costs);
        setBarGraphByUnits(response?.data?.data.units);
        if (response?.data?.data.costs.length > 0) {
          setToRenderGraph(true);
          props.setTorenderGraph(true);
        }
        else {
          setToRenderGraph(false);
          props.setTorenderGraph(false);
        }
        props.setOrdersDataLoader(false);
      }
    };

    fetchGraphData();
  }, [props.selectedFilters]);

  useEffect(() => {
    if (props.screenConfig?.hideMetricUnitsToggle) {
      props.setShowProjectionCosts(true);
      setHideToggle(true);
      props.setToggleHide(true);
    } else if (props.screenConfig?.hideMetricCostToggle) {
      setHideToggle(true);
      props.setToggleHide(true);
      props.setShowProjectionCosts(false);
    }
  }, [props.screenConfig]);

  const onProjectionsSwitchChange = (event) => {
    let displayType = event.target.checked;
    props.setShowProjectionCosts(displayType);
    const newDisplayType = displayType ? "cost" : "unit";
    if (props.onDisplayTypeChange) {
      props.onDisplayTypeChange(newDisplayType);
    }
  };

  // const buildUnitsGraphComponent = () => {
  //   return {
  //     type: "column",
  //     chartType: "barChart",
  //     chartTitle: "",
  //     axisLegends: {
  //       xaxis: {
  //         categories: barGraphByUnits.map((item) => item.month),
  //         title: "",
  //       },
  //       yaxis: { title: "Projected Orders" },
  //     },
  //     series: [
  //       {
  //         name: "Fiscal Month",
  //         data: barGraphByUnits.map((item) => Math.round(item.projections)),
  //       },
  //     ],
  //     plotOptions: {
  //       series: {
  //         dataLabels: {
  //           enabled: true,
  //           format: "{point.y:,.0f}",
  //         },
  //       },
  //     },
  //     // to customize later the format to be displayed on hover
  //     tooltip: {},
  //     isPercentLabel: false,
  //   };
  // };

  // const buildCostsGraphComponent = () => {
  //   return {
  //     type: "column",
  //     chartType: "barChart",
  //     chartTitle: "",
  //     axisLegends: {
  //       xaxis: {
  //         categories: barGraphByCosts.map((item) => item.month),
  //         title: "",
  //       },
  //       yaxis: { title: "Projected Orders" },
  //     },
  //     series: [
  //       {
  //         name: "Fiscal Month",
  //         data: barGraphByCosts.map((item) => Math.round(item.projections)),
  //       },
  //     ],
  //     plotOptions: {
  //       series: {
  //         dataLabels: {
  //           enabled: true,
  //           format: "{point.y:,.0f}",
  //         },
  //       },
  //     },
  //     // to customize later the format to be displayed on hover
  //     tooltip: {},
  //     isPercentLabel: false,
  //   };
  // };

  const chartTypesOptions = useMemo(() => {
    return [
      {
        label: "Stacked Bar",
        value: "stackedBar",
        onClick: () => {
          console.log("stackedBar");
          setSelectedChartType("stackedBar");
          setChartType("column");
        },
        icon: <StackedBarChartIcon />
      },
      {
        label: "Double Line",
        value: "doubleLine",
        onClick: () => {
          console.log("doubleLine");
          setSelectedChartType("doubleLine");
          setChartType("line");
        },
        icon: <StackedLineChartIcon fontSize="small"/>
      }
    ];
  }, []);

  return (
    <div>
      <Loader loader={props.ordersDataLoader} minHeight={"260px"}>
        {/* <div className={classes.toggleContainer}>
          {!hideToggle && (
            <FormControl>
              <Switch
                onChange={onProjectionsSwitchChange}
                disabled={!toRenderGraph}
                rightLabel="Cost($)"
                leftLabel="Units"
                id="vendor-projections-order"
              />
            </FormControl>
          )}
        </div> */}

        <div
          className={`${globalClasses.marginBottom} ${classes.containerCards}`}
        >
          {/* <Grid
            container
            alignItems={"center"}
            item
            xs={6}
            justifyContent={"space-between"}
          >
            <Typography className={classes.graphTitle}>
              Vendor Projections
            </Typography>
          </Grid> */}

          {toRenderGraph ? (
            <>
              {props.showProjectionCosts ? (
                <Chart
                  //  options={buildCostsGraphComponent()} 
                  //  omsGraph={true} 
                  graphTitle="Vendor Projections"
                  graphType={chartType}
                  xAxisTitle={"Months"}
                  yAxisTitle={"Projected Orders"}
                  seriesData={[
                    {
                      name: "Fiscal Month",
                      data: barGraphByCosts.map((item) => Math.round(item.projections)),
                      color: "#6BBEC2",
                    },
                  ]}
                  xAxisCategories={barGraphByCosts.map((item) => item.month)}
                  cardContainer={false}
                  legendXPosition={36}
                  legendYPosition={20}
                  showChartTypeDropdown
                  chartTypesOptions={chartTypesOptions}
                  selectedChart={selectedChartType}
                />
              ) : (
                <Chart
                  graphTitle="Vendor Projections"
                  graphType={chartType}
                  xAxisTitle={"Months"}
                  yAxisTitle={"Projected Orders"}
                  seriesData={[
                    {
                      name: "Fiscal Month",
                      data: barGraphByUnits.map((item) => Math.round(item.projections)),
                      color: "#6BBEC2",
                    },
                  ]}
                  xAxisCategories={barGraphByUnits.map((item) => item.month)}
                  cardContainer={false}
                  legendXPosition={36}
                  legendYPosition={20}
                  showChartTypeDropdown
                  chartTypesOptions={chartTypesOptions}
                  selectedChart={selectedChartType}
                />
              )}
            </>
          ) : (
            <div className={globalClasses.centerAlign}>
              <Typography variant="h7" className={globalClasses.paperWrapper}>
                No data is present for the selected filters
              </Typography>
            </div>
          )}
        </div>
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.omsReducer.reportsVendorProjectionsService.selectedFilters,
    ordersDataLoader:
      store.omsReducer.reportsVendorProjectionsOrdersService.ordersDataLoader,
    ordersFiscalWeekGraph:
      store.omsReducer.reportsVendorProjectionsOrdersService
        .ordersFiscalWeekGraph,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.reports?.[
        OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY
      ],
    moduleConfig: store.omsReducer.orderingCommonService.orderingModuleConfig,
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
