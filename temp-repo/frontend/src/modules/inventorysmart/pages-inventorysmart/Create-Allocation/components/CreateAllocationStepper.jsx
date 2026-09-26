import { useEffect, useState } from "react";
import { Stepper } from "impact-ui";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useHistory } from "react-router-dom";
import { Container } from "@mui/material";

const steps = ["Allocation Plan Input", "Recommendation"];

const CreateAllocationStepper = ({ activeStep = 0 }) => {
  const history = useHistory();
  const [steps, setSteps] = useState([
    {
      label: "Allocation Plan Input",
      isEditable: true,
      isCompleted: false,
    },
    {
      label: "Recommendation",
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
        } else return {
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
      history.push(`${CREATE_ALLOCATION}?step=${selectedIndex}`);
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

export default CreateAllocationStepper;
