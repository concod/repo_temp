import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Breadcrumbs, Stepper } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { Container } from "@mui/material";
import {
  NEW_STORE_STEPPER,
  INVENTORY_SUBMODULES_NAMES,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import StoreDetailsComponent from "./components/StoreDetails";
import NewStoreDetailsComponent from "./components/NewStoreDetails";
import SisterStoreMappingComponent from "./components/SisterStoreMapping";
import NewSisterStoreMappingComponent from "./components/NewSisterStoreMapping";
import NotFound from "core/commonComponents/notFound/NotFound";

import { isActionAllowedOnSubModule } from "../../inventorysmart-utility";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { isEmpty } from "lodash";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { clearEditNewStoreData } from "../../../services-inventorysmart/New-Store/new-store-dashboard";
import { clearNewStoreDetails } from "../../../services-inventorysmart/New-Store/new-store-details";
import { setKeyValueInCache } from "../../../services-inventorysmart/active-module-common-service";
import { CONFIGURATION } from "../../../constants-inventorysmart/routesConstants";
import { getUserName } from "core/Utils/functions/utils";
import { getCurrentUserId } from "core/Utils/functions/utils";

const AddNewStore = (props) => {
  const [steps, setSteps] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [screenNameNavigatedFrom, setScreenNameNavigatedFrom] = useState("");
  const [renderScreen, setRenderScreen] = useState(false);
  const [reservationDateLabel, setReservationDateLabel] = useState(
    "reservation start date"
  );
  const [userName, setUserName] = useState("");
  const [userCode, setUserCode] = useState("");

  const navigate = useNavigate();
  let location = useLocation();

  const moduleVal = location?.props?.module
    ? location?.props?.module
    : "inventorysmart_configuration";

  const globalClasses = globalStyles();
  const homeIcon = [
    {
      label: "Configurations/Add New Store",
      id: 1,
    },
  ];

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
      label: "Add New Store",
      to: "#",
    },
  ];

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  /**
   * @desc Update stepper on load
   */
  useEffect(() => {
    setSteps([...NEW_STORE_STEPPER]);
    let userName = getUserName();
    setUserName(userName);
    (async () => {
      let userCode = await getCurrentUserId();
      setUserCode(userCode);
    })();
    return () => {
      // Clear new store states of edit and stepper payload when user redirects to different module from new store screen
      props.clearEditNewStoreData();
      props.clearNewStoreDetails();
    };
  }, []);

  useEffect(() => {
    if (props.storeOpeningLabels?.length) {
      let label = props.storeOpeningLabels
        .find((item) => item.value === "reservation_date")
        ?.label?.toLowerCase();
      if (label) {
        setReservationDateLabel(label);
      }
    }
  }, [props.storeOpeningLabels]);

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

  const goBackToStep1 = () => {
    setActiveStep((old) => old - 1);
    setScreenNameNavigatedFrom("sister-store-mapping"); // step 2 name
  };

  const getStepContent = () => {
    // Define component mappings based on displayUpdatedNewStoreSetup flag
    const componentMap = props.displayUpdatedNewStoreSetup
      ? {
          0: NewStoreDetailsComponent,
          1: NewSisterStoreMappingComponent,
        }
      : {
          0: StoreDetailsComponent,
          1: SisterStoreMappingComponent,
        };

    // Common props for all components
    const commonProps = {
      ...props,
      displaySnackMessages,
      screenNameNavigatedFrom,
      storeCodeKeyName: "store_code",
      handleErrorMessage: (e) => handleErrorMessage(e),
      reservationDateLabel,
      userName,
      userCode,
    };

    // Step-specific props
    const stepSpecificProps = {
      0: {
        mapSisterStores,
      },
      1: {
        goBackToStep1,
        setKeyValueInCache: props.setKeyValueInCache,
      },
    };

    const Component = componentMap[activeStep];

    if (!Component) {
      return null;
    }

    return <Component {...commonProps} {...stepSpecificProps[activeStep]} />;
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
      // This condition allows a regular user to view the screen who does not have create access but only edit access
      if (props.disableEditStoreDetails) {
        setRenderScreen(false);
      } else {
        setRenderScreen(true);
      }
    }
  }, [props.inventorysmartModulesPermission, props.disableEditStoreDetails]);

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
          <div className={globalClasses.paddingAround}>
            <Breadcrumbs list={paths} />
            {props.displayUpdatedNewStoreSetup ? (
              <>
                <Container
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <Stepper
                    activeStep={activeStep}
                    orientation="horizontal"
                    steps={steps}
                  />
                </Container>
                <div>{getStepContent()}</div>
              </>
            ) : (
              <Container maxWidth={false}>
                <Container
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <Stepper
                    activeStep={activeStep}
                    orientation="horizontal"
                    steps={steps}
                  />
                </Container>
                <div>{getStepContent()}</div>
              </Container>
            )}
          </div>
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
    displayUpdatedNewStoreSetup:
      store.inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.displayUpdatedNewStoreSetup,
    disableEditStoreDetails:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.disableEditStoreDetails,
    storeOpeningLabels:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.storeOpeningLabelConstants,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    clearEditNewStoreData: (body) => dispatch(clearEditNewStoreData(body)),
    clearNewStoreDetails: (body) => dispatch(clearNewStoreDetails(body)),
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddNewStore);
