import { useEffect, useState } from "react";
import { Stepper } from "impact-ui";
import { ORDER_MANAGEMENT_CREATE_SCENARIO } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useHistory } from "react-router-dom";
import { Container } from "@mui/material";

//const steps = ["Create Scenario", "Scenario"];

const CreateScenarioStepper = ({ activeStep = 0, setActiveStep }) => {
  const history = useHistory();
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
  //const [activeIndex, setActiveIndex] = useState(0);

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
   * @desc Hadle route navigation on click of stepper button
   * @param {Number} selectedIndex
   */
  const traverseToStep = (selectedIndex) => {
    activeStep !== selectedIndex &&
      selectedIndex !== 1 &&
      history.push(`${ORDER_MANAGEMENT_CREATE_SCENARIO}?step=${selectedIndex}`);
    setActiveStep(selectedIndex);
  };

  return (
    <Container maxWidth={false}>
      <Stepper
        steps={steps}
        activeIndex={activeStep}
        setActiveIndex={traverseToStep}
      />
    </Container>
  );
};

export default CreateScenarioStepper;
