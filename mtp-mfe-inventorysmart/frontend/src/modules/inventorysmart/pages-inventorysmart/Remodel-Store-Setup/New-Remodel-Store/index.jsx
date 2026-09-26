import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom-v5-compat";
import { Container, Typography } from "@mui/material";
import { Stepper,Breadcrumbs } from "impact-ui-v3";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import NotFound from "core/commonComponents/notFound/NotFound";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { addSnack } from "core/actions/snackbarActions";

import {
  REMODEL_STORE_STEPPER,
  INVENTORY_SUBMODULES_NAMES,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import RemodelStoreAttributesComponent from "./Remodel-Store-Attributes";
import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import RemodelStoreManageDemandComponent from "./Remodel-Store-Manage-Demand";
import { clearRemodelStoreDashboard } from "../../../services-inventorysmart/Remodel-Store/remodel-store-dashboard";
import { clearRemodelStoreAttributesDetails } from "../../../services-inventorysmart/Remodel-Store/remodel-store-attributes";
import { CONFIGURATION } from "../../../constants-inventorysmart/routesConstants";

const NewRemodelStoreComponent = (props) => {
  const [steps, setSteps] = useState(REMODEL_STORE_STEPPER);
  const [activeStep, setActiveStep] = useState(0);
  const [renderScreen, setRenderScreen] = useState(false);
  const [screenNameNavigatedFrom, setScreenNameNavigatedFrom] = useState("");

  const location = useLocation();

  const globalClasses = globalStyles();
  const moduleVal = location?.props?.module
    ? location?.props?.module
    : "inventorysmart_configuration";

  /**
   * @function
   * @desc Update stepper on every activeIndex change
   * @param {Number} activeIndex
   */
  const updateSteps = (activeIndex) => {
    setSteps((prevSteps) => {
      return prevSteps.map((step, index) => {
        if (activeIndex > index) {
          return {
            ...step,
            isCompleted: true,
          };
        } else return prevSteps[index];
      });
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    return () => {
      props.clearRemodelStoreAttributesDetails();
      props.clearRemodelStoreDashboard();
    };
  }, []);

  useEffect(() => {
    updateSteps(activeStep);
  }, [activeStep]);

  useEffect(() => {
    if (!isEmpty(props.inventorysmartModulesPermission)) {
      setRenderScreen(true);
    }
  }, [props.inventorysmartModulesPermission]);

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          const moduleName = moduleVal;
          const subModules = ["New Remodel Store"];
          let rolesBasedModulesPermission = {};

          if (props.inventorysmartScreenConfig?.roleBasedAccess) {
            let accessDataResponse = await getModuleLevelAccessUtility({
              app: APP_NAME,
              module: subModules,
            })();
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (e) {
          handleErrorMessage(e);
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
    }
  }, [props.inventorysmartScreenConfig]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  // Step 2
  const goToManageDemandScreen = () => {
    setActiveStep((old) => old + 1);
  };

  // Step 1
  const goBackToStoreDetails = () => {
    setActiveStep((old) => old - 1);
    setScreenNameNavigatedFrom("manage-demand"); // step 2 name
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <RemodelStoreAttributesComponent
            {...props}
            displaySnackMessages={displaySnackMessages}
            goToManageDemandScreen={goToManageDemandScreen}
            screenNameNavigatedFrom={screenNameNavigatedFrom}
            handleErrorMessage={handleErrorMessage}
          />
        );
      case 1:
        return (
          <RemodelStoreManageDemandComponent
            {...props}
            goBackToStoreDetails={goBackToStoreDetails}
            storeCodeKeyName={"store_code"}
            handleErrorMessage={handleErrorMessage}
            displaySnackMessages={displaySnackMessages}
            screenName={props.screenName}
          />
        );
    }
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };
  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Configurations",
      to: CONFIGURATION,
    },
    {
      label: "Add New Remodel Store",
      to: "#",
    },
  ];

  return (
    <div>
      {renderScreen &&
      !canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_REMODEL_STORE_SETUP,
        "create"
      ) ? (
        <NotFound />
      ) : (
        <>
          <div className={globalClasses.tableWrapper}>
            <Breadcrumbs list={paths} />
          </div>
          <div className={globalClasses.marginAround}>
            <Container sx={{ display: "flex", justifyContent: "center" }}>
              <Stepper steps={steps} activeStep={activeStep} orientation="horizontal"/>
            </Container>
          </div>
          <div>{getStepContent()}</div>
        </>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setInventorySmartModulesPermissions: (data) =>
      dispatch(setInventorySmartModulesPermissions(data)),
    setInventorySmartPermissionLoader: (data) =>
      dispatch(setInventorySmartPermissionLoader(data)),
    addSnack: (data) => dispatch(addSnack(data)),
    clearRemodelStoreDashboard: () => dispatch(clearRemodelStoreDashboard()),
    clearRemodelStoreAttributesDetails: () =>
      dispatch(clearRemodelStoreAttributesDetails()),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewRemodelStoreComponent);
