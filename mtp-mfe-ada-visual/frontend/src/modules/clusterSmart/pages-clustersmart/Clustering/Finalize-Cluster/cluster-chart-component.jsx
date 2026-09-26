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
      />
      <PerformanceClusterChartComponent
        fetchPerformanceBucketId={props.fetchPerformanceBucketId}
        fromPlanBudgetScreen={props.fromPlanBudgetScreen}
        channelSelected={props.channelSelected}
        setPerformanceBucketId={props.setPerformanceBucketId}
        performanceBucketId={props.performanceBucketId}
        attributeSelection={props.attributeSelection}
      />
    </div>
  );
};

export default withRouter(ClusterChartComponent);
