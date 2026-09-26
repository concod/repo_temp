import React, { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  setCreateGradeStep,
  setCreateGradeClassification,
} from "../grading-services";
import { useDispatch, useSelector } from "react-redux";
import {
  Container,
  FormControlLabel,
  Link,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { Stepper } from "impact-ui";
import GRADING_STEPS from "../grading-constants/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate } from "react-router-dom-v5-compat";

const CreateGrade = (props) => {
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  const [gradeBy, setGradeBy] = useState("Clustering");
  const [steps, setSteps] = useState([]);
  const dispatch = useDispatch();
  const { createGradeStep } = useSelector((store) => store?.createGradeReducer);
  const routeOptions = [
    {
      id: "store_grading",
      label: "Grading",
      action: () => {
        navigate("/store-grading");
      },
    },
    {
      id: "store_create_grading",
      label: "Create Grading",
      action: () => null,
    },
  ];

  /**
   * @desc Initial setup on Primary Load
   */
  useEffect(() => {
    setStepperState();
    dispatch(setCreateGradeClassification(gradeBy));
  }, []);

  /**
   * @function
   * @description Update Stepper
   */
  useEffect(() => {
    setSteps((prevSteps) => {
      return prevSteps.map((p, index) => {
        if (createGradeStep > index) {
          return {
            ...p,
            isCompleted: true,
          };
        } else return {
          ...p,
          isCompleted: false,
        };
      });
    });
  }, [createGradeStep]);

  /**
   * @desc Set stepper state on change of grade
   */
  useEffect(() => {
    setStepperState();
    dispatch(setCreateGradeClassification(gradeBy));
  }, [gradeBy]);

  /**
   * @func
   * @desc Set the Create Grading Screen Flow based on selected Grading Type
   */
  const setStepperState = () => {
    if (gradeBy === "Clustering") {
      setSteps(GRADING_STEPS.clusterSteps);
    } else {
      setSteps(GRADING_STEPS.percentile);
    }
  };

  return (
    <>
      <HeaderBreadCrumbs options={routeOptions} />
      <Container maxWidth={false}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.marginBottom}`}
        >
          <Typography
            variant="h3"
            component="h3"
            className={`${globalClasses.pageHeader} ${globalClasses.marginBottom}`}
          >
            Grading
          </Typography>
          <Link
            component={RouterLink}
            underline="none"
            to="/store-grading"
            variant="button"
          >
            Return to Store grading
          </Link>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.marginBottom}`}
        >
          {!createGradeStep ? (
            <>
              <Typography variant="h6">Grade By</Typography>
              <RadioGroup
                row
                aria-label="gender"
                name="controlled-radio-buttons-group"
                value={gradeBy}
                onChange={(event) => setGradeBy(event.target.value)}
                className={globalClasses.marginLeft1rem}
              >
                <FormControlLabel
                  value="Clustering"
                  control={<Radio color="primary" id="StoreRadioBtn" />}
                  label="Clustering"
                />
                <FormControlLabel
                  value="Percentile"
                  control={<Radio color="primary" id="StoreGroupRadioBtn" />}
                  label="Percentile"
                />
              </RadioGroup>
            </>
          ) : null}
        </div>
      </Container>
      <Container maxWidth={false} className={globalClasses.marginBottom}>
        <Stepper
          steps={steps}
          activeIndex={createGradeStep}
          setActiveIndex={(index) => {
            if (index !== createGradeStep) {
              dispatch(setCreateGradeStep(index));
            }
          }}
        />
      </Container>
      <Container maxWidth={false}>
        <div className={globalClasses.marginBottom}>
          {steps[createGradeStep]?.screen}
        </div>
      </Container>
    </>
  );
};

export default CreateGrade;
