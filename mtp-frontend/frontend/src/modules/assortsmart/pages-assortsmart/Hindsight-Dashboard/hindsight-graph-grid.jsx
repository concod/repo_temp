import { connect } from "react-redux";
import { cloneDeep } from "lodash";
import { styled } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { setScreenConfiguration } from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  getPlanLevels,
  setLevelsJson,
  getSeasonOptions,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
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
import HindisghtParetoGraphComponent from "./hindisght-pareto-graph-component";
import { setSelectedFilters } from "../../../../core/actions/filterAction";
import HindsightPerformanceReviewComponent from "./hindsight-performance-review-by-component";
import HindsightStMarginDiscountGraphComponent from "./hindsight-st-margin-discount-graph-component";
import HindsightClearanceCarryoverGraphComponent from "./hindsight-clearance-carryover-graph-component";
import HindsightSizeGraphComponent from "./hindsight-size-graph-component";

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === "dark" ? "#1A2027" : "#fff",
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: "center",
  color: "black",
}));

const GraphGrid = (props) => {
  const classes = useStyles();

  const shows = [
    props.showSelectedGraph["pareto"],
    props.showSelectedGraph["performance_review"],
    props.showSelectedGraph["st_margin_discount"],
    props.showSelectedGraph["clearance_carryover"],
    props.showSelectedGraph["size_review"],
  ];
  const graphList = [
    "pareto",
    "performance_review",
    "st_margin_discount",
    "clearance_carryover",
    "size_review",
  ];
  const visibleItemsCount = shows.filter(Boolean).length;

  // Find indices of visible items
  const visibleIndices = shows
    .map((show, index) => (show ? index : -1))
    .filter((index) => index !== -1);

  const getAdjacentGraphs = (shows) => {
    const visibleGraphs = shows
      .map((show, index) => ({ show, index }))
      .filter((item) => item.show);

    const adjacentPairs = [];
    const visibleCount = visibleGraphs.length;

    for (let i = 0; i < visibleCount - 1; i += 2) {
      adjacentPairs.push([visibleGraphs[i].index, visibleGraphs[i + 1].index]);
    }

    if (visibleCount % 2 !== 0) {
      adjacentPairs.push([visibleGraphs[visibleCount - 1].index, -1]);
    }

    return adjacentPairs;
  };

  const updateExpandGraph = () => {
    let tempExpandArr = cloneDeep(props.isGraphExpand);
    if (adjacentGraphs.length <= 0) {
      return tempExpandArr;
    } else {
      for (let item of adjacentGraphs) {
        if (
          item[0] >= 0 &&
          item[1] >= 0 &&
          (graphList[item[0]] === props.lastExpandCollapseGraph ||
            graphList[item[1]] === props.lastExpandCollapseGraph)
        ) {
          if (props.isGraphExpand[props.lastExpandCollapseGraph]) {
            tempExpandArr[graphList[item[0]]] = true;
            tempExpandArr[graphList[item[1]]] = true;
          } else {
            tempExpandArr[graphList[item[0]]] = false;
            tempExpandArr[graphList[item[1]]] = false;
          }
        } else if (item[0] >= 0 && item[1] >= 0) {
          if (
            tempExpandArr[graphList[item[0]]] === true ||
            tempExpandArr[graphList[item[1]]] === true
          ) {
            tempExpandArr[graphList[item[0]]] = true;
            tempExpandArr[graphList[item[1]]] = true;
          } else {
            tempExpandArr[graphList[item[0]]] = false;
            tempExpandArr[graphList[item[1]]] = false;
          }
        }
      }
      return tempExpandArr;
    }
  };
  let adjacentGraphs = [];
  let updatedGraphExpand = "";
  if (props.lastExpandCollapseGraph) {
    adjacentGraphs = getAdjacentGraphs(shows);
    updatedGraphExpand = updateExpandGraph();
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2}>
        {props.showSelectedGraph["pareto"] &&
          (!updatedGraphExpand["pareto"] ? (
            <Grid
              item
              xs={
                visibleItemsCount % 2 !== 0 &&
                visibleIndices[visibleIndices.length - 1] === 0
                  ? 12
                  : 6
              }
            >
              <HindisghtParetoGraphComponent
                hindsightFilterSelection={props.hindsightFilterSelection}
                selectedGraphValue={props.selectedGraphValue}
                paretoGraphFilters={props.paretoGraphFilters}
                setParetoGraphFilters={props.setParetoGraphFilters}
                generateParetoGraphData={(payload) =>
                  props.generateParetoGraphData(payload)
                }
                graphLevelClass="pareto"
                handleGraphExpand={props.handleGraphExpand}
                isGraphExpand={updatedGraphExpand["pareto"]}
                view_type={props.view_type}
                showGraph={props.showGraph}
                className={classes.paretoGraph}
                btnVisible={
                  visibleItemsCount % 2 !== 0 &&
                  visibleIndices[visibleIndices.length - 1] === 0
                    ? false
                    : true
                }
              />
            </Grid>
          ) : (
            <HindisghtParetoGraphComponent
              hindsightFilterSelection={props.hindsightFilterSelection}
              selectedGraphValue={props.selectedGraphValue}
              paretoGraphFilters={props.paretoGraphFilters}
              setParetoGraphFilters={props.setParetoGraphFilters}
              generateParetoGraphData={(payload) =>
                props.generateParetoGraphData(payload)
              }
              graphLevelClass="pareto"
              handleGraphExpand={props.handleGraphExpand}
              isGraphExpand={updatedGraphExpand["pareto"]}
              view_type={props.view_type}
              showGraph={props.showGraph}
              btnVisible={true}
            />
          ))}
        {props.showSelectedGraph["performance_review"] &&
          (!updatedGraphExpand["performance_review"] ? (
            <Grid
              item
              xs={
                visibleItemsCount % 2 !== 0 &&
                visibleIndices[visibleIndices.length - 1] === 1
                  ? 12
                  : 6
              }
            >
              <HindsightPerformanceReviewComponent
                hindsightFilterSelection={props.hindsightFilterSelection}
                selectedGraphValue={props.selectedGraphValue}
                attributeGraphFilters={props.attributeGraphFilters}
                setAttributeGraphFilters={props.setAttributeGraphFilters}
                generateAttributeGraphData={(payload) =>
                  props.generateAttributeGraphData(payload)
                }
                geoGraphFilters={props.geoGraphFilters}
                setGeoGraphFilters={props.setGeoGraphFilters}
                weekMonthComparisonGraphFilters={
                  props.weekMonthComparisonGraphFilters
                }
                setWeekMonthComparisonGraphFilters={
                  props.setWeekMonthComparisonGraphFilters
                }
                graphLevelClass="performance_review"
                handleGraphExpand={props.handleGraphExpand}
                isGraphExpand={updatedGraphExpand["performance_review"]}
                view_type={props.view_type}
                showGraph={props.showGraph}
                selectedTab={props.performanceReviewSelectedTab}
                setSelectedTab={props.setPerformanceReviewSelectedTab}
                className={classes.performanceGraph}
                btnVisible={
                  visibleItemsCount % 2 !== 0 &&
                  visibleIndices[visibleIndices.length - 1] === 1
                    ? false
                    : true
                }
              />
            </Grid>
          ) : (
            <HindsightPerformanceReviewComponent
              hindsightFilterSelection={props.hindsightFilterSelection}
              selectedGraphValue={props.selectedGraphValue}
              attributeGraphFilters={props.attributeGraphFilters}
              setAttributeGraphFilters={props.setAttributeGraphFilters}
              generateAttributeGraphData={(payload) =>
                props.generateAttributeGraphData(payload)
              }
              geoGraphFilters={props.geoGraphFilters}
              setGeoGraphFilters={props.setGeoGraphFilters}
              weekMonthComparisonGraphFilters={
                props.weekMonthComparisonGraphFilters
              }
              setWeekMonthComparisonGraphFilters={
                props.setWeekMonthComparisonGraphFilters
              }
              graphLevelClass="performance_review"
              handleGraphExpand={props.handleGraphExpand}
              isGraphExpand={updatedGraphExpand["performance_review"]}
              view_type={props.view_type}
              showGraph={props.showGraph}
              selectedTab={props.performanceReviewSelectedTab}
              setSelectedTab={props.setPerformanceReviewSelectedTab}
              btnVisible={true}
            />
          ))}
        {props.showSelectedGraph["st_margin_discount"] &&
          (!updatedGraphExpand["st_margin_discount"] ? (
            <Grid
              item
              xs={
                visibleItemsCount % 2 !== 0 &&
                visibleIndices[visibleIndices.length - 1] === 2
                  ? 12
                  : 6
              }
            >
              <HindsightStMarginDiscountGraphComponent
                hindsightFilterSelection={props.hindsightFilterSelection}
                selectedGraphValue={props.selectedGraphValue}
                stGraphFilters={props.stGraphFilters}
                setStGraphFilters={props.setStGraphFilters}
                generateSTMarginGraphData={(payload) =>
                  props.generateSTMarginGraphData(payload)
                }
                DiscountGraphFilters={props.DiscountGraphFilters}
                setDiscountGraphFilters={props.setDiscountGraphFilters}
                graphLevelClass="st_margin_discount"
                handleGraphExpand={props.handleGraphExpand}
                isGraphExpand={updatedGraphExpand["st_margin_discount"]}
                view_type={props.view_type}
                showGraph={props.showGraph}
                selectedTab={props.stMarginSelectedTab}
                setSelectedTab={props.setSTMarginSelectedTab}
                className={classes.stmarginGraph}
                btnVisible={
                  visibleItemsCount % 2 !== 0 &&
                  visibleIndices[visibleIndices.length - 1] === 2
                    ? false
                    : true
                }
              />
            </Grid>
          ) : (
            <HindsightStMarginDiscountGraphComponent
              hindsightFilterSelection={props.hindsightFilterSelection}
              selectedGraphValue={props.selectedGraphValue}
              stGraphFilters={props.stGraphFilters}
              setStGraphFilters={props.setStGraphFilters}
              generateSTMarginGraphData={(payload) =>
                props.generateSTMarginGraphData(payload)
              }
              DiscountGraphFilters={props.DiscountGraphFilters}
              setDiscountGraphFilters={props.setDiscountGraphFilters}
              graphLevelClass="st_margin_discount"
              handleGraphExpand={props.handleGraphExpand}
              isGraphExpand={updatedGraphExpand["st_margin_discount"]}
              view_type={props.view_type}
              showGraph={props.showGraph}
              selectedTab={props.stMarginSelectedTab}
              setSelectedTab={props.setSTMarginSelectedTab}
              className={classes.stmarginGraph}
              btnVisible={true}
            />
          ))}
        {props.showSelectedGraph["clearance_carryover"] &&
          (!updatedGraphExpand["clearance_carryover"] ? (
            <Grid
              item
              xs={
                visibleItemsCount % 2 !== 0 &&
                visibleIndices[visibleIndices.length - 1] === 3
                  ? 12
                  : 6
              }
            >
              <HindsightClearanceCarryoverGraphComponent
                hindsightFilterSelection={props.hindsightFilterSelection}
                selectedGraphValue={props.selectedGraphValue}
                clearanceGraphFilters={props.clearanceGraphFilters}
                setClearanceGraphFilters={props.setClearanceGraphFilters}
                generateClearanceGraphData={(payload) =>
                  props.generateClearanceGraphData(payload)
                }
                graphLevelClass="clearance_carryover"
                handleGraphExpand={props.handleGraphExpand}
                isGraphExpand={updatedGraphExpand["clearance_carryover"]}
                view_type={props.view_type}
                showGraph={props.showGraph}
                className={classes.clearanceGraph}
                btnVisible={
                  visibleItemsCount % 2 !== 0 &&
                  visibleIndices[visibleIndices.length - 1] === 3
                    ? false
                    : true
                }
              />
            </Grid>
          ) : (
            <HindsightClearanceCarryoverGraphComponent
              hindsightFilterSelection={props.hindsightFilterSelection}
              selectedGraphValue={props.selectedGraphValue}
              clearanceGraphFilters={props.clearanceGraphFilters}
              setClearanceGraphFilters={props.setClearanceGraphFilters}
              generateClearanceGraphData={(payload) =>
                props.generateClearanceGraphData(payload)
              }
              graphLevelClass="clearance_carryover"
              handleGraphExpand={props.handleGraphExpand}
              isGraphExpand={updatedGraphExpand["clearance_carryover"]}
              view_type={props.view_type}
              showGraph={props.showGraph}
              className={classes.clearanceGraph}
              btnVisible={true}
            />
          ))}
        {props.showSelectedGraph["size_review"] &&
          (!updatedGraphExpand["size_review"] ? (
            <Grid
              item
              xs={
                visibleItemsCount % 2 !== 0 &&
                visibleIndices[visibleIndices.length - 1] === 4
                  ? 12
                  : 6
              }
            >
              <HindsightSizeGraphComponent
                hindsightFilterSelection={props.hindsightFilterSelection}
                selectedGraphValue={props.selectedGraphValue}
                sizeGraphFilters={props.sizeGraphFilters}
                setSizeGraphFilters={props.setSizeGraphFilters}
                generateSizeGraphData={(payload) =>
                  props.generateSizeGraphData(payload)
                }
                graphLevelClass="size_review"
                handleGraphExpand={props.handleGraphExpand}
                isGraphExpand={updatedGraphExpand["size_review"]}
                view_type={props.view_type}
                showGraph={props.showGraph}
                btnVisible={
                  visibleItemsCount % 2 !== 0 &&
                  visibleIndices[visibleIndices.length - 1] === 4
                    ? false
                    : true
                }
              />
            </Grid>
          ) : (
            <HindsightSizeGraphComponent
              hindsightFilterSelection={props.hindsightFilterSelection}
              selectedGraphValue={props.selectedGraphValue}
              sizeGraphFilters={props.sizeGraphFilters}
              setSizeGraphFilters={props.setSizeGraphFilters}
              generateSizeGraphData={(payload) =>
                props.generateSizeGraphData(payload)
              }
              graphLevelClass="size_review"
              handleGraphExpand={props.handleGraphExpand}
              isGraphExpand={updatedGraphExpand["size_review"]}
              view_type={props.view_type}
              showGraph={props.showGraph}
              btnVisible={true}
            />
          ))}
      </Grid>
    </Box>
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
export default connect(mapStateToProps, mapActionsToProps)(GraphGrid);
