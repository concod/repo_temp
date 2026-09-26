import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import { useNavigate } from "react-router-dom-v5-compat";

import { Typography, Stepper, Step, StepButton } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { addSnack } from "core/actions/snackbarActions";

import { PRODUCT_SUPERSESSION_MAPPING,PRODUCT_SUPERSESSION_MAPPING_SIGNET } from "../../../constants-inventorysmart/stringConstants";
import CreateMapping from "./components/CreateMapping";
import ReviewSKULevelMapping from "./components/ReviewSKULevelMapping";
import { resetCreateProductMappingStore } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-create-mapping-service";
import { CONFIGURATION, CREATE_NEW_PRODUCT_MAPPING, EDIT_PRODUCT_MAPPING } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { resetSelectedProductMappingsForEdit } from "modules/inventorysmart/services-inventorysmart/Product-Supersession/product-supersession-service";

const CreateNewProductMapping = (props) => {
  const globalClasses = globalStyles();
  const history = useHistory();
  const navigate = useNavigate();

  const { product: productLabel } = props.dynamicLabels || {};

  const [activeStep, setActiveStep] = useState(0);
  const [screenNameNavigatedFrom, setScreenNameNavigatedFrom] = useState("");

  const isEditFlow = props.path === EDIT_PRODUCT_MAPPING;
  const pageTitle = isEditFlow ? "Edit Mapping" : "Create New Mapping";

  const routeOptions = [
    {
      label: `${productLabel ?? 'Product'} Supersession`,
      id: 1,
      action: () => {
        navigate(CONFIGURATION, { state: CREATE_NEW_PRODUCT_MAPPING });
      },
    },
    {
      label: pageTitle,
      id: 2,
    },
  ];
  const renderStepButtons = () => {
    const labels = props.inventorysmartScreenConfig?.client === "signet"
        ? PRODUCT_SUPERSESSION_MAPPING_SIGNET
        : PRODUCT_SUPERSESSION_MAPPING;
      return labels.map((label, index) => (
        <Step key={label}>
          <StepButton
            onClick={() => {
              if (index >= activeStep) setActiveStep(index);
            }}
          >
            {label}
          </StepButton>
        </Step>
      ));
    };
  useEffect(() => {
    if (
      isEditFlow &&
      (!props.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.supersession?.editMapping ||
        !props.selectedProductMappingsForEdit.length)
    ) {
      navigate(CONFIGURATION);
    }
  }, [isEditFlow, props.selectedProductMappingsForEdit]);

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

      props.resetSelectedProductMappingsForEdit();
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
            isEditFlow={isEditFlow}
          />
        );
      case 1:
        return (
          <ReviewSKULevelMapping
            {...props}
            history={history}
            displaySnackMessages={displaySnackMessages}
            goBackToStep1={goBackToStep1}
            isEditFlow={isEditFlow}
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
          {pageTitle}
        </Typography>
        <Stepper activeStep={activeStep} className={globalClasses.centerAlign}>
        {renderStepButtons()}
        </Stepper>
        
        
      </div>
      <div className={globalClasses.marginAround}>{getStepContent()}</div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedProductMappingsForEdit:
      store.inventorysmartReducer.inventorySmartProductSupersessionService
        .selectedProductMappingsForEdit,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    resetCreateProductMappingStore: (payload) =>
      dispatch(resetCreateProductMappingStore(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    resetSelectedProductMappingsForEdit: () =>
      dispatch(resetSelectedProductMappingsForEdit()),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewProductMapping);
