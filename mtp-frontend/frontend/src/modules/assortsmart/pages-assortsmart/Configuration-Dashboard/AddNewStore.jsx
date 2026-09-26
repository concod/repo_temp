import React, { useEffect, useState, useRef } from "react";
import { connect, useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { Typography } from "@mui/material";
import { Stepper } from "impact-ui";
import globalStyles from "Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { addSnack } from "actions/snackbarActions";
import { Container } from "@mui/material";

import { NEW_STORE_STEPPER } from "../../constants-assortsmart/stringContants";
import StoreDetails from "./StoreDetails";
import SisterStoreMapping from "./SisterStoreMapping";
import NotFound from "core/commonComponents/notFound/NotFound";
import { isEmpty } from "lodash";

const AddNewStore = () => {
  const dispatch = useDispatch();
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [newStoreDetailsFormValues, setNewStoreDetailsFormValues] = useState(
    {}
  );
  const [storeOpeningDate, setStoreOpeningDate] = useState({});

  const globalClasses = globalStyles();
  const homeIcon = [
    {
      label: "Configurations/Add New Store",
      id: 1,
    },
  ];
  const history = useHistory();

  /**
   * @desc Update stepper on load
   */
  useEffect(() => {
    setSteps([...NEW_STORE_STEPPER]);
  }, []);

  useEffect(() => {
    updateSteps();
  }, [activeStep]);

  /**
   * @function
   * @desc Update stepper on every activeIndex change
   * @param {Number} activeIndex
   */
  const updateSteps = (activeIndex) => {
    setSteps((prevSteps) => {
      return prevSteps.map((p, index) => {
        if (activeIndex > index) {
          return {
            ...p,
            isCompleted: true,
          };
        } else return prevSteps[index];
      });
    });
  };

  const mapSisterStores = () => {
    // console.log("inside mapsisterstore", old);
    setActiveStep((old) => old + 1);
  };

  const goToDemandConstraints = () => {
    setActiveStep((old) => old + 1);
  };

  const goBackToStep1 = () => {
    setActiveStep((old) => old - 1);
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <StoreDetails
            mapSisterStores={mapSisterStores}
            displaySnackMessages={displaySnackMessages}
            newStoreDetailsFormValues={newStoreDetailsFormValues}
            setNewStoreDetailsFormValues={setNewStoreDetailsFormValues}
            storeOpeningDate={storeOpeningDate}
            setStoreOpeningDate={setStoreOpeningDate}
          />
        );
      case 1:
        return (
          <SisterStoreMapping
            newStoreDetailsFormValues={newStoreDetailsFormValues}
            storeOpeningDate={storeOpeningDate}
            goBackToStep1={goBackToStep1}
          />
        );
    }
  };
  const displaySnackMessages = (message, variance, onClose) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
          ...(onClose && { onClose: onClose }),
        },
      })
    );
  };
  return (
    <>
      <HeaderBreadCrumbs options={homeIcon}></HeaderBreadCrumbs>
      <Container maxWidth={false}>
        <div className={globalClasses.marginAround}>
          <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            Add New Stores
          </Typography>
          <Stepper steps={steps} activeIndex={activeStep} />
        </div>
        <div className={globalClasses.marginAround}>{getStepContent()}</div>
      </Container>
    </>
  );
};

export default AddNewStore;
