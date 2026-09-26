import React, { useEffect, useState, useMemo } from "react";
import { FormControl, Grid, Typography } from "@mui/material";
import { Chart } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import {
  setReceiptsDataLoader,
  setSelectedFilters,
  getReceiptsFiscalWeekGraph,
} from "modules/oms/services-oms/Reports/vendor-projections-receipts-service";
import { OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants";

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

const VendorReceiptGraph = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [hideToggle, setHideToggle] = useState(false);
  const [barGraphByUnits, setBarGraphByUnits] = useState([]);
  const [barGraphByCosts, setBarGraphByCosts] = useState([]);
  const [toRenderGraph, setToRenderGraph] = useState(false);

  useEffect(() => {
    if (!props.selectedFilters || props.selectedFilters.length === 0) {
      return;
    }
    const fetchGraphData = async () => {
      try {
        props.setReceiptsDataLoader(true);

        const filterArray = (props.selectedFilters ?? []).filter(
          (filter) => filter?.values?.length > 0
        );
        let body = {
          filters: filterArray,
        };
        let response = await props.getReceiptsFiscalWeekGraph(body);

        if (response?.data?.status) {
          setBarGraphByCosts(response?.data?.data?.costs);
          setBarGraphByUnits(response?.data?.data?.units);
          if (response?.data?.data?.costs?.length > 0) {
            setToRenderGraph(true);
            props.setTorenderGraph(true);
          } else {
            setToRenderGraph(false);
            props.setTorenderGraph(false);
          }
          props.setReceiptsDataLoader(false);
        }
      } catch (error) {
        console.log("Error in fetching graph data", error);
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
  //       yaxis: { lineWidth: 1, gridLineWidth: 0, title: "Projected Receipts" },
  //     },
  //     customSeries: [
  //       {
  //         name: "Recommended",
  //         data: barGraphByUnits.map((item) => Math.round(item?.projections)),
  //         color: "#6BBEC2",
  //       },
  //       {
  //         name: "Approved",
  //         data: barGraphByUnits.map((item) => Math.round(item?.approved)),
  //         color: "#658EC4",
  //       },
  //       {
  //         name: "Committed",
  //         data: barGraphByUnits.map((item) => Math.round(item?.committed)),
  //         color: "#BFAFD9",
  //       },
  //     ],
  //     plotOptions: {
  //       series: {
  //         pointWidth: 20,
  //         borderRadius: 5,
  //         dataLabels: {
  //           enabled: false,
  //         },
  //       },
  //       column: {
  //         pointWidth: 20,
  //         borderRadius: 5, // Rounded tips
  //         grouping: true,
  //         borderWidth: 0,
  //       },
  //     },
  //     // to customize later the format to be displayed on hover
  //     tooltip: {},
  //     isPercentLabel: false,
  //     isMultiBar: true,
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
  //     customSeries: [
  //       {
  //         name: "Recommended",
  //         data: barGraphByUnits.map((item) => Math.round(item?.projections)),
  //       },
  //       {
  //         name: "Approved",
  //         data: barGraphByUnits.map((item) => Math.round(item?.approved)),
  //         color: "#bbbca4",
  //       },
  //       {
  //         name: "Committed",
  //         data: barGraphByUnits.map((item) => Math.round(item?.committed)),
  //         color: "green",
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

  

  return (
    <div>
      <Loader loader={props.receiptsDataLoader} minHeight={"260px"}>
        {/* <div className={classes.toggleContainer}>
          {!hideToggle && (
            <FormControl>
              <Switch
                onChange={onProjectionsSwitchChange}
                disabled={!toRenderGraph}
                rightLabel="Cost($)"
                leftLabel="Units"
                id="vendor-projections-receipt"
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
              Projected Receipts Bar Graph
            </Typography>
          </Grid> */}

          {toRenderGraph ? (
            <>
              {props.showProjectionCosts ? (
                <Chart
                  graphTitle="Projected Receipts Bar Graph"
                  graphType={"column"}
                  xAxisTitle={"Months"}
                  yAxisTitle={"Projected Receipts"}
                  seriesData={[
                    {
                      name: "Recommended",
                      data: barGraphByCosts.map((item) => Math.round(item?.projections)),
                      color: "#6BBEC2",
                    },
                    {
                      name: "Approved",
                      data: barGraphByCosts.map((item) => Math.round(item?.approved)),
                      color: "#658EC4",
                    },
                    {
                      name: "Committed",
                      data: barGraphByCosts.map((item) => Math.round(item?.committed)),
                      color: "#BFAFD9",
                    },
                  ]}
                  xAxisCategories={barGraphByCosts.map((item) => item.month)}
                  cardContainer={false}
                  legendXPosition={36}
                  legendYPosition={20}
                />
              ) : (
                <Chart
                  graphTitle="Projected Receipts Bar Graph"
                  graphType={"column"}
                  xAxisTitle={"Months"}
                  yAxisTitle={"Projected Receipts"}
                  seriesData={[
                    {
                      name: "Recommended",
                      data: barGraphByUnits.map((item) => Math.round(item?.projections)),
                      color: "#6BBEC2",
                    },
                    {
                      name: "Approved",
                      data: barGraphByUnits.map((item) => Math.round(item?.approved)),
                      color: "#658EC4",
                    },
                    {
                      name: "Committed",
                      data: barGraphByUnits.map((item) => Math.round(item?.committed)),
                      color: "#BFAFD9",
                    },
                  ]}
                  xAxisCategories={barGraphByUnits.map((item) => item.month)}
                  cardContainer={false}
                  legendXPosition={36}
                  legendYPosition={20}
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
    receiptsDataLoader:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsDataLoader,
    receiptsFiscalWeekGraph:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsFiscalWeekGraph,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.reports
        ?.reports?.[OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY],
  };
};

const mapDispatchToProps = (dispatch) => ({
  getReceiptsFiscalWeekGraph: (payload) =>
    dispatch(getReceiptsFiscalWeekGraph(payload)),
  setReceiptsDataLoader: (payload) => dispatch(setReceiptsDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(VendorReceiptGraph);
