import { useState, useEffect, useRef } from "react";
import { Button, Paper, Typography } from "@mui/material";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import AssortBreadCrumbs from "../assort-bread-crumbs";
import GlobalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import HindsightTreemapComponent from "./hindsight-treemap-component";
import HindsightCreateNewFilters from "./hindsight-create-new-filters";
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
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import ViewName from "./hindsight-save-view-modal";
import { HINDSIGHT_DASHBOARD } from "modules/assortsmart/constants-assortsmart/routesContants";
import HindsightBubbleGraphComponent from "./hindsight-bubble-graph-component";
import HindisghtParetoGraphComponent from "./hindisght-pareto-graph-component";
import { showGraphData } from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  formatParetoGraphPayload,
  getFiltersData,
} from "./hindsight-functions";
import { setSelectedFilters } from "../../../../core/actions/filterAction";

const CreateHindsightView = (props) => {
  const [hindsightFilterSelection, setHindsightFilterSelection] = useState({});
  const [treemapFilters, setTreemapFilters] = useState({});
  const [bubbleGraphFilters, setBubbleGraphFilters] = useState({});
  const [paretoGraphFilters, setParetoGraphFilters] = useState({});
  const [graphOptions, setGraphOptions] = useState([]);
  const [selectedGraphValue, setSelectedGraph] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [hindsightPageLoader, setHindsightPageLoader] = useState(false);
  const [showSelectedGraph, setShowSelectedGraph] = useState({
    pareto: false,
  });
  const history = useHistory();
  const globalClasses = GlobalStyles();
  const classes = useStyles();
  const [filterDependency, setFilterDependency] = useState([]);

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
  };

  const handleShowGraphData = () => {
    const showGraph = cloneDeep(showSelectedGraph);
    if (isEmpty(selectedGraphValue)) {
      Object.keys(showSelectedGraph)?.forEach((graph) => {
        showGraph[graph] = false;
      });
    } else {
      Object.keys(showGraph)?.forEach((item) => {
        const graphData = selectedGraphValue?.filter((graph) => {
          return graph.value === item;
        });
        if (graphData?.length) {
          showGraph[item] = true;
        } else {
          showGraph[item] = false;
        }
      });
    }
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
    setShowSelectedGraph(showGraph);
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
    const payload = {
      filters: filters,
      graph_filters: graph_filters,
      metrics: metricsData,
      filters_applied: hindsightPlanData?.tree_graph_filter?.filters_applied,
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
    const payload = {
      filters: filters,
      graph_filters: graphFilters,
      filters_applied: hindsightPlanData?.bubble_graph_filter?.filters_applied,
      settings: settings,
      season: hindsightPlanData?.season,
      selling_period_sdate: hindsightPlanData?.selling_period_sdate,
      selling_period_edate: hindsightPlanData?.selling_period_edate,
    };
    return payload;
  };

  const configureGloabalFilters = () => {
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
    filtersSelected["season"] = [props.hindsightPlanDetails?.season_id];
    filtersSelected["year"] = [props.hindsightPlanDetails?.year];
    filtersSelected["filters_applied"] =
      props.hindsightPlanDetails?.filters_applied || [];
    const filterDependency = [];
    let selectedFilterObj = cloneDeep(props.selectedFilters);
    for(const key in filtersSelected){
      const filterItem = {
        "filter_id": key,
        "filter_type": "",
        "dimension": "",
        "display_type": "dropdown",
        "values": filtersSelected[key],
        "attribute_name": key,
        "operator": "in"
      }
      let screenName = "";
      if(Object.keys(props.levelsJson)?.includes(key)){
        filterItem["dimension"] = "product";
        filterItem["filter_type"] = "cascaded";
        screenName = "hindsight-create-view-product-0";
      }else if(key === "channel"){
        filterItem["dimension"] = "store";
        filterItem["filter_type"] = "non-cascaded";
        screenName = "hindsight-create-view-store-0"
      }else{
        filterItem["dimension"] = "custom";
        filterItem["filter_type"] = "non-cascaded";
        screenName = "hindsight-create-view-custom-0"
      }
      if(selectedFilterObj[screenName]){
        selectedFilterObj[screenName].push(filterItem)
      }else{
        selectedFilterObj[screenName] = [filterItem]
      }
      // filterItem["screenName"] = screenName;
      filterDependency.push(filterItem);
    }
    console.log("filter:", selectedFilterObj)
    props.setSelectedFilters(selectedFilterObj);
    setFilterDependency(filterDependency);
    setHindsightFilterSelection(filtersSelected);
    setTreemapFilters({
      l0_name: props.hindsightPlanDetails?.l0_name,
      ...props.hindsightPlanDetails?.tree_graph_filter,
    });
    const treemapPayload = formatTreemapPayload(props.hindsightPlanDetails);
    generateTreemapData(treemapPayload);
    if (props.hindsightPlanDetails?.bubble_graph_filter) {
      setBubbleGraphFilters({
        l0_name: props.hindsightPlanDetails?.l0_name,
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
      props.setHindsightLoader(true);
      const treemapData = await props.getHindsightTreemapData(
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
      props.setHindsightLoader(false);
    }
  };

  const generateBubbleGraphData = async (payload) => {
    try {
      props.setBubbleGraphLoader(true);
      const bubbleGraphData = await props.getHindsightBubbleGraphData(
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
      const paretoData = await props.getParetoGraphData(
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

  const closeSaveModal = () => {
    setShowSaveModal(false);
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
        season_id: hindsightFilterSelection["season"]?.[0],
        season:
          props.hindsightPlanDetails?.season ||
          hindsightFilterSelection?.season_name,
        year: hindsightFilterSelection?.year?.[0],
        tree_graph_filter: treemapFilters,
        bubble_graph_filter: bubbleGraphFilters,
        pareto_graph_filter: paretoGraphFilters,
        channel: hindsightFilterSelection["channel"] || []
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
          message: createHindsightView?.data?.data?.message,
          options: {
            variant: "error",
          },
        });
      }
    } catch (error) {
      setHindsightPageLoader(false);
    }
  };

  useEffect(() => {
    return () => {
      props.setHindsightTreemapData({});
      props.setHindsightPlanDetails({});
      props.setHindsightBubbleGraphData({});
      props.setHindsightParetoGraphData({});
    };
  }, []);

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
        />
        <LoadingOverlay loader={hindsightPageLoader} spinner>
          {isEmpty(hindsightFilterSelection) ? (
            <NoDataWrapper />
          ) : (
            <div>
              <KPIComponent
                hindsightFilterSelection={hindsightFilterSelection}
              />
              <div className={classes.resultContainer}>
                <Typography variant="h5">Visualizations</Typography>
                <div>
                  <div className={classes.dropdownContainer}>
                    {filterView(
                      "Show Graphs",
                      "show_graph",
                      graphOptions,
                      handleGraphChange,
                      selectedGraphValue,
                      classes.metricsContainer,
                      classes.inputLabel,
                      true,
                      false,
                      "",
                      true
                    )}
                  </div>
                  <Button
                    color="primary"
                    variant="contained"
                    className={classes.button}
                    onClick={() => handleShowGraphData()}
                  >
                    Apply
                  </Button>
                </div>
              </div>
              <HindsightTreemapComponent
                hindsightFilterSelection={hindsightFilterSelection}
                setTreemapFilters={setTreemapFilters}
                treemapFilters={treemapFilters}
                selectedGraphValue={selectedGraphValue}
                generateTreemapData={(payload) => generateTreemapData(payload)}
              />
              <HindsightBubbleGraphComponent
                hindsightFilterSelection={hindsightFilterSelection}
                selectedGraphValue={selectedGraphValue}
                bubbleGraphFilters={bubbleGraphFilters}
                setBubbleGraphFilters={setBubbleGraphFilters}
                generateBubbleGraphData={(payload) =>
                  generateBubbleGraphData(payload)
                }
              />
              {showSelectedGraph["pareto"] && (
                <HindisghtParetoGraphComponent
                  hindsightFilterSelection={hindsightFilterSelection}
                  selectedGraphValue={selectedGraphValue}
                  paretoGraphFilters={paretoGraphFilters}
                  setParetoGraphFilters={setParetoGraphFilters}
                  generateParetoGraphData={(payload) =>
                    generateParetoGraphData(payload)
                  }
                />
              )}
              <div className={classes.dashboardFiltersBtnsDiv}>
                <Button
                  color="primary"
                  variant="outlined"
                  className={classes.smallPrimaryButton}
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  className={classes.smallPrimaryButton}
                  onClick={() =>
                    props.view_type === "edit"
                      ? saveHindsightView()
                      : setShowSaveModal(true)
                  }
                >
                  {props.view_type === "edit" ? "Update View" : "Save View"}
                </Button>
              </div>
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
  setSelectedFilters
};
export default connect(mapStateToProps, mapActionsToProps)(CreateHindsightView);
