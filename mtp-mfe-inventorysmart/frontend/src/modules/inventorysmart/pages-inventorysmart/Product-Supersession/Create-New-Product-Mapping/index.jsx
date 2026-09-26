import React, { useEffect, useState, useMemo } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { PRODUCT_SUPERSESSION_MAPPING } from "../../../constants-inventorysmart/stringConstants";
import { CONFIGURATION, CREATE_NEW_PRODUCT_MAPPING } from "../../../constants-inventorysmart/routesConstants";
import CreateMapping from "./components/CreateMapping";
import ReviewSKULevelMapping from "./components/ReviewSKULevelMapping";
import { resetCreateProductMappingStore } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import { Stepper } from "impact-ui-v3";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";

const CreateNewProductMapping = (props) => {
  const globalClasses = globalStyles();
  const history = useHistory();

  const [activeStep, setActiveStep] = useState(0);
  const [screenNameNavigatedFrom, setScreenNameNavigatedFrom] = useState("");

  const routeOptions = useMemo(() => {
    const options = [
      {
        label: "Home",
        to: "/home",
      },
      {
        label: "Product Supersession",
        id: "product_supersession",
        action: () => {
          history.push({
            pathname: CONFIGURATION,
            state: CREATE_NEW_PRODUCT_MAPPING,
          });
        },
      },
    ];

    if (activeStep === 0) {
      options.push({
        label: "Create New Mapping",
        id: "create_new_mapping",
        action: () => null,
      });
    } else {
      options.push({
        label: "Create New Mapping",
        id: "create_new_mapping",
        action: () => {
          setActiveStep(0);
        },
      });
      options.push({
        label: "Review SKU Level Mapping",
        id: "review_sku_level_mapping",
        action: () => null,
      });
    }

    return options;
  }, [activeStep, history]);

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
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            reviewSKULevelMapping={reviewSKULevelMapping}
            history={history}
            displaySnackMessages={displaySnackMessages}
            screenNameNavigatedFrom={screenNameNavigatedFrom}
            handleErrorMessage={props.handleErrorMessage}
            breadcrumbOptions={routeOptions}
          />
        );
      case 1:
        return (
          <ReviewSKULevelMapping
            {...props}
            history={history}
            displaySnackMessages={displaySnackMessages}
            goBackToStep1={goBackToStep1}
            handleErrorMessage={props.handleErrorMessage}
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
    <div className={globalClasses.paddingAround}>
      {activeStep === 1 && (
        <>
          <HeaderBreadCrumbs options={routeOptions} />
          <div className={`${globalClasses.flexRow} ${globalClasses.layoutAlignCenter} ${globalClasses.marginAuto} ${globalClasses.marginTop}`}
              style={{ width: "70%" }}>
              <Stepper
                activeStep={activeStep}
                orientation="horizontal"
                steps={PRODUCT_SUPERSESSION_MAPPING.map((label) => ({
                  label: label,
                }))}
                onClick={(index) => {
                  if (index < activeStep) setActiveStep(index);
                }}
              />
          </div>
        </>
      )}
      {getStepContent()}
    </div>
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
