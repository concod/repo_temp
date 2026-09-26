import PropTypes from "prop-types";
import React from "react";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import * as apis from "./deletePlan.api";
import { onDeletePlan } from "./deletePlan.util";
import { Prompt } from "impact-ui";
import { CircularProgress } from "@mui/material";
import { DELETE_PLAN_ALERT } from "./deletePlan.constant";

const DeletePlan = (props) => {
  const {
    showDeletePlanDialogue,
    setShowDeletePlanDialogue,
    selectedRows,
    selectedScreenName,
    actionButtonLoader,
    deletePlanApi
  } = props;
  const dispatch = useDispatch();
  return (
    <Prompt
      isOpen={showDeletePlanDialogue}
      title="Delete Plan"
      subHeading={
        selectedRows.length > 1
          ? `${DELETE_PLAN_ALERT} ${selectedRows.length} plans`
          : `${DELETE_PLAN_ALERT} ${selectedRows.length} plan`
      }
      variant="error"
      primaryButtonProps={{
        children: "Yes",
        disabled: actionButtonLoader,
        onClick: () => {
          onDeletePlan({
            selectedRows,
            deletePlanApi,
            dispatch,
            selectedScreenName,
            setShowDeletePlanDialogue
          });
        },
        icon: actionButtonLoader ? () => <CircularProgress size="1rem" /> : null
      }}
      tertiaryButtonProps={{
        children: "No",
        disabled: actionButtonLoader,
        onClick: () => {
          setShowDeletePlanDialogue(false);
        }
      }}
    />
  );
};

DeletePlan.propTypes = {
  deletePlanApi: PropTypes.func,
  selectedRows: PropTypes.shape({
    length: PropTypes.number
  }),
  setShowDeletePlanDialogue: PropTypes.func,
  showDeletePlanDialogue: PropTypes.bool,
  actionButtonLoader: PropTypes.bool
};

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators({ ...apis }, dispatch)
  };
};

export default connect(null, mapDispatchToProps)(DeletePlan);
