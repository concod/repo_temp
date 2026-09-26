import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Stepper } from "impact-ui-v3";
import { ADD__EXCEPTION_STEPS } from "../mapping-constants";
import { resetNewExceptionStates } from "../services-product-mapping/productMappingService";
import Container from "@mui/material/Container";
import globalStyles from "core/Styles/globalStyles";
import SelectProducts from "./selectProducts";
import SelectStore from "./selectStore";
import { makeStyles } from "@mui/styles";

const useLocalStyles = makeStyles(() => ({
  stepperContainer: {
    maxWidth: '70%',
    margin: '0 auto',
  },
}));

const AddException = (props) => {
  const [steps, setSteps] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const globalClasses = globalStyles();
  const localClasses = useLocalStyles();
  const dispatch = useDispatch();

  useEffect(() => {
    const initialiseStepper = () => {
      setSteps(ADD__EXCEPTION_STEPS);
    };
    initialiseStepper();
    return () => {
      setSteps([]);
      dispatch(resetNewExceptionStates());
    };
  }, []);

  /**
   * @function
   * @description Handle navigation to next step
   */
  const handleForwardNavigation = () => {
    if (activeIndex === steps.length - 1) {
      props.hideAddFlow();
    } else {
      const newIndex = activeIndex + 1;
      setActiveIndex(newIndex);
    }
  };

  /**
   * @function
   * @description Handle navigation to previous step
   */
  const handleBackwardNavigation = () => {
    if (activeIndex === 0) {
      props.hideAddFlow();
    } else {
      const newIndex = activeIndex - 1;
      setActiveIndex(newIndex);
    }
  };

  const renderCurrentStep = () => {
    return (
      <>
        <div className={`${activeIndex != 0 ? globalClasses.displayNone : ""}`}>
          <SelectProducts
            onNext={handleForwardNavigation}
            onCancel={handleBackwardNavigation}
          />
        </div>
        <div className={`${activeIndex != 1 ? globalClasses.displayNone : ""}`}>
          <SelectStore
            onNext={handleForwardNavigation}
            onCancel={handleBackwardNavigation}
          />
        </div>
      </>
    );
  };

  return (
    <>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${localClasses.stepperContainer}`}
      >
        <Stepper
          steps={steps}
          activeStep={activeIndex}
          handleStep={(index) => setActiveIndex(index)}
          orientation="horizontal"
        />
      </div>
      <div>{renderCurrentStep()}</div>
    </>
  );
};

export default AddException;
