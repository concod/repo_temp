import React from "react";
import { withRouter } from "react-router-dom";
import makeStyles from "@mui/styles/makeStyles";
import AttributeGradeChartComponent from "./attribute-grade-chart-component";
import PerformanceClusterChartComponent from "./performance-cluster-chart-component";

const useStyles = makeStyles((theme) => ({
  chartComponent: {
    display: "flex",
    flexWrap: "wrap",
    gap: "2rem",
  },
}));
const ClusterChartComponent = (props) => {
  const classes = useStyles();

  return (
    <div className={classes.chartComponent}>
      <AttributeGradeChartComponent
        isPlanInfoFetched = {props.isPlanInfoFetched}
        fetchAttributeBucketId={props.fetchAttributeBucketId}
        fetchActiveProductAttributeValue={
          props.fetchActiveProductAttributeValue
        }
        fromPlanBudgetScreen={props.fromPlanBudgetScreen}
        channelSelected={props.channelSelected}
        setAttributeBucketId={props.setAttributeBucketId}
        attributeBucketId={props.attributeBucketId}
        type={props.type}
        attributeSelection={props.attributeSelection}
        attributeJson={props.attributeJson}
        setAttributeJson={props.setAttributeJson}
        selectedClusterTab={props.selectedClusterTab}
      />
      <PerformanceClusterChartComponent
        isPlanInfoFetched = {props.isPlanInfoFetched}
        fetchPerformanceBucketId={props.fetchPerformanceBucketId}
        fromPlanBudgetScreen={props.fromPlanBudgetScreen}
        channelSelected={props.channelSelected}
        setPerformanceBucketId={props.setPerformanceBucketId}
        performanceBucketId={props.performanceBucketId}
        attributeSelection={props.attributeSelection}
        selectedClusterTab={props.selectedClusterTab}
      />
    </div>
  );
};

export default withRouter(ClusterChartComponent);
