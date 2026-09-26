import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { Typography, Card, Grid, Button, Popover } from "@mui/material";
import { groupBy, isEmpty } from "lodash";
import PlanGraphTabViewComponent from "../Plan/plan-drop-tab-view-component";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import { reviewPerformanceGraphTabs } from "modules/assortsmart/constants-assortsmart/stringContants";
import HindsightAttributeGraphComponent from "./hindsight-attribute-graph-component";
import HindsightGeographicalComponent from "./hindsight-geographical-component";
import HindsightWeekMonthWiseGraphComponent from "./hindsight-week-month-wise-graph-component";
import { formatPerformanceReviewGraphPayload } from "./hindsight-functions";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import {
  getHindsightTreemapFilters,
  setHindsightTreemapFiltersOptions,
  getHindsightTimelineGraphData,
  setHindsightTimelineGraphData,
  setTimelineGraphLoader,
  getHindsightGeoGraphData,
  setHindsightGeoGraphData,
  setGeoGraphLoader,
  getUpdatedHindsightGeoGraphData,
  getUpdatedHindsightTimelineGraphData,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import { getAllFilters } from "core/actions/filterAction";

const HindsightPerformanceReviewComponent = (props) => {
  const classes = useStyles();
  const history = useHistory();
  const globalClasses = globalStyles();
  const [geoGraphFilters, setGeoGraphFilters] = useState({});
  const [
    weekMonthComparisonGraphFilters,
    setWeekMonthComparisonGraphFilters,
  ] = useState({});
  const tabValues = useRef({});
  const filtersConfig = useRef({});
  const generateGeoGraphData = async (payload) => {
    try {
      props.setGeoGraphLoader(true);
      const geoGraphData = await props.getUpdatedHindsightGeoGraphData(
        payload,
        "assort-smart"
      );
      if (geoGraphData?.data?.status) {
        props.setHindsightGeoGraphData(geoGraphData?.data?.data);
      }
    } catch (error) {
      props.setGeoGraphLoader(false);
      props.addSnack({
        message: "Fetching geographical location details failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const generateWeekMonthComparisonData = async (payload) => {
    try {
      props.setTimelineGraphLoader(true);
      const weekMonthWiseData = await props.getUpdatedHindsightTimelineGraphData(
        payload,
        "assort-smart"
      );
      if (weekMonthWiseData?.data?.status) {
        props.setHindsightTimelineGraphData(weekMonthWiseData?.data);
      }
      props.setTimelineGraphLoader(false);
    } catch (error) {
      props.addSnack({
        message: "Fetching week/month wise graph details failed",
        options: {
          variant: "error",
        },
      });
      props.setTimelineGraphLoader(false);
    }
  };

  const handleTabChange = (selectedData) => {
    if (String(selectedData) !== String(props.selectedTab)) {
      props.setSelectedTab(selectedData);
      if (selectedData === "Attribute") {
      } else if (selectedData === "Geographical Location") {
        if (isEmpty(props.geoGraphData)) {
          const payload = formatPerformanceReviewGraphPayload(
            props.hindsightFilterSelection,
            props.hindsightPlanDetails,
            props.setGeoGraphFilters,
            history,
            props,
            "geograph"
          );
          generateGeoGraphData(payload);
        }
      } else if (selectedData === "Week/Month Wise Comparison") {
        if (isEmpty(props.hindsightTimelineGraphData)) {
          const payload = formatPerformanceReviewGraphPayload(
            props.hindsightFilterSelection,
            props.hindsightPlanDetails,
            props.setWeekMonthComparisonGraphFilters,
            history,
            props,
            "week/month wise"
          );
          generateWeekMonthComparisonData(payload);
        }
      }
    }
  };
  return (
    <Card
      className={`${globalClasses.paper} ${classes.paperPadding} ${
        classes.hindsightGraphCard
      } ${props.isGraphExpand ? "" : classes.graphCardHeight}`}
      id="tree-graph"
    >
      {reviewPerformanceGraphTabs && (
        <PlanGraphTabViewComponent
          groupedDrops={reviewPerformanceGraphTabs}
          onChangeTab={handleTabChange}
          selectedTab={props.selectedTab}
        />
      )}
      {props.selectedTab === "Attribute" && (
        <HindsightAttributeGraphComponent
          hindsightFilterSelection={props.hindsightFilterSelection}
          selectedGraphValue={props.selectedGraphValue}
          attributeGraphFilters={props.attributeGraphFilters}
          setAttributeGraphFilters={props.setAttributeGraphFilters}
          generateAttributeGraphData={(payload) =>
            props.generateAttributeGraphData(payload)
          }
          tabValues={tabValues.current}
          filtersConfig={filtersConfig.current}
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          btnVisible={props.btnVisible}
        />
      )}
      {props.selectedTab === "Geographical Location" && (
        <HindsightGeographicalComponent
          hindsightFilterSelection={props.hindsightFilterSelection}
          selectedGraphValue={props.selectedGraphValue}
          geoGraphFilters={props.geoGraphFilters}
          setGeoGraphFilters={props.setGeoGraphFilters}
          generateGeoGraphData={(payload) => generateGeoGraphData(payload)}
          tabValues={tabValues.current}
          filtersConfig={filtersConfig.current}
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={props.handleExport}
          btnVisible={props.btnVisible}
        />
      )}
      {props.selectedTab === "Week/Month Wise Comparison" && (
        <HindsightWeekMonthWiseGraphComponent
          hindsightFilterSelection={props.hindsightFilterSelection}
          selectedGraphValue={props.selectedGraphValue}
          weekMonthComparisonGraphFilters={
            props.weekMonthComparisonGraphFilters
          }
          setWeekMonthComparisonGraphFilters={
            props.setWeekMonthComparisonGraphFilters
          }
          generateWeekMonthComparisonData={(payload) =>
            generateWeekMonthComparisonData(payload)
          }
          tabValues={tabValues.current}
          filtersConfig={filtersConfig.current}
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          onExport={props.handleExport}
          btnVisible={props.btnVisible}
        />
      )}
    </Card>
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
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration,
    geoGraphData: HindsightServiceActions.setHindsightGeoGraphSelector(state),
    hindsightTimelineGraphData: HindsightServiceActions.setHindsightTimelineGraphSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  addSnack,
  getHindsightTreemapFilters,
  setHindsightTreemapFiltersOptions,
  getHindsightTimelineGraphData,
  setHindsightTimelineGraphData,
  setTimelineGraphLoader,
  getAllFilters,
  getHindsightGeoGraphData,
  setHindsightGeoGraphData,
  setGeoGraphLoader,
  getUpdatedHindsightGeoGraphData,
  getUpdatedHindsightTimelineGraphData,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightPerformanceReviewComponent);
