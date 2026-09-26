import { useEffect, useState } from "react";
import { Stepper } from "impact-ui-v3";
import { ORDER_MANAGEMENT_CREATE_SCENARIO_STORE } from "modules/oms/constants-oms/routeConstants";
import { useNavigate } from "react-router-dom-v5-compat";
import { Container } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";

const CreateScenarioStoreStepper = ({ activeStep = 0, setActiveStep }) => {
  const navigate = useNavigate();
  const globalClasses = globalStyles();

  const [steps, setSteps] = useState([
    {
      label: "Create Scenario",
      isEditable: true,
      isCompleted: false,
    },
    {
      label: "Scenario",
      isEditable: true,
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
          };
        } else
          return {
            ...step,
            isCompleted: false,
          };
      });
    });
  };

  /**
   * @function
   * @desc Handle route navigation on click of stepper button
   * @param {Number} selectedIndex
   */
  const traverseToStep = (selectedIndex) => {
    activeStep !== selectedIndex &&
      selectedIndex !== 1 &&
      navigate(
        `${ORDER_MANAGEMENT_CREATE_SCENARIO_STORE}?step=${selectedIndex}`
      );
    setActiveStep(selectedIndex);
  };

  return (
    <Container
      maxWidth={false}
      className={globalClasses.centerAlign}
      sx={{
        width: "50%",
      }}
    >
      <Stepper
        orientation="horizontal"
        steps={steps}
        activeStep={activeStep}
        handleStep={traverseToStep}
      />
    </Container>
  );
};

export default CreateScenarioStoreStepper;
