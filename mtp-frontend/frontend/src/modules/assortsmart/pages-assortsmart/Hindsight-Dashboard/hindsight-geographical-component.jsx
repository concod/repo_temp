import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { cloneDeep, isEmpty } from "lodash";
import Charts from "core/Utils/charts";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  setHindsightLoader,
  getHindsightTreemapFilters,
  setGeoGraphLoader,
  setHindsightGeoGraphData,
  getHindsightGraphDownload
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import HindsightGraphHeader from "./hindsight-graph-header-componet";
import { configureGraphFilters } from "./hindsight-functions";
import { getAllFilters } from "core/actions/filterAction";
import Highcharts from "highcharts";
import mapDataUS from "@highcharts/map-collection/countries/us/us-all.geo.json";
import mapDataCA from "@highcharts/map-collection/countries/ca/ca-all.geo.json";
import { geoGraphicalAttribute } from "modules/assortsmart/constants-assortsmart/stringContants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { addSnack } from "core/actions/snackbarActions";
import { downloadAsExcel } from "./hindsight-functions";

const HindsightGeoGraphicalComponent = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const tabValues = useRef({});
  const history = useHistory();
  const [geoGraphOptions, setGeoGraphOptions] = useState({});
  const [stateWiseGeoGraphOptions, setStateWiseGeoGraphOptions] = useState({});
  const [graphSettingChanged, setGraphSettingChanged] = useState(false);
  const [filtersConfig, setFiltersConfig] = useState({});
  const [chartRef, setChartRef] = useState(null);

  const configureGeographFilters = async () => {
    const hindsightValues =
      props.screenConfiguration?.hindsight?.geo_graph_setting;
    //Configure tabvalues & filter configuration for hierarchy & graph filters
    tabValues.current = hindsightValues;
    const filtersConfig = await configureGraphFilters(
      hindsightValues,
      "geograph",
      props.geoGraphFilters,
      history,
      props
    );
    setFiltersConfig(filtersConfig);
  };

  useEffect(() => {
    configureGeographFilters();
  }, []);

  const handleChartRef = (ref) => {
    setChartRef(ref);
  };

  const handleExport = (format) => {
    if (format === "jpeg") {
      chartRef.current.chart.exportChart({ type: "image/jpeg" });
    } else if (format === "pdf") {
      chartRef.current.chart.exportChart({ type: "application/pdf" });
    } else if (format === "excel") {
      downloadAsExcel(
        props.geoGraphFilters,
        props.hindsightFilterSelection,
        props.planCode,
        props.getHindsightGraphDownload,
        "geograph",
        props.addSnack,
      );
    }
  };

  const formatStoreCodeGraphData = (graphData, graphDetails) => {
    let mapViewData = [];
    const settingsData = props.geoGraphFilters;
    if (
      (Array.isArray(settingsData?.channel) &&
        settingsData?.channel?.includes("US")) ||
      settingsData?.channel === "US"
    ) {
      mapViewData = graphData?.filter((item) => {
        return (
          item.channel === "US" &&
          item.latitude !== null &&
          item.longitude !== null
        );
      });
    } else {
      mapViewData = graphData?.filter((item) => {
        return (
          item.channel === "CA" &&
          item.latitude !== null &&
          item.longitude !== null
        );
      });
    }
    const seriesValues = [];
    mapViewData?.forEach((item, index) => {
      let seriesObject = {
        id: item.geo_attribute + index,
        type: "mappoint",
        name: item.geo_attribute,
        showInLegend: false,
        dataLabels: {
          enabled: true,
        },
        marker: {
          symbol: "circle",
        },
        color: "#7cb5ec",
        stickyTracking: false,
      };
      let seriesData = [];
      seriesData.push({
        attribute: replaceSpecialCharacter(item.geo_attribute),
        store_name: replaceSpecialCharacter(item.store_name),
        review_metric_ly: item["ly_" + settingsData?.review_metric],
        review_metric_ty: item["ty_" + settingsData?.review_metric],
        lat: item.latitude,
        lon: item.longitude,
      });
      seriesObject["data"] = seriesData;
      seriesValues.push(seriesObject);
    });
    setGeoGraphOptions({});
    props.setGeoGraphLoader(true);
    const mapviewOptions = {
      chartType: "mapView",
      series: seriesValues,
      tooltip: {
        formatter: function () {
          let lyValue =
            this.point.review_metric_ly > 1000000
              ? (this.point.review_metric_ly / 1000000).toFixed(2) + "M"
              : this.point.review_metric_ly > 1000
              ? (this.point.review_metric_ly / 1000).toFixed(2) + "K"
              : this.point.review_metric_ly.toFixed(2);
          let tyValue =
            this.point.review_metric_ty > 1000000
              ? (this.point.review_metric_ty / 1000000).toFixed(2) + "M"
              : this.point.review_metric_ty > 1000
              ? (this.point.review_metric_ty / 1000).toFixed(2) + "K"
              : this.point.review_metric_ty.toFixed(2);
          let tooltip =
            geoGraphicalAttribute[graphDetails?.geographical_attribute] +
            ": " +
            this.point.attribute +
            "<br/>" +
            (graphDetails.geographical_attribute === "store_code"
              ? geoGraphicalAttribute[
                  graphDetails?.geographical_attribute_display_name
                ] +
                ": " +
                this.point.store_name +
                "<br/>"
              : "") +
            `${
              parseInt(graphDetails?.compare_year)
                ? props.hindsightFilterSelection?.year[0]
                : props.hindsightFilterSelection?.season[0]
            } ${
              props.treemapFiltersData["filter_keys_with_display_name"][
                settingsData?.review_metric
              ]
            }` +
            ": " +
            tyValue +
            "<br/>" +
            `${
              parseInt(graphDetails?.compare_year)
                ? props.hindsightFilterSelection?.year[0] - 1
                : graphDetails?.last_season
            } ${
              props.treemapFiltersData["filter_keys_with_display_name"][
                settingsData?.review_metric
              ]
            }` +
            ": " +
            lyValue;
          return tooltip;
        },
      },
      mapData:
        (Array.isArray(props.geoGraphFilters?.channel) &&
          props.geoGraphFilters?.channel?.includes("US")) ||
        props.geoGraphFilters?.channel === "US"
          ? mapDataUS
          : mapDataCA,
      map:
        (Array.isArray(props.geoGraphFilters?.channel) &&
          props.geoGraphFilters?.channel?.includes("US")) ||
        props.geoGraphFilters?.channel === "US"
          ? "countries/us/us-all"
          : "countries/ca/ca-all",
    };
    setTimeout(() => {
      setGeoGraphOptions(mapviewOptions);
      props.setGeoGraphLoader(false);
    }, [1000]);
    if (graphSettingChanged) {
      setGraphSettingChanged(false);
    }
  };

  const formatStateWiseGeoGraphData = (graphData, graphDetails) => {
    let stateWiseData = [];
    let mapViewData = [],
      stateDataMapping = [],
      countryKey;
    const settingsData = props.geoGraphFilters;
    if (
      (Array.isArray(settingsData?.channel) &&
        settingsData?.channel?.includes("US")) ||
      settingsData?.channel === "US"
    ) {
      countryKey = "us";
      mapViewData = graphData?.filter((item) => {
        return item.channel === "US";
      });
    } else {
      countryKey = "ca";
      mapViewData = graphData?.filter((item) => {
        return item.channel === "CA";
      });
    }

    if (
      graphDetails?.geographical_attribute === "s1_name" ||
      graphDetails?.geographical_attribute === "s2_name"
    ) {
      mapViewData?.forEach((region) => {
        region["s3_name"]?.forEach((state) => {
          stateWiseData.push([
            `${countryKey}-${state?.toLowerCase()}`,
            region["ty_" + settingsData?.review_metric],
            region["ly_" + settingsData?.review_metric],
          ]);
          let stateObj = {};
          stateObj["attribute"] = `${countryKey}-${state?.toLowerCase()}`;
          stateObj["ty_" + settingsData?.review_metric] =
            region["ty_" + settingsData?.review_metric];
          stateObj["ly_" + settingsData?.review_metric] =
            region["ly_" + settingsData?.review_metric];
          stateObj["region"] = replaceSpecialCharacter(region?.geo_attribute);
          stateDataMapping.push(stateObj);
        });
      });
    } else {
      mapViewData?.forEach((state) => {
        stateWiseData.push([
          `${countryKey}-${state?.geo_attribute?.toLowerCase()}`,
          state["ty_" + settingsData?.review_metric],
          state["ly_" + settingsData?.review_metric],
        ]);
        let stateObj = {};
        stateObj[
          "attribute"
        ] = `${countryKey}-${state?.geo_attribute?.toLowerCase()}`;
        stateObj["ty_" + settingsData?.review_metric] =
          state["ty_" + settingsData?.review_metric];
        stateObj["ly_" + settingsData?.review_metric] =
          state["ly_" + settingsData?.review_metric];
        stateDataMapping.push(stateObj);
      });
    }
    const mapviewOptions = {
      chartType: "mapViewWithColorAxis",
      series: stateWiseData,
      name:
        props.treemapFiltersData["filter_keys_with_display_name"][
          graphDetails?.geographical_attribute
        ],
      mapData:
        (Array.isArray(props.geoGraphFilters?.channel) &&
          props.geoGraphFilters?.channel?.includes("US")) ||
        props.geoGraphFilters?.channel === "US"
          ? mapDataUS
          : mapDataCA,
      map:
        (Array.isArray(props.geoGraphFilters?.channel) &&
          props.geoGraphFilters?.channel?.includes("US")) ||
        props.geoGraphFilters?.channel === "US"
          ? "countries/us/us-all"
          : "countries/ca/ca-all",
      dataLabel:
        props.treemapFiltersData["filter_keys_with_display_name"][
          settingsData?.review_metric
        ],
      stateDataMapping: stateDataMapping,
      graphDetails: graphDetails,
      settingsData: props.geoGraphFilters,
      filters: props.hindsightFilterSelection,
    };
    setStateWiseGeoGraphOptions(mapviewOptions);
    props.setGeoGraphLoader(false);
    if (graphSettingChanged) {
      setGraphSettingChanged(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.geoGraphData)) {
      props.setGeoGraphLoader(false);
      if (
        props.geoGraphData?.graph_details?.geographical_attribute ===
          "store_code" ||
        props.geoGraphData?.graph_details?.geographical_attribute ===
          "s4_name" ||
        props.geoGraphData?.graph_details?.geographical_attribute === "zipcode"
      ) {
        setStateWiseGeoGraphOptions({});
        formatStoreCodeGraphData(
          props.geoGraphData?.data,
          props.geoGraphData?.graph_details,
          props.geoGraphFilters
        );
      } else {
        setGeoGraphOptions({});
        formatStateWiseGeoGraphData(
          props.geoGraphData?.data,
          props.geoGraphData?.graph_details,
          props.geoGraphFilters
        );
      }
    }
  }, [props.geoGraphData, graphSettingChanged]);

  return (
    <LoadingOverlay loader={props.geoGraphLoader} spinner>
      {filtersConfig && (
        <HindsightGraphHeader
          filtersConfig={filtersConfig || {}}
          tabValues={tabValues.current || []}
          screenConfiguration={props.screenConfiguration}
          generateGraphData={(payload) => props.generateGeoGraphData(payload)}
          hindsightFilterSelection={props.hindsightFilterSelection}
          graphFilters={props.geoGraphFilters}
          setGraphFilters={props.setGeoGraphFilters}
          heading={"Performance by Geographical Location"}
          graphType={"geograph"}
          setGraphDataReducer={props.setHindsightGeoGraphData}
          setGraphOptions={
            ["s1_name", "s2_name", "s3_name"].includes(
              props.geoGraphData?.graph_details?.geographical_attribute
            )
              ? setStateWiseGeoGraphOptions
              : setGeoGraphOptions
          }
          setGraphSettingChanged={setGraphSettingChanged}
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={handleExport}
          btnVisible={props.btnVisible}
          tempHide = {true} //temporary until download excel not implemented
        />
      )}
      {((!isEmpty(geoGraphOptions) &&
        ["store_code", "s4_name", "zipcode"].includes(
          props.geoGraphData?.graph_details?.geographical_attribute
        )) ||
        (!isEmpty(stateWiseGeoGraphOptions) &&
          ["s1_name", "s2_name", "s3_name"].includes(
            props.geoGraphData?.graph_details?.geographical_attribute
          ))) &&
      (geoGraphOptions?.series?.length > 0 ||
        stateWiseGeoGraphOptions?.series?.length > 0) ? (
        <Charts
          options={
            props.geoGraphData?.graph_details?.geographical_attribute ===
              "store_code" ||
            props.geoGraphData?.graph_details?.geographical_attribute ===
              "s4_name" ||
            props.geoGraphData?.graph_details?.geographical_attribute ===
              "zipcode"
              ? geoGraphOptions
              : stateWiseGeoGraphOptions
          }
          mapView={true}
          handleChartRef={handleChartRef}
          screen={"hindsight-assort"}
        />
      ) : (
        <p className={classes.NoDataText}>
          No data Present for Selected Filters
        </p>
      )}
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => {
  return {
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    hindsightTreemapData: HindsightServiceActions.setHindsightTreemapSelector(
      state
    ),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    geoGraphLoader: HindsightServiceActions.setGeoGraphLoaderSelector(state),
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
    geoGraphData: HindsightServiceActions.setHindsightGeoGraphSelector(state),
  };
};

const mapActionsToProps = {
  getAllFilters,
  addSnack,
  setHindsightLoader,
  getHindsightTreemapFilters,
  getHindsightGraphDownload,
  setGeoGraphLoader,
  setHindsightGeoGraphData,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightGeoGraphicalComponent);
