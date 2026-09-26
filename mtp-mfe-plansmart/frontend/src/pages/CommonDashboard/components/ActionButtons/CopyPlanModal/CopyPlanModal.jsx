import PropTypes from "prop-types";
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import * as apis from "./copyPlan.api";

import TypographyWrapper from "components/material/TypographyWrapper";
import InputField from "components/Impact/InputField";
import Modal from "components/Impact/Modal";
import { copyPlan } from "./copyPlanModal.util";
import { CircularProgress } from "@mui/material";
import { COPY_PLAN_MODAL } from "./copyPlan.constant";

import "./CopyPlanModal.scss";

const CopyPlanModal = (props) => {
  const {
    setShowCopyPlanModal,
    planCode,
    actionButtonLoader,
    requestCopyPlan
  } = props;

  const [planName, setPlanName] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onPlanName = (event) => {
    const planName = event.target.value;
    setPlanName(planName);
  };

  const isSubmitDisabled = useMemo(() => {
    return planName.trim() === "";
  }, [planName]);

  return (
    <Modal
      data-testid="copy-plan-modal"
      size="small"
      heading="Copy Plan"
      isOpen={true}
      onClose={() => setShowCopyPlanModal(false)}
      primaryButtonProps={{
        children: "Save",
        disabled: isSubmitDisabled || actionButtonLoader,
        onClick: () => {
          copyPlan({
            planName,
            planCode,
            requestCopyPlan,
            navigate,
            dispatch,
            setShowCopyPlanModal
          });
        },
        icon: actionButtonLoader ? () => <CircularProgress size="1rem" /> : null
      }}
      tertiaryButtonProps={{
        children: "Cancel",
        disabled: actionButtonLoader,
        onClick: () => setShowCopyPlanModal(false)
      }}
    >
      <TypographyWrapper
        variant="h4"
        component="h4"
        content={COPY_PLAN_MODAL.CONTENT}
      />
      <div className="inputField">
        <InputField
          label={COPY_PLAN_MODAL.LABEL}
          placeholder={COPY_PLAN_MODAL.PLACE_HOLDER}
          onChange={onPlanName}
          inputValue={planName}
          maxLength={120}
        />
      </div>
    </Modal>
  );
};

CopyPlanModal.propTypes = {
  planCode: PropTypes.number,
  requestCopyPlan: PropTypes.any,
  setShowCopyPlanModal: PropTypes.func,
  actionButtonLoader: PropTypes.bool
};

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators({ ...apis }, dispatch)
  };
};

export default connect(null, mapDispatchToProps)(CopyPlanModal);
