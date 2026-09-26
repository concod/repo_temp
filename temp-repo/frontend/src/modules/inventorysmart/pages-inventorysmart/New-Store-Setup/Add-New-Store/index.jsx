import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import { Typography } from "@mui/material";
import { Stepper } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { addSnack } from "core/actions/snackbarActions";
import { Container } from "@mui/material";
import {
  NEW_STORE_STEPPER,
  INVENTORY_SUBMODULES_NAMES,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
} from "../../../constants-inventorysmart/stringConstants";
import StoreDetailsComponent from "./components/StoreDetails";
import SisterStoreMappingComponent from "./components/SisterStoreMapping";
import DemandConstraints from "./components/DemandConstraints";
import NotFound from "core/commonComponents/notFound/NotFound";

import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import {
  getModuleLevelAccess,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { isEmpty } from "lodash";

const AddNewStore = (props) => {
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [screenNameNavigatedFrom, setScreenNameNavigatedFrom] = useState("");
  const [renderScreen, setRenderScreen] = useState(false);

  const moduleVal = props.history.location?.props?.module
    ? props.history.location?.props?.module
    : "inventorysmart_configuration";

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
    setActiveStep((old) => old + 1);
  };

  const goToDemandConstraints = () => {
    setActiveStep((old) => old + 1);
  };

  const goBackToStep2 = () => {
    setActiveStep((old) => old - 1);
    setScreenNameNavigatedFrom("demand-constraints"); // step 3 name
  };

  const goBackToStep1 = () => {
    setActiveStep((old) => old - 1);
    setScreenNameNavigatedFrom("sister-store-mapping"); // step 2 name
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <StoreDetailsComponent
            {...props}
            mapSisterStores={mapSisterStores}
            history={history}
            displaySnackMessages={displaySnackMessages}
            screenNameNavigatedFrom={screenNameNavigatedFrom}
          />
        );
      case 1:
        return (
          <SisterStoreMappingComponent
            {...props}
            history={history}
            goToDemandConstraints={goToDemandConstraints}
            displaySnackMessages={displaySnackMessages}
            goBackToStep1={goBackToStep1}
            screenNameNavigatedFrom={screenNameNavigatedFrom}
          />
        );
      case 2:
        return (
          <DemandConstraints
            {...props}
            history={history}
            displaySnackMessages={displaySnackMessages}
            goBackToStep2={goBackToStep2}
          />
        );
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
          const subModules = ["New Store"];
          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig?.roleBasedAccess) {
            await Promise.all(
              subModules.map(async (module) => {
                const accessDataResponse = await props?.getModuleLevelAccess({
                  app: APP_NAME,
                  module,
                });
                rolesBasedModulesPermission[module] = Object.keys(
                  accessDataResponse.data.data
                );
              })
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
        } catch (error) {
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
    }
  }, [props.inventorysmartScreenConfig]);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };

  return (
    <>
      {renderScreen &&
      !canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
        "create"
      ) ? (
        <NotFound />
      ) : (
        <>
          <HeaderBreadCrumbs options={homeIcon}></HeaderBreadCrumbs>
          <Container maxWidth={false}>
            <div className={globalClasses.marginAround}>
              <Typography
                variant="h4"
                className={globalClasses.paddingHorizontal}
              >
                Add New Stores
              </Typography>
              <Stepper steps={steps} activeIndex={activeStep} />
            </div>
            <div className={globalClasses.marginAround}>{getStepContent()}</div>
          </Container>
        </>
      )}
    </>
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
    addSnack: (snack) => dispatch(addSnack(snack)),
    getModuleLevelAccess: (payload) => dispatch(getModuleLevelAccess(payload)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddNewStore);
