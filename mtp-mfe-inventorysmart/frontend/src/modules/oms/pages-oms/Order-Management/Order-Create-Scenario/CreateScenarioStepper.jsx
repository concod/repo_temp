import { useEffect, useState } from "react";
import { Stepper } from "impact-ui-v3";
import { useNavigate } from "react-router-dom-v5-compat";
import { Container } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { ORDER_MANAGEMENT_CREATE_SCENARIO } from "modules/oms/constants-oms/routeConstants";
import { makeStyles } from "@mui/styles";

//const steps = ["Create Scenario", "Scenario"];

const useStyles = makeStyles((theme) => ({
  stepperContainer: {
    width: "75%",
    maxWidth: "75%",

    "& .MuiStepLabel-label.Mui-active": {
      fontWeight: "600 !important",
    },
    "& .ia-styles.ia-stepper.ia-stepper .MuiStep-horizontal": {
      cursor: "default !important",
    },
  },
}));

const CreateScenarioStepper = ({ activeStep = 0, setActiveStep }) => {
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const customClasses = useStyles();

  const [steps, setSteps] = useState([
    {
      label: "Create Scenario",
      isEditable: true,
      isCompleted: false,
    },
    {
      label: "Scenario Results",
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
  // const traverseToStep = (selectedIndex) => {
  //   activeStep !== selectedIndex &&
  //     selectedIndex !== 1 &&
  //     navigate(`${ORDER_MANAGEMENT_CREATE_SCENARIO}?step=${selectedIndex}`);
  //   setActiveStep(selectedIndex);
  // };

  return (
    <Container
      maxWidth={false}
      className={`${globalClasses.centerAlign} ${customClasses.stepperContainer}`}
    >
      <Stepper
        orientation="horizontal"
        steps={steps}
        activeStep={activeStep}
        // handleStep={traverseToStep}
      />
    </Container>
  );
};

export default CreateScenarioStepper;
