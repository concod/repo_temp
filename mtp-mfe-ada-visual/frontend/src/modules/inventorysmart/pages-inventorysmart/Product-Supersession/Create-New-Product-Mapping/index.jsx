import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import { Typography, Stepper, Step, StepButton } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { addSnack } from "core/actions/snackbarActions";

import { PRODUCT_SUPERSESSION_MAPPING } from "../../../constants-inventorysmart/stringConstants";
import CreateMapping from "./components/CreateMapping";
import ReviewSKULevelMapping from "./components/ReviewSKULevelMapping";
import { resetCreateProductMappingStore } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";

const CreateNewProductMapping = (props) => {
  const globalClasses = globalStyles();
  const history = useHistory();

  const [activeStep, setActiveStep] = useState(0);
  const [screenNameNavigatedFrom, setScreenNameNavigatedFrom] = useState("");

  const routeOptions = [
    {
      label: "Product Supersession/Create New Mapping",
      id: 1,
    },
  ];

  const reviewSKULevelMapping = () => {
    setActiveStep((old) => old + 1);
  };

  const goBackToStep1 = () => {
    setActiveStep((old) => old - 1);
    setScreenNameNavigatedFrom("review-sku-level-mapping"); // step 2 name
  };

  useEffect(() => {
    return () => {
      props.resetCreateProductMappingStore();
    };
  }, []);

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <CreateMapping
            {...props}
            reviewSKULevelMapping={reviewSKULevelMapping}
            history={history}
            displaySnackMessages={displaySnackMessages}
            screenNameNavigatedFrom={screenNameNavigatedFrom}
          />
        );
      case 1:
        return (
          <ReviewSKULevelMapping
            {...props}
            history={history}
            displaySnackMessages={displaySnackMessages}
            goBackToStep1={goBackToStep1}
          />
        );
      default:
        return;
    }
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  return (
    <>
      <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>
      <div className={globalClasses.marginAround}>
        <Typography variant="h4" className={globalClasses.paddingHorizontal}>
          Create New Mapping
        </Typography>

        <Stepper activeStep={activeStep} className={globalClasses.centerAlign}>
          {PRODUCT_SUPERSESSION_MAPPING.map((label, index) => (
            <Step key={label}>
              <StepButton
                onClick={() => {
                  if (index < activeStep) return;
                  else setActiveStep(index);
                }}
              >
                {label}
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </div>
      <div className={globalClasses.marginAround}>{getStepContent()}</div>
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    resetCreateProductMappingStore: (payload) =>
      dispatch(resetCreateProductMappingStore(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(null, mapDispatchToProps)(CreateNewProductMapping);
