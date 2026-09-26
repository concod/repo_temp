import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { connect } from "react-redux";
import { Button } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import {
  setPlanDetails,
  getPlanLevels,
} from "../../commonModulesServices/plan-dashboard-service";
import { setGradeResults, setCreateGradeStep } from "../grading-services";
import { getClusterPlanDetails } from "../../commonModulesServices/cluster-plan-service";
import ClusterBreakdownComponent from "./cluster-breakdown-component";

export const ReviewClusters = (props) => {
  const globalClasses = globalStyles();
  const [attributeBucketId, setAttributeBucketId] = useState({});
  const [performanceBucketId, setPerformanceBucketId] = useState({});
  const [selectedProductAttribute, setSelectedProductAttribute] = useState("");
  const [filterSelection, setFilterSelection] = useState({});
  const dispatch = useDispatch();
  const { gradingDetails, createGradeStep } = useSelector(
    (store) => store?.createGradeReducer
  );

  const gotoNextStep = async () => {
    try {
      const body = {
        // hardcoded values to be removed after info api starts working
        cluster_plan_code: gradingDetails.clusterPlanCode,
        bucket_id: performanceBucketId,
        grade_id: gradingDetails.gradeID,
      };
      const savedPlan = await setGradeResults(body);
      if (savedPlan.data.message === "Successful") {
        dispatch(setCreateGradeStep(createGradeStep + 1));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    // to avoid api call with the old plan code
    props.setPlanDetails([]);
    const planCode = gradingDetails.clusterPlanCode;
    const fetchData = async () => {
      //get the plan details
      try {
        let response = await props.getClusterPlanDetails(planCode);
        props.setPlanDetails(response?.data);
      } catch (error) {}
    };
    fetchData();
  }, []);

  const setAttributeBucketIdFn = (id, chan = "") => {
    if (id) {
      let attrBucketId = attributeBucketId;
      let selectedChannel = chan ? chan : props.planDetails?.data?.channel[0];
      attrBucketId[selectedChannel] = parseInt(id);
      setAttributeBucketId(attrBucketId);
    }
  };

  return (
    <>
      <ClusterBreakdownComponent
        performanceClusterBucket={performanceBucketId}
        selectedProductAttribute={selectedProductAttribute}
        channelSelected={filterSelection["channels"]}
      />
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop}`}
      >
        <Button
          color="primary"
          variant="outlined"
          onClick={() => dispatch(setCreateGradeStep(createGradeStep + 1))}
        >
          Back
        </Button>
        <Button color="primary" variant="contained" onClick={gotoNextStep}>
          Next
        </Button>
      </div>
    </>
  );
};

const mapStateToProps = (store) => ({
  planDetails: store.assortsmartReducer.planDashboardReducer.planDetails,
});

const mapDispatchToProps = (dispatch) => ({
  setPlanDetails: (payload) => dispatch(setPlanDetails(payload)),
  getPlanLevels: (payload) => dispatch(getPlanLevels(payload)),
  getClusterPlanDetails: (payload) => dispatch(getClusterPlanDetails(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ReviewClusters);
