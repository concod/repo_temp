import { useEffect, useState } from "react";
import { Stepper } from "impact-ui-v3";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useNavigate } from "react-router-dom-v5-compat";
import { Container } from "@mui/material";

const STEP_LABELS = [
  "Allocation plan input",
  "Review store and DC",
  "Recommendation",
];

const CreateAllocationStepper = ({ activeStep = 0 }) => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState(
    STEP_LABELS.map((label) => ({
      label,
      isEditable: true,
      isCompleted: false,
    }))
  );

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
    if (activeStep !== selectedIndex) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set("step", selectedIndex);
      navigate(`${CREATE_ALLOCATION}?${searchParams.toString()}`);
    }
  };

  return (
    <Container
      maxWidth={false}
      sx={{ display: "flex", justifyContent: "center" ,width:'70%'}}
    >
      <Stepper
        steps={steps}
        activeStep={activeStep}
        setActiveIndex={traverseToStep}
      />
    </Container>
  );
};

export default CreateAllocationStepper;
