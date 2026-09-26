import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import makeStyles from "@mui/styles/makeStyles";
import OffCycleOrderStepper from "./OffCycleOrderStepper.jsx";
import OffCycleOrderFirstStep from "./OffCycleOrderFirstStep.jsx";
import OffCycleOrderSecondStep from "./OffCycleOrderSecondStep.jsx";
import {
  setOffCycleOrderActiveStep,
  resetOffCycleOrderState,
  setSelectedArticleDCCombination,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service.js";
import { CREATE_NEW_ORDER } from "modules/oms/constants-oms/routeConstants.js";

/**
 * Main container component for Off-Cycle Order creation flow
 * Manages the stepper and step components
 */
const OffCycleOrderContainer = (props) => {
  const classes = useStyles();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract URL params reactively
  const urlParams = new URLSearchParams(location.search);
  const stepFromUrl = urlParams.get("step");
  const draftIdFromUrl = urlParams.get("draft_id");

  // If step=1 and draft_id exists in URL, start at step 1, otherwise use Redux state
  const initialStep =
    stepFromUrl === "1" && draftIdFromUrl
      ? 1
      : props.offCycleOrderActiveStep || 0;

  const [activeStep, setActiveStep] = useState(initialStep);

  // Update active step when URL changes (e.g., when clicking Test button)
  useEffect(() => {
    if (stepFromUrl === "1" && draftIdFromUrl) {
      setActiveStep(1);
    }
  }, [location.search, stepFromUrl, draftIdFromUrl]);

  useEffect(() => {
    // Initialize with selected article-DC combinations from Create New Order table
    if (props.selectedArticleDCFromParent?.length > 0) {
      props.setSelectedArticleDCCombination(props.selectedArticleDCFromParent);
    }
  }, [props.selectedArticleDCFromParent]);

  useEffect(() => {
    // Sync with Redux state
    props.setOffCycleOrderActiveStep(activeStep);
  }, [activeStep]);

  const handleCancel = () => {
    // Reset state and navigate back to CNO
    props.resetOffCycleOrderState();
    // Check if we have URL params (came from notification)
    if (stepFromUrl || draftIdFromUrl) {
      // Navigate to CNO with clean URL (without draft_id and step params)
      // The URL change will trigger CreateNewOrderForVendorDC to hide OffCycleOrder
      // and reinitialize filters if needed
      navigate(CREATE_NEW_ORDER, { replace: true });
    } else {
      // Came from CNO screen (no URL params) - just call onCancel to hide OffCycleOrder
      props.onCancel();
    }
  };

  const handleProceedToNext = () => {
    if (activeStep < 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleGoToStep1 = () => {
    setActiveStep(0);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <OffCycleOrderFirstStep
            onProceedToNext={handleProceedToNext}
            onCancel={handleCancel}
          />
        );
      case 1:
        return <OffCycleOrderSecondStep onGoToStep1={handleGoToStep1} />;
      default:
        return null;
    }
  };

  return (
    <div className={classes.container}>
      {/* Stepper */}
      <OffCycleOrderStepper
        activeStep={activeStep}
        setActiveStep={setActiveStep}
      />
      {/* Step Content */}
      <div className={classes.content}>{renderStepContent()}</div>
    </div>
  );
};

const useStyles = makeStyles(() => ({
  container: {
    width: "100%",
    minHeight: "calc(100vh - 200px)",
  },
  content: {
    marginTop: "1rem",
    minHeight: "400px",
  },
}));

const mapStateToProps = (store) => {
  return {
    offCycleOrderActiveStep:
      store.inventorysmartReducer.offCycleOrderService
        ?.offCycleOrderActiveStep || 0,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOffCycleOrderActiveStep: (payload) =>
    dispatch(setOffCycleOrderActiveStep(payload)),
  resetOffCycleOrderState: () => dispatch(resetOffCycleOrderState()),
  setSelectedArticleDCCombination: (payload) =>
    dispatch(setSelectedArticleDCCombination(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleOrderContainer);
