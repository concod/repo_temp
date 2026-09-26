import React, { useEffect, useState } from "react";
import { Stepper } from "impact-ui-v3";
import { Container } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import ExitWarningPrompt from "modules/oms/pages-oms/OffCycle Order/OffCycleOrder-Deep-Dive/ExitWarningPrompt";

/**
 * Stepper component for Off-Cycle Order creation
 * @param {number} activeStep - Current active step index
 * @param {function} setActiveStep - Function to update active step
 */
const OffCycleOrderStepper = ({ activeStep = 0, setActiveStep }) => {
  const globalClasses = globalStyles();

  const [showWarningPrompt, setShowWarningPrompt] = useState(false);
  const [requestedStep, setRequestedStep] = useState(null);

  const [steps, setSteps] = useState([
    {
      label: "Ordering Constraints",
      isEditable: true,
      isCompleted: false,
    },
    {
      label: "Recommended Order",
      isEditable: false,
      isCompleted: false,
    },
  ]);

  useEffect(() => {
    updateSteps();
  }, [activeStep]);

  /**
   * @function
   * @desc Update stepper on every activeIndex change
   */
  const updateSteps = () => {
    setSteps((prevSteps) => {
      return prevSteps.map((step, index) => {
        if (activeStep > index) {
          return {
            ...step,
            isCompleted: true,
            isEditable: true,
          };
        } else if (activeStep === index) {
          return {
            ...step,
            isCompleted: false,
            isEditable: true,
          };
        } else {
          return {
            ...step,
            isCompleted: false,
            isEditable: false,
          };
        }
      });
    });
  };

  /**
   * @function
   * @desc Handle route navigation on click of stepper button
   * @param {Number} selectedIndex
   */
  const traverseToStep = (selectedIndex) => {
    if (selectedIndex < activeStep) {
      setShowWarningPrompt(true);
      setRequestedStep(selectedIndex);
    } else {
      // Allow navigation to any editable step (both forward and backward)
      if (steps[selectedIndex]?.isEditable) {
        setActiveStep(selectedIndex);
      }
    }
  };

  const handleConfirmExit = () => {
    setShowWarningPrompt(false);
    setActiveStep(requestedStep);
  };

  const handleCancelExit = () => {
    setShowWarningPrompt(false);
  };

  return (
    <Container
      maxWidth={false}
      className={globalClasses.centerAlign}
      sx={{
        width: "50%",
        marginTop: "1rem",
        marginBottom: "1rem",
      }}
    >
      <Stepper
        orientation="horizontal"
        steps={steps}
        activeStep={activeStep}
        handleStep={traverseToStep}
      />

      <ExitWarningPrompt
        showWarningPrompt={showWarningPrompt}
        handleConfirmExit={handleConfirmExit}
        handleCancelExit={handleCancelExit}
      />
    </Container>
  );
};

export default OffCycleOrderStepper;
