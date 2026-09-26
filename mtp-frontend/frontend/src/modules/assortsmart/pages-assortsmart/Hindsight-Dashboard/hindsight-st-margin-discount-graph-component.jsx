import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Card } from "@mui/material";
import PlanGraphTabViewComponent from "../Plan/plan-drop-tab-view-component";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { STMarginAndDiscounteGraphTabs } from "modules/assortsmart/constants-assortsmart/stringContants";
import HindsightSTDiscountGraphComponent from "./hindsight-st-discount-graph";
import HindsightSTMarginGraphComponent from "./hindsight-st-margin-graph";
import * as HindsightServiceActions from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import { addSnack } from "core/actions/snackbarActions";
import { isEmpty } from "lodash";
import { useHistory } from "react-router";
import { formatSTMarginPayload } from "./hindsight-functions";
import {
  getHindsightSTDiscountGraphData,
  setHindsightSTDiscountGraphData,
  setSTDiscountGraphLoader,
  setSTMarginGraphLoader,
  getHindsightGraphDownload,
} from "modules/assortsmart/services-assortsmart/Hindsight-Dashboard/hindsight-dashboard-service";
import globalStyles from "core/Styles/globalStyles";
import { downloadAsExcel } from "./hindsight-functions";

const HindsightSTMarginDiscountComponent = (props) => {
  const classes = useStyles();
  const [DiscountGraphFilters, setDiscountGraphFilters] = useState({});
  const history = useHistory();
  const [chartRef, setChartRef] = useState(null);
  const globalClasses = globalStyles();

  const generateSTDiscountGraphData = async (payload) => {
    console.log("Inside STDiscount function");
    try {
      props.setSTMarginGraphLoader(true);
      const STDiscountGraphData = await props.getHindsightSTDiscountGraphData(
        payload,
        "assort-smart"
      );
      console.log("StDiscount", STDiscountGraphData);
      if (STDiscountGraphData?.data?.status) {
        props.setHindsightSTDiscountGraphData(STDiscountGraphData?.data?.data);
      }
    } catch (error) {
      props.setSTMarginGraphLoader(false);
      props.addSnack({
        message: "Fetching ST-Discount location details failed",
        options: {
          variant: "error",
        },
      });
    }
  };

  const handleChartRef = (ref) => {
    setChartRef(ref);
  };

  const handleExport = (format) => {
    if (format === "jpeg") {
      chartRef.current.chart.exportChart({ type: "image/jpeg" });
    } else if (format === "pdf") {
      chartRef.current.chart.exportChart({ type: "application/pdf" });
    } else if (format === "excel") {
      downloadAsExcel(props.stGraphFilters,props.hindsightFilterSelection,props.planCode,props.getHindsightGraphDownload,"st_margin_graph",props.addSnack)
    }
  };

  const handleTabChange = (selectedData) => {
    props.setSelectedTab(selectedData);
    if (selectedData == "Discount margin and sold quantity analysis") {
      if (
        isEmpty(props.STDiscountGraphData) &&
        isEmpty(props.DiscountGraphFilters)
      ) {
        const payload = formatSTMarginPayload(
          props.hindsightFilterSelection,
          props.hindsightPlanDetails,
          props.setDiscountGraphFilters,
          history,
          props,
          "Discount margin "
        );
        generateSTDiscountGraphData(payload);
      }
    }
  };
  return (
    <Card
      className={`${globalClasses.paper} ${classes.paperPadding} ${
        classes.hindsightGraphCard
      } ${props.isGraphExpand ? "" : classes.graphCardHeight}`}
      id="margin-discount-graph"
    >
      {STMarginAndDiscounteGraphTabs && (
        <PlanGraphTabViewComponent
          groupedDrops={STMarginAndDiscounteGraphTabs}
          onChangeTab={handleTabChange}
          removeSorting={true}
          selectedTab={props.selectedTab}
        />
      )}
      {props.selectedTab === "Sell through and margin analysis" && (
        <HindsightSTMarginGraphComponent
          planCode={props.hindsightPlanDetails?.hindsight_plan_code}
          hindsightFilterSelection={props.hindsightFilterSelection}
          selectedGraphValue={props.selectedGraphValue}
          stGraphFilters={props.stGraphFilters}
          setStGraphFilters={props.setStGraphFilters}
          generateSTMarginGraphData={(payload) =>
            props.generateSTMarginGraphData(payload)
          }
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          handleExport={handleExport}
          btnVisible={props.btnVisible}
        />
      )}
      {props.selectedTab === "Discount margin and sold quantity analysis" && (
        <HindsightSTDiscountGraphComponent
          planCode={props.hindsightPlanDetails?.hindsight_plan_code}
          hindsightFilterSelection={props.hindsightFilterSelection}
          selectedGraphValue={props.selectedGraphValue}
          DiscountGraphFilters={props.DiscountGraphFilters}
          setDiscountGraphFilters={props.setDiscountGraphFilters}
          generateSTDiscountGraphData={(payload) =>
            generateSTDiscountGraphData(payload)
          }
          handleGraphExpand={props.handleGraphExpand}
          graphLevelClass={`${props.graphLevelClass}`}
          isGraphExpand={props.isGraphExpand}
          showGraph={props.showGraph}
          handleExport={handleExport}
          handleChartRef={handleChartRef}
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
    levelsJson: state.assortsmartReducer.planDashboardReducer.levelsJson,
    stMarginData: HindsightServiceActions.setHindsightSTMarginGraphSelector(
      state
    ),
    stGraphLoader: HindsightServiceActions.setSTMarginLoaderSelector(state),
    treemapFiltersData: HindsightServiceActions.setHindsightTreemapFiltersSelector(
      state
    ),
    hindsightPlanDetails: HindsightServiceActions.getHindsightPlanDetailsSelector(
      state
    ),
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration,
    STDiscountGraphData: HindsightServiceActions.setHindsightSTDiscountGraphSelector(
      state
    ),
  };
};

const mapActionsToProps = {
  addSnack,
  getHindsightSTDiscountGraphData,
  setHindsightSTDiscountGraphData,
  setSTDiscountGraphLoader,
  setSTMarginGraphLoader,
  getHindsightGraphDownload,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(HindsightSTMarginDiscountComponent);
