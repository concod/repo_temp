import React, { useEffect, useState, useMemo } from "react";
import { Typography } from "@mui/material";
import { Chart } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import StackedLineChartIcon from "@mui/icons-material/StackedLineChart";
import StackedBarChartIcon from "assets/IS_icons/stackedBarChartIcon.svg";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import {
  setOrdersDataLoader,
  setSelectedFilters,
  getOrdersFiscalWeekGraph,
  setOrdersFiscalGraphData,
} from "modules/oms/services-oms/Reports/vendor-projections-orders-service";
import { OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY } from "modules/oms/constants-oms/stringConstants";
import { useStyles } from "modules/oms/styles-oms/reportsCustomStyles";

const VendorOrderGraph = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [barGraphByUnits, setBarGraphByUnits] = useState({});
  const [barGraphByCosts, setBarGraphByCosts] = useState({});
  const [toRenderGraph, setToRenderGraph] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState("stackedBar");
  const [chartType, setChartType] = useState("column");

  const graphData = props.showProjectionCosts
    ? barGraphByCosts
    : barGraphByUnits;
  useEffect(() => {
    if (!props.selectedFilters || props.selectedFilters.length === 0) {
      return;
    }
    const fetchGraphData = async () => {
      props.setOrdersDataLoader(true);

      const filterArray = (props.selectedFilters ?? []).filter(
        (filter) => filter?.values?.length > 0
      );
      if (filterArray?.length === 0) return;

      let body = {
        filters: filterArray,
        isCalledFromVendorStore: props?.isCalledFromVendorStore ?? false,
      };
      let response = await props.getOrdersFiscalWeekGraph(body);

      if (response.data.status) {
        setBarGraphByCosts(response?.data?.data.costs);
        setBarGraphByUnits(response?.data?.data.units);
        if (response?.data?.data.costs.length > 0) {
          setToRenderGraph(true);
          props.setTorenderGraph(true);
        } else {
          setToRenderGraph(false);
          props.setTorenderGraph(false);
        }
        props.setOrdersDataLoader(false);
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
    } else if (reportConfig?.hideMetricCostToggle) {
      props.setToggleHide(true);
      props.setShowProjectionCosts(false);
    }
  }, [props.screenConfig, props.vendorStoreScreenConfig]);

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
        icon: <StackedBarChartIcon />,
      },
      {
        label: "Double Line",
        value: "doubleLine",
        onClick: () => {
          console.log("doubleLine");
          setSelectedChartType("doubleLine");
          setChartType("line");
        },
        icon: <StackedLineChartIcon fontSize="small" />,
      },
    ];
  }, []);

  return (
    <div>
      <Loader loader={props.ordersDataLoader} minHeight={"260px"}>
        <div
          className={`${globalClasses.marginBottom} ${classes.containerCards}`}
        >
          {toRenderGraph ? (
            <>
              <Chart
                graphTitle="Vendor Projections"
                graphType={chartType}
                xAxisTitle={""}
                yAxisTitle={"Projected Orders"}
                showDownloadButton={false}
                chartMarginBottom={null}
                seriesData={[
                  {
                    data: graphData.map((item) => Math.round(item.projections)),
                    color: "#6BBEC2",
                  },
                ]}
                xAxisCategories={graphData.map((item) => item.month)}
                cardContainer={false}
                showLegend={false}
                customLegend={<></>}
                showChartTypeDropdown
                chartTypesOptions={chartTypesOptions}
                selectedChart={selectedChartType}
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
    vendorStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.reports?.[OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY],
    isCalledFromVendorStore:
      store.omsReducer.reportsVendorProjectionsService.isCalledFromVendorStore,
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
