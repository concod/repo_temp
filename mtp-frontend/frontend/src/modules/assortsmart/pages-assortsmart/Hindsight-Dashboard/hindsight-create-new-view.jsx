import { useState, useEffect, useRef } from "react";
import { Button, Paper, Typography } from "@mui/material";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import AssortBreadCrumbs from "../assort-bread-crumbs";
import GlobalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import HindsightTreemapComponent from "./hindsight-treemap-component";
import HindsightCreateNewFilters from "./hindsight-create-new-filters";
import GraphGrid from "./hindsight-graph-grid";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { setScreenConfiguration } from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  filterView,
  generateLevelJson,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  getPlanLevels,
  setLevelsJson,
  getSeasonOptions,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import KPIComponent from "./hindsight-kpi-component";
import NoDataWrapper from "./no-data-wrapper";
import { cloneDeep, isEmpty } from "lodash";
import LoadingOverlay from "core/Utils/Loader/loader";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  getHindsightTreemapData,
  setHindsightLoader,
  setTreemapLoader,
  setHindsightTreemapData,
  getHindsightTreemapFilters,
  setHindsightTreemapFiltersOptions,
  createHindsightView,
  getHindsightPlanDetails,
  setHindsightPlanDetails,
  getHindsightBubbleGraphData,
  setHindsightBubbleGraphData,
  setBubbleGraphLoader,
  updateHindisghtView,
  getParetoGraphData,
  setParetoGraphLoader,
  setHindsightParetoGraphData,
  getHindsightAttributeGraphData,
  setHindsightAttributeGraphData,
  setAttributeGraphLoader,
  setSTMarginGraphLoader,
  setHindsightSTMarginGraphData,
  getHindsightSTMarginGraphData,
  getHindsightClearanceCarryoverGraphData,
  setHindsightClearanceCarryoverGraphData,
  setClearanceCarryoverGraphLoader,
  setSizeGraphLoader,
  getHindsightSizeGraphData,
  setHindsightSizeGraphData,
  setHindsightSTDiscountGraphData,
  getUpdatedHindsightSizeGraphData,
  getUpdatedHindsightAttributeGraphData,
  getUpdatedHindsightClearanceCarryoverGraphData,
  setHindsightTimelineGraphData,
  setHindsightGeoGraphData,
  getUpdatedHindsightBubbleGraphData,
  getUpdatedHindsightParetoGraphData,
  getUpdatedHindsightTreeMapData,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import ViewName from "./hindsight-save-view-modal";
import { HINDSIGHT_DASHBOARD } from "modules/assortsmart/constants-assortsmart/routesContants";
import HindsightBubbleGraphComponent from "./hindsight-bubble-graph-component";
import HindisghtParetoGraphComponent from "./hindisght-pareto-graph-component";
import { showGraphData } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  formatAttributeGraphPayload,
  formatPerformanceReviewGraphPayload,
  formatParetoGraphPayload,
  getFiltersData,
  formatSTMarginPayload,
  formatClearanceGraphPayload,
  formatSizeGraphPayload,
} from "./hindsight-functions";
import { setSelectedFilters } from "../../../../core/actions/filterAction";
import HindsightPerformanceReviewComponent from "./hindsight-performance-review-by-component";
import HindsightStMarginDiscountGraphComponent from "./hindsight-st-margin-discount-graph-component";
import HindsightClearanceCarryoverGraphComponent from "./hindsight-clearance-carryover-graph-component";
import HindsightSizeGraphComponent from "./hindsight-size-graph-component";
import { getFiltersAppliedData } from "core/Utils/functions/utils";

