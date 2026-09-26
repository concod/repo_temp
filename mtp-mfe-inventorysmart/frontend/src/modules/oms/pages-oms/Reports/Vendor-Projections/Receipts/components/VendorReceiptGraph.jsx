import React, { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import { Chart } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import {
  setReceiptsDataLoader,
  setSelectedFilters,
  getReceiptsFiscalWeekGraph,
} from "modules/oms/services-oms/Reports/vendor-projections-receipts-service";
import { OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants";
import { useStyles } from "modules/oms/styles-oms/reportsCustomStyles";

const VendorReceiptGraph = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [barGraphByUnits, setBarGraphByUnits] = useState([]);
  const [barGraphByCosts, setBarGraphByCosts] = useState([]);
  const [toRenderGraph, setToRenderGraph] = useState(false);

  const graphData = props.showProjectionCosts
    ? barGraphByCosts
    : barGraphByUnits;

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
        if (filterArray?.length === 0) return;

        let body = {
          filters: filterArray,
          isCalledFromVendorStore: props?.isCalledFromVendorStore ?? false,
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
    const reportConfig = props.isCalledFromVendorStore
      ? props.vendorStoreScreenConfig
      : props.screenConfig;

    if (reportConfig?.hideMetricUnitsToggle) {
      props.setShowProjectionCosts(true);
      props.setToggleHide(true);
    } else if (props.screenConfig?.hideMetricCostToggle) {
      props.setToggleHide(true);
      props.setShowProjectionCosts(false);
    }
  }, [props.screenConfig, props.vendorStoreScreenConfig]);

  return (
    <div>
      <Loader loader={props.receiptsDataLoader} minHeight={"260px"}>
        <div
          className={`${globalClasses.marginBottom} ${classes.containerCards}`}
        >
          {toRenderGraph ? (
            <>
              <Chart
                graphTitle="Projected Receipts Bar Graph"
                graphType={"column"}
                xAxisTitle={"Months"}
                yAxisTitle={"Projected Receipts"}
                showDownloadButton={false}
                chartMarginBottom={null}
                seriesData={[
                  {
                    name: "Recommended",
                    data: graphData.map((item) =>
                      Math.round(item?.projections)
                    ),
                    color: "#6BBEC2",
                  },
                  {
                    name: "Approved",
                    data: graphData.map((item) => Math.round(item?.approved)),
                    color: "#658EC4",
                  },
                  {
                    name: "Committed",
                    data: graphData.map((item) => Math.round(item?.committed)),
                    color: "#BFAFD9",
                  },
                ]}
                xAxisCategories={graphData.map((item) => item.month)}
                cardContainer={false}
                legendXPosition={36}
                legendYPosition={20}
              />
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
    isCalledFromVendorStore:
      store.omsReducer.reportsVendorProjectionsService.isCalledFromVendorStore,
    receiptsDataLoader:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsDataLoader,
    receiptsFiscalWeekGraph:
      store.omsReducer.reportsVendorProjectionsReceiptsService
        .receiptsFiscalWeekGraph,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.reports?.[
        OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY
      ],
    vendorStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
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
