import PropTypes from "prop-types";
import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import * as apis from "./apis/savePlan.api";
import { Prompt } from "impact-ui";
import { getSubHeading } from "./savePlan.util";

const SaveAsWpModal = (props) => {
  const {
    saveConfirmationModal,
    setSaveConfirmationModal,
    planCode,
    navigate,
    planStatus,
    savePlanApiReq
  } = props;

  return (
    <Prompt
      isOpen={saveConfirmationModal}
      title="Warning"
      subHeading={getSubHeading(planStatus)}
      variant="warning"
      primaryButtonProps={{
        children: "Yes",
        onClick: () => {
          savePlanApiReq(planCode, planStatus, navigate);
          setSaveConfirmationModal(false);
        }
      }}
      tertiaryButtonProps={{
        children: "No",
        onClick: () => {
          setSaveConfirmationModal(false);
        }
      }}
    />
  );
};

SaveAsWpModal.propTypes = {
  savePlanApiReq: PropTypes.func,
  planCode: PropTypes.number,
  saveConfirmationModal: PropTypes.bool,
  setSaveConfirmationModal: PropTypes.func,
  navigate: PropTypes.any,
  planStatus: PropTypes.number
};

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators({ ...apis }, dispatch)
  };
};

export default connect(null, mapDispatchToProps)(SaveAsWpModal);