const CreateHindsightView = (props) => {
  const [hindsightFilterSelection, setHindsightFilterSelection] = useState({});
  const [treemapFilters, setTreemapFilters] = useState({});
  const [bubbleGraphFilters, setBubbleGraphFilters] = useState({});
  const [paretoGraphFilters, setParetoGraphFilters] = useState({});
  const [graphOptions, setGraphOptions] = useState([]);
  const [selectedGraphValue, setSelectedGraph] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [hindsightPageLoader, setHindsightPageLoader] = useState(false);
  const [showSelectedGraph, setShowSelectedGraph] = useState({});
  const history = useHistory();
  const globalClasses = GlobalStyles();
  const classes = useStyles();
  const [filterDependency, setFilterDependency] = useState([]);
  const [seasonOptions, setSeasonOptions] = useState([]);
  const [attributeGraphFilters, setAttributeGraphFilters] = useState({});
  const [stGraphFilters, setStGraphFilters] = useState({});
  const [clearanceGraphFilters, setClearanceGraphFilters] = useState({});
  const [sizeGraphFilters, setSizeGraphFilters] = useState({});
  const [geoGraphFilters, setGeoGraphFilters] = useState({});
  const [showGraph, setShowGraph] = useState({});
  const [
    weekMonthComparisonGraphFilters,
    setWeekMonthComparisonGraphFilters,
  ] = useState({});
  const [DiscountGraphFilters, setDiscountGraphFilters] = useState({});
  const [seasonResponseData, setSeasonResponseData] = useState([]);
  const selectedGraphsInitial = useRef({});
  const [isGraphExpand, setIsGraphExpand] = useState({});
  const [
    performanceReviewSelectedTab,
    setPerformanceReviewSelectedTab,
  ] = useState(null);
  const [stMarginSelectedTab, setSTMarginSelectedTab] = useState(null);
  const [lastExpandCollapseGraph, setLastExpandCollapseGraph] = useState(null);
  const chipsDependencyData = useRef([]);

  useEffect(() => {
    const showGraph = {
      pareto: false,
      performance_review: false,
      st_margin_discount: false,
      clearance_carryover: false,
      size_review: false,
    };
    setShowSelectedGraph(showGraph);
    selectedGraphsInitial.current = showGraph;
    setIsGraphExpand(showGraph);
    return () => {
      props.setSelectedFilters({});
    };
  }, []);

  useEffect(() => {
    const graphOptions = [];
    for (const key in showGraphData) {
      graphOptions.push({
        label: showGraphData[key],
        value: key,
        id: key,
      });
    }
    setGraphOptions(graphOptions);
  }, []);

  const handleGraphChange = (dependency) => {
    setSelectedGraph(dependency);
    //Logic to load respective selected graph on ui
    const showGraph = cloneDeep(showSelectedGraph);
    if (isEmpty(dependency)) {
      Object.keys(showSelectedGraph)?.forEach((graph) => {
        showGraph[graph] = false;
      });
    } else {
      Object.keys(showGraph)?.forEach((item) => {
        const graphData = dependency?.filter((graph) => {
          return graph.value === item;
        });
        if (graphData?.length) {
          showGraph[item] = true;
        } else {
          showGraph[item] = false;
        }
      });
    }
    setShowGraph(showGraph);
    if (showGraph["pareto"] && isEmpty(props.paretoGraphData)) {
      const payload = formatParetoGraphPayload(
        hindsightFilterSelection,
        props.hindsightPlanDetails,
        setParetoGraphFilters,
        history,
        props
      );
      generateParetoGraphData(payload);
    }
    if (showGraph["performance_review"] && isEmpty(props.attributeGraphData)) {
      const payload = formatPerformanceReviewGraphPayload(
        hindsightFilterSelection,
        props.hindsightPlanDetails,
        setAttributeGraphFilters,
        history,
        props,
        "attribute"
      );
      generateAttributeGraphData(payload);
    }
    if (showGraph["st_margin_discount"] && isEmpty(props.stMarginData)) {
      const payload = formatSTMarginPayload(
        hindsightFilterSelection,
        props.hindsightPlanDetails,
        setStGraphFilters,
        history,
        props,
        "st_margin"
      );
      generateSTMarginGraphData(payload);
    }
    if (
      showGraph["clearance_carryover"] &&
      isEmpty(props.clearanceCarryoverData)
    ) {
      const payload = formatClearanceGraphPayload(
        hindsightFilterSelection,
        props.hindsightPlanDetails,
        setClearanceGraphFilters,
        history,
        props,
        "clearance"
      );
      generateClearanceGraphData(payload);
    }
    if (showGraph["size_review"] && isEmpty(props.sizeGraphData)) {
      const payload = formatSizeGraphPayload(
        hindsightFilterSelection,
        props.hindsightPlanDetails,
        setSizeGraphFilters,
        history,
        props,
        "size_review"
      );
      generateSizeGraphData(payload);
    }
    setShowSelectedGraph(showGraph);
    selectedGraphsInitial.current = showGraph;
  };

  const formatTreemapPayload = (hindsightPlanData) => {
    const { filters } = getFiltersData(
      hindsightPlanData,
      hindsightPlanData?.tree_graph_filter,
      props
    );
    const metricsData = hindsightPlanData?.tree_graph_filter?.metrics
      ? hindsightPlanData?.tree_graph_filter?.metrics
      : props.treemapFiltersData?.["metric_group"]
          ?.slice(0, 2)
          ?.map((metric) => {
            return {
              metric_name: metric,
              weightage: 50,
              value: [50],
            };
          });
    const graph_filters = {};
    graph_filters["view_level"] =
      hindsightPlanData?.tree_graph_filter?.graph_levels;
    graph_filters["parent_level"] =
      hindsightPlanData?.tree_graph_filter?.view_tiles;
    let filters_applied = getFiltersAppliedData(
      hindsightPlanData?.tree_graph_filter
    );
    filters_applied["receipts_flag"] = hindsightFilterSelection?.buy?.[0]
      ? true
      : false;
    const payload = {
      filters: filters.filter(
        (obj) => obj.value.length > 0 && obj.value[0].length > 0
      ),
      graph_filters: graph_filters,
      metrics: metricsData,
      filters_applied: filters_applied,
      size_name: hindsightPlanData?.tree_graph_filter?.size,
      season: hindsightPlanData?.season,
      selling_period_sdate: hindsightPlanData?.selling_period_sdate,
      selling_period_edate: hindsightPlanData?.selling_period_edate,
    };
    return payload;
  };

  const formatBubbleGraphPayload = (hindsightPlanData) => {
    const { filters } = getFiltersData(
      hindsightPlanData,
      hindsightPlanData?.bubble_graph_filter,
      props
    );
    const graphFilters = {
      bubble_points: hindsightPlanData?.bubble_graph_filter?.bubble_points,
      bubble_color_grp:
        hindsightPlanData?.bubble_graph_filter?.bubble_color_grp,
      x_axis_threshold:
        hindsightPlanData?.bubble_graph_filter?.x_axis_threshold,
      y_axis_threshold:
        hindsightPlanData?.bubble_graph_filter?.y_axis_threshold,
    };
    const settings = {
      x_axis: hindsightPlanData?.bubble_graph_filter?.x_axis,
      y_axis: hindsightPlanData?.bubble_graph_filter?.y_axis,
      bubble_size: hindsightPlanData?.bubble_graph_filter?.bubble_size,
    };
    let filters_applied =
      hindsightFilterSelection?.filters_applied ||
      hindsightFilterSelection?.filters_applied ||
      {};
    filters_applied["receipts_flag"] = hindsightFilterSelection?.buy?.[0]
      ? true
      : false;
    const payload = {
      filters: filters.filter(
        (obj) => obj.value.length > 0 && obj.value[0].length > 0
      ),
      graph_filters: graphFilters,
      filters_applied: filters_applied,
      settings: settings,
      season: hindsightPlanData?.season,
      selling_period_sdate: hindsightPlanData?.selling_period_sdate,
      selling_period_edate: hindsightPlanData?.selling_period_edate,
    };
    return payload;
  };

  const configureGloabalFilters = async () => {
    const filtersSelected = {};
    const levels = Object.keys(props.levelsJson)?.concat(["channel"]);
    for (const key in props.hindsightPlanDetails) {
      if (levels?.includes(key) && props.hindsightPlanDetails[key]) {
        filtersSelected[key] = props.hindsightPlanDetails?.[key];
      }
    }
    filtersSelected["range-picker"] = [
      props.hindsightPlanDetails["selling_period_sdate"],
      props.hindsightPlanDetails["selling_period_edate"],
    ];
    filtersSelected["season"] = [props.hindsightPlanDetails?.season];
    filtersSelected["year"] = [props.hindsightPlanDetails?.year];
    filtersSelected["buy"] = [props.hindsightPlanDetails?.buy];
    let seasonResponse = await props.getSeasonOptions({
      filters: [
        {
          attribute_name: "year",
          value: [props.hindsightPlanDetails?.year],
          operator: "=",
        },
      ],
    });
    if (seasonResponse?.data?.status) {
      setSeasonResponseData(seasonResponse?.data?.data);
      let seasonData = seasonResponse?.data?.data?.map((season) => {
        return {
          label: season?.name,
          value: season?.name,
          id: season?.name,
        };
      });
      filtersSelected["season_name"] = seasonData?.filter((item) => {
        return item.value === props.hindsightPlanDetails?.season;
      })?.[0]?.label;
      setSeasonOptions(seasonData);
    }
    const filterDependency = {},
      chipsDependency = [];
    for (const key in filtersSelected) {
      const filterItem = {
        filter_id: key,
        filter_type: "",
        dimension: key,
        display_type: "dropdown",
        values: filtersSelected[key],
        attribute_name: key,
        operator: "in",
      };
      let screenName = "";
      if (Object.keys(props.levelsJson)?.includes(key)) {
        filterItem["dimension"] = props.levelsJson[key];
        filterItem["filter_type"] = "cascaded";
        screenName = "hindsight-create-view-product-0";
      } else if (key === "channel") {
        filterItem["filter_type"] = "non-cascaded";
        screenName = "hindsight-create-view-store-0";
      } else if (key === "range-picker") {
        filterItem["dimension"] = "selling period";
        filterItem["filter_type"] = "non-cascaded";
        screenName = "hindsight-create-view-store-0";
      } else if (key === "season_name") {
        continue;
      } else {
        filterItem["filter_type"] = "non-cascaded";
        screenName = "hindsight-create-view-custom-0";
      }
      if (filterDependency[screenName]) {
        filterDependency[screenName].push(filterItem);
      } else {
        filterDependency[screenName] = [filterItem];
      }
      if (
        filterItem.values.length > 0 &&
        !(
          filterItem.values.length === 1 &&
          (filterItem.values[0] === null || filterItem.values[0] === "False")
        )
      ) {
        chipsDependency.push(filterItem);
      }
    }
    function updateDimensions(data) {
      // Update dimensions in hindsight-create-view-custom-0
      if (Array.isArray(data["hindsight-create-view-custom-0"])) {
        data["hindsight-create-view-custom-0"].forEach((item) => {
          item.dimension = "custom";
        });
      }

      // Update dimensions in hindsight-create-view-product-0
      if (Array.isArray(data["hindsight-create-view-product-0"])) {
        data["hindsight-create-view-product-0"].forEach((item) => {
          item.dimension = "product";
        });
      }

      // Update dimensions in hindsight-create-view-store-0
      if (Array.isArray(data["hindsight-create-view-store-0"])) {
        data["hindsight-create-view-store-0"].forEach((item) => {
          if (item.filter_id === "range-picker") {
            item.dimension = "custom";
          } else {
            item.dimension = "store";
          }
        });
      }

      return data;
    }
    const updatedFilterDependency = updateDimensions(filterDependency);
    chipsDependencyData.current = chipsDependency;
    setFilterDependency(updatedFilterDependency);
    setHindsightFilterSelection(filtersSelected);
    setTreemapFilters({
      ...props.hindsightPlanDetails?.tree_graph_filter,
    });
    const treemapPayload = formatTreemapPayload(props.hindsightPlanDetails);
    generateTreemapData(treemapPayload);
    if (props.hindsightPlanDetails?.bubble_graph_filter) {
      setBubbleGraphFilters({
        ...props.hindsightPlanDetails?.bubble_graph_filter,
      });
      const bubbleGraphPayload = formatBubbleGraphPayload(
        props.hindsightPlanDetails
      );
      generateBubbleGraphData(bubbleGraphPayload);
    }
  };

  useEffect(() => {
    if (
      !isEmpty(props.hindsightPlanDetails) &&
      !isEmpty(props.levelsJson) &&
      !isEmpty(props.treemapFiltersData) &&
      props.view_type === "edit"
    ) {
      configureGloabalFilters();
    }
  }, [props.hindsightPlanDetails, props.levelsJson, props.treemapFiltersData]);

  useEffect(() => {
    const fetchData = async () => {
      setHindsightPageLoader(true);
      if (isEmpty(props.levelsJson)) {
        let levelData = await props.getPlanLevels();
        const levelsJson = generateLevelJson(levelData?.data?.data);
        props.setLevelsJson(levelsJson);
      }
      let configResp = await props.getTenantConfigApplicationLevel(2, {
        attribute_name: "assort_smart_screen_configuration",
      });
      if (configResp?.data?.status) {
        props.setScreenConfiguration(
          configResp?.data?.data?.[0]?.attribute_value
        );
      }
      let treemapFiltersData = await props.getHindsightTreemapFilters(
        "assort-smart"
      );
      if (treemapFiltersData?.data?.data) {
        props.setHindsightTreemapFiltersOptions(treemapFiltersData?.data?.data);
      }
    };
    fetchData();
  }, []);

  const generateTreemapData = async (payload) => {
    try {
      props.setTreemapLoader(true);
      const treemapData = await props.getUpdatedHindsightTreeMapData(
        payload,
        "assort-smart"
      );
      if (treemapData?.data?.status) {
        props.setHindsightTreemapData(treemapData?.data?.data);
      }
    } catch (error) {
      props.addSnack({
        message: "Fetching treemap details failed",
        options: {
          variant: "error",
        },
      });
      props.setTreemapLoader(false);
    }
  };

  const generateBubbleGraphData = async (payload) => {
    try {
      props.setBubbleGraphLoader(true);
      const bubbleGraphData = await props.getUpdatedHindsightBubbleGraphData(
        payload,
        "assort-smart"
      );
      if (bubbleGraphData?.data?.status) {
        props.setHindsightBubbleGraphData(bubbleGraphData?.data?.data);
      }
    } catch (error) {
      props.addSnack({
        message: "Fetching Bubble graph details failed",
        options: {
          variant: "error",
        },
      });
      props.setBubbleGraphLoader(false);
    }
  };

  const generateParetoGraphData = async (payload) => {
    try {
      props.setParetoGraphLoader(true);
      const paretoData = await props.getUpdatedHindsightParetoGraphData(
        payload,
        "assort-smart"
      );
      if (paretoData?.data?.status) {
        props.setHindsightParetoGraphData(paretoData?.data?.data);
      }
    } catch (error) {
      props.addSnack({
        message: "Fetching Top Performing Hierarchies Data failed",
        options: {
          variant: "error",
        },
      });
    }
    props.setParetoGraphLoader(false);
  };

  const generateAttributeGraphData = async (payload) => {
    try {
      props.setAttributeGraphLoader(true);
      const attributeGraphData = await props.getUpdatedHindsightAttributeGraphData(
        payload,
        "assort-smart"
      );
      if (attributeGraphData?.status) {
        props.setHindsightAttributeGraphData(attributeGraphData?.data);
      }
    } catch (error) {
      props.setAttributeGraphLoader(false);
      props.addSnack({
        message: "Fetching Attributes Data failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const generateSTMarginGraphData = async (payload) => {
    try {
      props.setSTMarginGraphLoader(true);
      const stMarginData = await props.getHindsightSTMarginGraphData(
        payload,
        "assort-smart"
      );
      if (stMarginData?.data?.status) {
        props.setHindsightSTMarginGraphData(stMarginData?.data?.data);
      }
    } catch (error) {
      props.addSnack({
        message: "Fetching ST Margin data failed",
        options: {
          variant: "error",
        },
      });
      props.setSTMarginGraphLoader(false);
    }
  };

  const generateClearanceGraphData = async (payload) => {
    try {
      props.setClearanceCarryoverGraphLoader(true);
      const clearanceData = await props.getUpdatedHindsightClearanceCarryoverGraphData(
        payload,
        "assort-smart"
      );
      if (clearanceData?.data?.status) {
        props.setHindsightClearanceCarryoverGraphData(
          clearanceData?.data?.data
        );
      }
    } catch (error) {
      props.addSnack({
        message: "Fetching clearance vs carryover details failed",
        options: {
          variant: "error",
        },
      });
      props.setClearanceCarryoverGraphLoader(false);
    }
  };

  const generateSizeGraphData = async (payload) => {
    try {
      props.setSizeGraphLoader(true);
      // const sizeData = await props.getHindsightSizeGraphData(payload, "assort-smart");
      const sizeData = await props.getUpdatedHindsightSizeGraphData(
        payload,
        "assort-smart"
      );
      if (sizeData?.data?.status) {
        props.setHindsightSizeGraphData(sizeData?.data?.data);
      }
    } catch (error) {
      props.addSnack({
        message: "Fetching size review data failed",
        options: {
          variant: "error",
        },
      });
      props.setSizeGraphLoader(false);
    }
  };

  const closeSaveModal = () => {
    setShowSaveModal(false);
  };

  const handleCancel = () => {
    history.push(`${HINDSIGHT_DASHBOARD}`);
  };

  const saveHindsightView = async (viewName) => {
    setShowSaveModal(false);
    try {
      setHindsightPageLoader(true);
      const filters = [];
      Object.keys(props.levelsJson)?.forEach((level) => {
        if (hindsightFilterSelection[level]) {
          filters.push({
            name: level,
            value: hindsightFilterSelection[level],
          });
        }
      });
      const payload = {
        name:
          props.view_type === "edit"
            ? props.hindsightPlanDetails?.name
            : viewName,
        selling_period_sdate: hindsightFilterSelection["range-picker"][0],
        selling_period_edate: hindsightFilterSelection["range-picker"][1],
        filters: filters,
        season_id: seasonResponseData?.filter((item) => {
          return item.name === hindsightFilterSelection?.season?.[0];
        })?.[0]?.season_code,
        season:
          props.hindsightPlanDetails?.season ||
          hindsightFilterSelection?.season?.[0],
        year: hindsightFilterSelection?.year?.[0],
        tree_graph_filter: treemapFilters,
        bubble_graph_filter: bubbleGraphFilters,
        pareto_graph_filter: paretoGraphFilters,
        attribute_graph_filter: attributeGraphFilters,
        geo_graph_filter: geoGraphFilters,
        week_month_wise_graph_filter: weekMonthComparisonGraphFilters,
        clearance_graph_filter: clearanceGraphFilters,
        size_graph_filter: sizeGraphFilters,
        st_graph_filter: stGraphFilters,
        discount_graph_filter: DiscountGraphFilters,
        channel: hindsightFilterSelection["channel"] || [],
        buy: hindsightFilterSelection["buy"]?.[0] || false,
      };
      let hindisghtView = {};
      if (props.view_type === "edit") {
        payload["hindsight_plan_code"] =
          props.hindsightPlanDetails?.hindsight_plan_code;
        hindisghtView = await props.updateHindisghtView(
          payload,
          props.hindsightPlanDetails?.hindsight_plan_code,
          "assort-smart"
        );
      } else {
        hindisghtView = await props.createHindsightView(
          payload,
          "assort-smart"
        );
      }
      setHindsightPageLoader(false);
      if (hindisghtView?.data?.data?.status) {
        props.addSnack({
          message: "Hindisght view created successfully",
          options: {
            variant: "success",
          },
        });
        history.push(HINDSIGHT_DASHBOARD);
      } else {
        props.addSnack({
          message: hindisghtView?.data?.data?.message,
          options: {
            variant: "error",
          },
        });
      }
    } catch (error) {
      props.addSnack({
        message: "Updating hindsight view failed",
        options: {
          variant: "error",
        },
      });
      setHindsightPageLoader(false);
    }
  };

  useEffect(() => {
    return () => {
      props.setHindsightTreemapData({});
      props.setHindsightPlanDetails({});
      props.setHindsightBubbleGraphData({});
      props.setHindsightParetoGraphData({});
      props.setHindsightAttributeGraphData({});
      props.setHindsightSTMarginGraphData({});
      props.setHindsightClearanceCarryoverGraphData({});
      props.setHindsightSTDiscountGraphData({});
      props.setHindsightSizeGraphData({});
      props.setHindsightGeoGraphData({});
      props.setHindsightTimelineGraphData({});
    };
  }, []);

  const handleGraphExpand = (graphType, expandBool = false) => {
    setLastExpandCollapseGraph(graphType);
    const showGraph = cloneDeep(showSelectedGraph);
    let expandCollapseGraph = cloneDeep(isGraphExpand);
    expandCollapseGraph[graphType] = expandBool;

    // const adjacentGraphMapping = {
    //   pareto: "performance_review",
    //   performance_review: "pareto",
    //   st_margin_discount: "clearance_carryover",
    //   clearance_carryover: "st_margin_discount",
    // }
    // const selectedGraphs = cloneDeep(selectedGraphsInitial.current)
    // if(selectedGraphs[graphType] && selectedGraphs[adjacentGraphMapping[graphType]]){
    //   showGraph[adjacentGraphMapping[graphType]] = !showGraph[adjacentGraphMapping[graphType]];
    //   expandCollapseGraph[graphType] = !expandCollapseGraph[graphType];
    // }
    setShowSelectedGraph(showGraph);
    setIsGraphExpand(expandCollapseGraph);
  };

  return (
    <>
      <AssortBreadCrumbs
        planStep={props.view_type === "edit" ? 9.1 : 9}
        location={history.location.pathname}
      />
      <Paper elevation={3} className={globalClasses.paper}>
        <HindsightCreateNewFilters
          setHindsightFilterSelection={setHindsightFilterSelection}
          generateTreemapData={(payload) => generateTreemapData(payload)}
          setTreemapFilters={setTreemapFilters}
          showHeader={
            props.view_type === "edit"
              ? props.hindsightPlanDetails?.name
              : "Create New View"
          }
          setBubbleGraphFilters={setBubbleGraphFilters}
          generateBubbleGraphData={(payload) =>
            generateBubbleGraphData(payload)
          }
          setHindsightPageLoader={setHindsightPageLoader}
          generateParetoGraphData={(payload) =>
            generateParetoGraphData(payload)
          }
          setParetoGraphFilters={setParetoGraphFilters}
          filterDependency={filterDependency}
          view_type={props.view_type}
          hindsightFilterSelection={hindsightFilterSelection}
          chipsDependency={chipsDependencyData.current}
          seasonOptions={seasonOptions}
          setSelectedGraph={setSelectedGraph}
          setShowSelectedGraph={setShowSelectedGraph}
          setSeasonResponseData={setSeasonResponseData}
        />
        <LoadingOverlay loader={hindsightPageLoader} spinner>
          {isEmpty(hindsightFilterSelection) ? (
            <NoDataWrapper />
          ) : (
            <div>
              <KPIComponent
                hindsightFilterSelection={hindsightFilterSelection}
                view_type={props.view_type}
              />
              <div className={classes.resultContainer}>
                <div className={`${classes.kpiHeader} ${classes.kpiPosition}`}>
                  Visualizations
                </div>
                <div className={classes.dropdownContainer}>
                  {filterView(
                    "Show More Graphs",
                    "show_graph",
                    graphOptions,
                    handleGraphChange,
                    selectedGraphValue,
                    classes.metricsContainer,
                    classes.inputLabel,
                    true,
                    true,
                    "",
                    true,
                    classes.dropdownWidth,
                    true,
                    "assort"
                  )}
                </div>
              </div>
              <div className={classes.stickyBottomButtons}>
                <Button
                  color="primary"
                  variant="outlined"
                  className={classes.secondaryButtonStyle}
                  onClick={() => handleCancel()}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  className={classes.primaryButtonStyle}
                  onClick={() =>
                    props.view_type === "edit"
                      ? saveHindsightView()
                      : setShowSaveModal(true)
                  }
                >
                  {props.view_type === "edit" ? "Update View" : "Save View"}
                </Button>
              </div>
              <HindsightTreemapComponent
                planCode={props.hindsightPlanDetails?.hindsight_plan_code}
                hindsightFilterSelection={hindsightFilterSelection}
                setTreemapFilters={setTreemapFilters}
                treemapFilters={treemapFilters}
                selectedGraphValue={selectedGraphValue}
                generateTreemapData={(payload) => generateTreemapData(payload)}
              />
              <HindsightBubbleGraphComponent
                planCode={props.hindsightPlanDetails?.hindsight_plan_code}
                hindsightFilterSelection={hindsightFilterSelection}
                selectedGraphValue={selectedGraphValue}
                bubbleGraphFilters={bubbleGraphFilters}
                setBubbleGraphFilters={setBubbleGraphFilters}
                generateBubbleGraphData={(payload) =>
                  generateBubbleGraphData(payload)
                }
              />
              <GraphGrid
                showSelectedGraph={showSelectedGraph}
                hindsightFilterSelection={hindsightFilterSelection}
                selectedGraphValue={selectedGraphValue}
                paretoGraphFilters={paretoGraphFilters}
                setParetoGraphFilters={setParetoGraphFilters}
                attributeGraphFilters={attributeGraphFilters}
                setAttributeGraphFilters={setAttributeGraphFilters}
                performanceReviewSelectedTab={performanceReviewSelectedTab}
                setPerformanceReviewSelectedTab={
                  setPerformanceReviewSelectedTab
                }
                geoGraphFilters={geoGraphFilters}
                setGeoGraphFilters={setGeoGraphFilters}
                weekMonthComparisonGraphFilters={
                  weekMonthComparisonGraphFilters
                }
                setWeekMonthComparisonGraphFilters={
                  setWeekMonthComparisonGraphFilters
                }
                stGraphFilters={stGraphFilters}
                setStGraphFilters={setStGraphFilters}
                DiscountGraphFilters={DiscountGraphFilters}
                setDiscountGraphFilters={setDiscountGraphFilters}
                stMarginSelectedTab={stMarginSelectedTab}
                setSTMarginSelectedTab={setSTMarginSelectedTab}
                clearanceGraphFilters={clearanceGraphFilters}
                setClearanceGraphFilters={setClearanceGraphFilters}
                sizeGraphFilters={sizeGraphFilters}
                setSizeGraphFilters={setSizeGraphFilters}
                generateParetoGraphData={generateParetoGraphData}
                generateAttributeGraphData={generateAttributeGraphData}
                generateSTMarginGraphData={generateSTMarginGraphData}
                generateClearanceGraphData={generateClearanceGraphData}
                generateSizeGraphData={generateSizeGraphData}
                graphLevelClass="pareto"
                handleGraphExpand={handleGraphExpand}
                isGraphExpand={isGraphExpand}
                view_type={props.view_type}
                showGraph={showGraph}
                lastExpandCollapseGraph={lastExpandCollapseGraph}
              />

              {/* <div className={classes.paretoGraph}>
                    { (
                      <HindisghtParetoGraphComponent
                        hindsightFilterSelection={hindsightFilterSelection}
                        selectedGraphValue={selectedGraphValue}
                        paretoGraphFilters={paretoGraphFilters}
                        setParetoGraphFilters={setParetoGraphFilters}
                        generateParetoGraphData={(payload) =>
                          generateParetoGraphData(payload)
                        }
                        graphLevelClass="pareto"
                        handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                        isGraphExpand={isGraphExpand['pareto']}
                        view_type={props.view_type}
                        showGraph={showGraph}
                      />
                    )}
                  </div>  */}
              {/*
                  <div className={classes.performanceGraph}>
                    {showSelectedGraph["performance_review"] && (
                      <HindsightPerformanceReviewComponent
                        hindsightFilterSelection={hindsightFilterSelection}
                        selectedGraphValue={selectedGraphValue}
                        attributeGraphFilters={attributeGraphFilters}
                        setAttributeGraphFilters={setAttributeGraphFilters}
                        generateAttributeGraphData={(payload) =>
                          generateAttributeGraphData(payload)
                        }
                        geoGraphFilters={geoGraphFilters}
                        setGeoGraphFilters={setGeoGraphFilters}
                        weekMonthComparisonGraphFilters={
                          weekMonthComparisonGraphFilters
                        }
                        setWeekMonthComparisonGraphFilters={
                          setWeekMonthComparisonGraphFilters
                        }
                        graphLevelClass="performance_review"
                        handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                        isGraphExpand={isGraphExpand}
                        view_type={props.view_type}
                        showGraph={showGraph}
                        selectedTab={performanceReviewSelectedTab}
                        setSelectedTab={setPerformanceReviewSelectedTab}
                      />
                    )}
                  </div>
                </div>
              ) : showSelectedGraph["pareto"] ? (
                <HindisghtParetoGraphComponent
                planCode = {props.hindsightPlanDetails?.hindsight_plan_code}
                  hindsightFilterSelection={hindsightFilterSelection}
                  selectedGraphValue={selectedGraphValue}
                  paretoGraphFilters={paretoGraphFilters}
                  setParetoGraphFilters={setParetoGraphFilters}
                  generateParetoGraphData={(payload) =>
                    generateParetoGraphData(payload)
                  }
                  graphLevelClass="pareto"
                  handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                  isGraphExpand={isGraphExpand}
                  view_type={props.view_type}
                  showGraph={showGraph}
                />
              ) : (
                showSelectedGraph["performance_review"] && (
                  <HindsightPerformanceReviewComponent
                    hindsightFilterSelection={hindsightFilterSelection}
                    selectedGraphValue={selectedGraphValue}
                    attributeGraphFilters={attributeGraphFilters}
                    setAttributeGraphFilters={setAttributeGraphFilters}
                    generateAttributeGraphData={(payload) =>
                      generateAttributeGraphData(payload)
                    }
                    geoGraphFilters={geoGraphFilters}
                    setGeoGraphFilters={setGeoGraphFilters}
                    weekMonthComparisonGraphFilters={
                      weekMonthComparisonGraphFilters
                    }
                    setWeekMonthComparisonGraphFilters={
                      setWeekMonthComparisonGraphFilters
                    }
                    graphLevelClass="performance_review"
                    handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                    isGraphExpand={isGraphExpand}
                    view_type={props.view_type}
                    showGraph={showGraph}
                    selectedTab={performanceReviewSelectedTab}
                    setSelectedTab={setPerformanceReviewSelectedTab}
                  />
                )
              )}

              {showSelectedGraph["st_margin_discount"] &&
              showSelectedGraph["clearance_carryover"] ? (
                <div className={classes.repositionGraph}>
                  <div className={classes.stmarginGraph}>
                    {showSelectedGraph["st_margin_discount"] && (
                      <HindsightStMarginDiscountGraphComponent
                        hindsightFilterSelection={hindsightFilterSelection}
                        selectedGraphValue={selectedGraphValue}
                        stGraphFilters={stGraphFilters}
                        setStGraphFilters={setStGraphFilters}
                        generateSTMarginGraphData={(payload) =>
                          generateSTMarginGraphData(payload)
                        }
                        DiscountGraphFilters={DiscountGraphFilters}
                        setDiscountGraphFilters={setDiscountGraphFilters}
                        graphLevelClass="st_margin_discount"
                        handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                        isGraphExpand={isGraphExpand}
                        view_type={props.view_type}
                        showGraph={showGraph}
                        selectedTab={stMarginSelectedTab}
                        setSelectedTab={setSTMarginSelectedTab}
                      />
                    )}
                  </div>
                  <div className={classes.clearanceGraph}>
                    {showSelectedGraph["clearance_carryover"] && (
                      <HindsightClearanceCarryoverGraphComponent
                        hindsightFilterSelection={hindsightFilterSelection}
                        selectedGraphValue={selectedGraphValue}
                        clearanceGraphFilters={clearanceGraphFilters}
                        setClearanceGraphFilters={setClearanceGraphFilters}
                        generateClearanceGraphData={(payload) =>
                          generateClearanceGraphData(payload)
                        }
                        graphLevelClass="clearance_carryover"
                        handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                        isGraphExpand={isGraphExpand}
                        view_type={props.view_type}
                        showGraph={showGraph}
                      />
                    )}
                  </div>
                </div>
              ) : showSelectedGraph["st_margin_discount"] ? (
                <HindsightStMarginDiscountGraphComponent
                  hindsightFilterSelection={hindsightFilterSelection}
                  selectedGraphValue={selectedGraphValue}
                  stGraphFilters={stGraphFilters}
                  setStGraphFilters={setStGraphFilters}
                  generateSTMarginGraphData={(payload) =>
                    generateSTMarginGraphData(payload)
                  }
                  DiscountGraphFilters={DiscountGraphFilters}
                  setDiscountGraphFilters={setDiscountGraphFilters}
                  graphLevelClass="st_margin_discount"
                  handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                  isGraphExpand={isGraphExpand}
                  view_type={props.view_type}
                  showGraph={showGraph}
                  selectedTab={stMarginSelectedTab}
                  setSelectedTab={setSTMarginSelectedTab}
                />
              ) : (
                showSelectedGraph["clearance_carryover"] && (
                  <HindsightClearanceCarryoverGraphComponent
                    hindsightFilterSelection={hindsightFilterSelection}
                    selectedGraphValue={selectedGraphValue}
                    clearanceGraphFilters={clearanceGraphFilters}
                    setClearanceGraphFilters={setClearanceGraphFilters}
                    generateClearanceGraphData={(payload) =>
                      generateClearanceGraphData(payload)
                    }
                    graphLevelClass="clearance_carryover"
                    handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                    isGraphExpand={isGraphExpand}
                    view_type={props.view_type}
                    showGraph={showGraph}
                  />
                )
              )}
              <div>
                {showSelectedGraph["size_review"] && (
                  <HindsightSizeGraphComponent
                    hindsightFilterSelection={hindsightFilterSelection}
                    selectedGraphValue={selectedGraphValue}
                    sizeGraphFilters={sizeGraphFilters}
                    setSizeGraphFilters={setSizeGraphFilters}
                    generateSizeGraphData={(payload) =>
                      generateSizeGraphData(payload)
                    }
                    graphLevelClass="size-review"
                    handleGraphExpand={(graphType) => handleGraphExpand(graphType)}
                    isGraphExpand={isGraphExpand}
                    view_type={props.view_type}
                    showGraph={showGraph}
                  />
                )}
              </div> */}
              {showSaveModal && props.view_type !== "edit" && (
                <ViewName
                  isOpen={showSaveModal}
                  onClose={closeSaveModal}
                  handleSaveView={saveHindsightView}
                />
              )}
            </div>
          )}
        </LoadingOverlay>
      </Paper>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
    treemapLoader: HindsightServiceActions.setHindsightLoaderSelector(state),
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    selectedFilters: state.filterReducer.selectedFilters,
    paretoGraphData: HindsightServiceActions.setHindsightParetoGraphSelector(
      state
    ),
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration,
    attributeGraphData: HindsightServiceActions.setHindsightAttributeGraphSelector(
      state
    ),
    stMarginData: HindsightServiceActions.setHindsightSTMarginGraphSelector(
      state
    ),
    clearanceCarryoverData: HindsightServiceActions.setHindsightClearanceCarryoverGraphSelector(
      state
    ),
    sizeGraphData: HindsightServiceActions.setHindsightSizeGraphSelector(state),
  };
};

const mapActionsToProps = {
  getTenantConfigApplicationLevel,
  setScreenConfiguration,
  getPlanLevels,
  setLevelsJson,
  getHindsightTreemapData,
  setHindsightLoader,
  setHindsightTreemapData,
  addSnack,
  getHindsightTreemapFilters,
  setHindsightTreemapFiltersOptions,
  getSeasonOptions,
  createHindsightView,
  getHindsightPlanDetails,
  setHindsightPlanDetails,
  getHindsightBubbleGraphData,
  setHindsightBubbleGraphData,
  setBubbleGraphLoader,
  updateHindisghtView,
  getParetoGraphData,
  setParetoGraphLoader,
  setHindsightParetoGraphData,
  setSelectedFilters,
  getHindsightAttributeGraphData,
  setHindsightAttributeGraphData,
  setAttributeGraphLoader,
  setTreemapLoader,
  setSTMarginGraphLoader,
  setHindsightSTMarginGraphData,
  getHindsightSTMarginGraphData,
  getHindsightClearanceCarryoverGraphData,
  setClearanceCarryoverGraphLoader,
  setHindsightClearanceCarryoverGraphData,
  setSizeGraphLoader,
  setHindsightSizeGraphData,
  getHindsightSizeGraphData,
  setHindsightSTDiscountGraphData,
  getUpdatedHindsightSizeGraphData,
  getUpdatedHindsightAttributeGraphData,
  getUpdatedHindsightClearanceCarryoverGraphData,
  setHindsightGeoGraphData,
  setHindsightTimelineGraphData,
  getUpdatedHindsightBubbleGraphData,
  getUpdatedHindsightParetoGraphData,
  getUpdatedHindsightTreeMapData,
};
export default connect(mapStateToProps, mapActionsToProps)(CreateHindsightView);
