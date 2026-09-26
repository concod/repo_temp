import React, { useEffect, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import SelectRclLevel from "./select-rcl-hierarchy-level";
import SelectRclProductLevel from "./select-products-rcl-level";
import SetRclConstraint from "./set-rcl-constraints";
import { useExceptionStyles } from "../../Exceptions-stores/exceptionStyles";
import {
  ADD_RCL_TABS_DATA,
  APP_NAME,
  CREATE_RULES_AUTOSELECT_PARENT_HIERARCHY,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  ROLES_ACCESS_MODULES_MAPPING,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  EDIT_RULES,
  CONSTRAINTS,
  CONFIGURATION,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { isEmpty, isUndefined, cloneDeep, isNull } from "lodash";
import { Container, Typography } from "@mui/material";
import { connect } from "react-redux";
import {
  clearRclTabData,
  saveRcl,
  saveSetAllDataForRCL,
  setActiveRclStep,
  setRulesTableLoader,
  setRclSelectedLevel,
  saveEditedRCL,
  setProductsLevelDataForBackFlow,
  setCreateRulesConfigs,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { validateConstraintFields } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { Divider } from "@mui/material";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { Button, Stepper, useTranslation } from "impact-ui-v3";
import { useLocation } from "react-router";
import Loader from "core/Utils/Loader/loader";
import { saveDcStoreData } from "modules/inventorysmart/services-inventorysmart/DC-Store-Policy/dc-store-strategy";

//OMS Related Imports
import { setVendorConstraintsPackOrderIds } from "modules/oms/services-oms/Constraints/constraints-services";
import { getVendorConstraintsStylePackIdMapping } from "modules/oms/services-oms/Constraints/constraints-services";
import {
  extractPackValues,
  onOMSGridFieldsValidation,
  shouldShowOrderMultiplePacksForRcl,
  stripOrderMultiplePacksFromRclEdits,
  trackVendorConstraints,
} from "modules/oms/pages-oms/Constraints/VendorConstraints/utils";
import { INVALID_SETALL_VALUES_FOR_VENDOR_CONSTRAINTS } from "modules/oms/constants-oms/stringConstants";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setConstraintsConfigs } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import ConfigureContent from "../../DC-Store-Policy/DC-To-Store-Strategy/configure-page/ConfigureContent";
import moment from "moment";

export const handleErrorMessage = (e, props) => {
  const errObj = e?.response?.data;
  if (errObj?.show_message)
    displaySnackMessages(errObj?.message, "error", props);
  else displaySnackMessages(ERROR_MESSAGE, "error", props);
};

const AddRclConstraints = (props) => {
  const { t } = useTranslation();
  const isConstraintsFlow =
    sessionStorage.getItem("isConstraintsFlow") === "true";
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";

  const classes = useExceptionStyles();
  const globalClasses = globalStyles();
  const customClasses = useStyles();
  let location = useLocation();
  const [showConfigure, setShowConfigure] = useState(false)
  const [ruleCode, setRuleCode] = useState(null)
  const [ruleTableData,setRuleTableData] = useState([]);
  const [isSetAll,setIsSetAll] = useState(false)

  const paths = [
    {
      label: t("inventorysmart.rclHomeLabel"),
      to: "/home",
    },
    {
      label: isConstraintsFlow
        ? t("inventorysmart.rclConstraintsLabel")
        : t("inventorysmart.rclConfigurationLabel"),
      to: isConstraintsFlow ? CONSTRAINTS : CONFIGURATION,
    },
    {
      label: t("inventorysmart.rclAddRuleButton"),
      to: "#",
    },
  ];

  //OMS Module
  const [isOmsPackOrderDataFetching, setIsOmsPackOrderDataFetching] = useState(
    false
  );
  const RULES_CONSTRAINTS_ROW_ID =
    props?.omsScreenConfig?.unique_key || "rule_code";
  const SETALL_FORMDATA_FIELDS =
    props?.omsScreenConfig?.setall_formdata_fields || [];

  useEffect(() => {
    fetchCreateRulesConfigs();
    fetchConstraintConfigs();
    return () => {
      props?.clearRclTabData();
    };
  }, []);

  useEffect(() => {
    fetchModulesAccess();
  }, [props.inventorysmartScreenConfig]);

  const fetchCreateRulesConfigs = async () => {
    try {
      let reqBody = {
        module_name: "create_rules_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setCreateRulesConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const fetchConstraintConfigs = async () => {
    try {
      let reqBody = {
        module_name: "inventorysmart_constraints_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setConstraintsConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  const fetchModulesAccess = async () => {
    try {
      const module = props.module;
      const subModules = ROLES_ACCESS_MODULES_MAPPING[module];
      let rolesBasedModulesPermission = {};
      props.setInventorySmartPermissionLoader(true);
      if (props.inventorysmartScreenConfig?.roleBasedAccess) {
        const accessDataResponse = await getModuleLevelAccessUtility({
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
          rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
        });
      }
      props.setInventorySmartModulesPermissions({
        [module]: rolesBasedModulesPermission,
      });
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      props.setInventorySmartPermissionLoader(false);
    }
  };

  //When a user selects a hierarchy at a lower level, the hierarchy of higher level should be automatically selected
  const autoSelectParentHierarchy = () => {
    try {
      if (props.selectedRclLevel?.length && props.hierarchyList?.length) {
        let lowestHierarchySelected = "";
        let lowestHierarchyIndex = -1;
        props.selectedRclLevel?.forEach((selectedLevel) => {
          const selectedLevelIndex = props.hierarchyList.findIndex(
            (hierarchy) => hierarchy.column_name === selectedLevel
          );
          if (selectedLevelIndex > lowestHierarchyIndex) {
            lowestHierarchyIndex = selectedLevelIndex;
            lowestHierarchySelected = selectedLevel;
          }
        });

        if (lowestHierarchyIndex !== -1) {
          const updatedHierarchy = props?.hierarchyList
            .slice(0, lowestHierarchyIndex + 1)
            .map((item) => item.column_name);
          if (updatedHierarchy) {
            if (props.selectedRclLevel.length !== updatedHierarchy.length) {
              props.setRclSelectedLevel(updatedHierarchy);
              displaySnackMessages(
                CREATE_RULES_AUTOSELECT_PARENT_HIERARCHY,
                "info",
                props
              );
            }
          }
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error", props);
        }
      }
    } catch (error) {
      handleErrorMessage(error, props);
    }
  };

  const navigateTabs = async (currentStep, goToNext, visitPrev) => {
    let saveSuccefull = [];
    const isPOStrategyFlow =
      JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;
    const isDCNetworkFlow = Boolean(location.state?.redirectedFromNetworkTab);

    if (currentStep === ADD_RCL_TABS_DATA?.length - 1 && goToNext) {
      // call the save api if last tab
      if (props?.savedEditedRcls?.length > 0) {
        let constraintsToSave = [];

        if (isOMSConstraintsFlow) {
          trackVendorConstraints({ action: "save_rule", operation: "click" });
          const showOrderMultiplePacks = shouldShowOrderMultiplePacksForRcl({
            selectedRclLevel: props.selectedRclLevel,
            selectedRclProductLevel: props.selectedRclProductLevel,
            omsScreenConfig: props.omsScreenConfig,
            hierarchyList: props.hierarchyList,
          });
          const editsForSave = stripOrderMultiplePacksFromRclEdits(
            props?.savedEditedRcls,
            showOrderMultiplePacks
          );
          const excludedAccessors = showOrderMultiplePacks
            ? []
            : ["order_multiple_packs"];
          const { isInputFieldValid, rulesUpdated } = onOMSGridFieldsValidation(
            editsForSave,
            RULES_CONSTRAINTS_ROW_ID,
            tableConfigurationMetaData,
            SETALL_FORMDATA_FIELDS,
            excludedAccessors
          );
          if (!isInputFieldValid) {
            displaySnackMessages(
              INVALID_SETALL_VALUES_FOR_VENDOR_CONSTRAINTS,
              "error",
              props
            );
            return;
          }
          constraintsToSave = [...rulesUpdated];
        } else {
          const constraintValidationChecks = validateConstraintFields(
            cloneDeep(props.savedEditedRcls)
          );
          if (constraintValidationChecks?.inValidDate?.length > 0) {
            displaySnackMessages(
              t("inventorysmart.rclInvalidDateInRules", {
                fields: constraintValidationChecks.inValidDate.join(", "),
              }),
              "error",
              props
            );
            return;
          }
          if (constraintValidationChecks?.nullValues?.length > 0) {
            displaySnackMessages(
              t("inventorysmart.rclNullValuesFound", {
                fields: constraintValidationChecks.nullValues.join(", "),
              }),
              "error",
              props
            );
            return;
          }
          constraintsToSave = [...props.savedEditedRcls];
        }

        let resultOfApi = constraintsToSave?.map(async (editedRos) => {
          //OMS - Pack Ordering Handling MultiSelect Submenu
          const constraintRows = editedRos?.constraint?.[0];
          constraintRows?.forEach((row) => {
            if (row?.attribute_name === "pack_selection") {
              let packSelectionValue = extractPackValues(row?.attribute_value);
              if (Array.isArray(packSelectionValue)) {
                if (packSelectionValue.length) {
                  packSelectionValue = JSON.stringify(packSelectionValue);
                }
              }
              row.attribute_value = packSelectionValue;
            }
          });

          props?.setRulesCreateLoader(true);
          try {
            let response = await saveSetAllDataForRCL(
              editedRos,
              false,
              isOMSConstraintsFlow,
              isPOStrategyFlow
            );
            if (response?.data?.show_message) {
              displaySnackMessages(response?.data?.message, "success", props);
            }
            if (response?.data?.data) saveSuccefull.push(true);
          } catch (error) {
            saveSuccefull.push("false");
            handleErrorMessage(error, props);
          }
        });

        Promise.all(resultOfApi)
          .then(async (result) => {
            let payload = {
              table_name: localStorage.getItem("rclCreatedTableName"),
              filters: [...props?.selectedRclProductLevel],
            };
            if (props.enable_validation_on_save) {
              payload = {
                ...payload,
                validation_enabled: true,
              };
            }
            let savedResponse = await saveRcl(
              payload,
              isConstraintsFlow,
              isOMSConstraintsFlow,
              isDCNetworkFlow,
              isPOStrategyFlow
            );

            // Track save success
            if (isOMSConstraintsFlow) {
              trackVendorConstraints({
                action: "save_rule",
                operation: "success",
              });
            }

            displaySnackMessages(
              savedResponse?.data?.message,
              "success",
              props
            );
            setTimeout(() => {
              props?.history?.push({
                pathname: EDIT_RULES,
                state: {
                  redirectedFromNetworkTab: location.state
                    ?.redirectedFromNetworkTab
                    ? location.state?.redirectedFromNetworkTab
                    : false,
                },
              });
            }, 1000);
            props.saveEditedRCL([]);
            props?.setRulesCreateLoader(false);
          })
          .catch((error) => {
            // Track save error
            if (isOMSConstraintsFlow) {
              trackVendorConstraints({
                action: "save_rule",
                operation: "error",
              });
            }
            handleErrorMessage(error, props);
            props?.setRulesCreateLoader(false);
          });
      } else {
        props?.setRulesCreateLoader(true);
        try {
          let payload = {
            table_name: localStorage.getItem("rclCreatedTableName"),
            filters: [...props?.selectedRclProductLevel],
          };
          if (props.enable_validation_on_save) {
            payload = {
              ...payload,
              validation_enabled: true,
            };
          }
          let savedResponse = await saveRcl(
            payload,
            isConstraintsFlow,
            isOMSConstraintsFlow,
            isDCNetworkFlow,
            isPOStrategyFlow
          );

          // Track save success
          if (isOMSConstraintsFlow) {
            trackVendorConstraints({
              action: "save_rule",
              operation: "success",
            });
          }

          displaySnackMessages(savedResponse?.data?.message, "success", props);
          props?.history?.push({
            pathname: EDIT_RULES,
            state: {
              redirectedFromNetworkTab: location.state?.redirectedFromNetworkTab
                ? location.state?.redirectedFromNetworkTab
                : false,
            },
          });
          props?.setRulesCreateLoader(false);
        } catch (error) {
          // Track save error
          if (isOMSConstraintsFlow) {
            trackVendorConstraints({ action: "save_rule", operation: "error" });
          }
          handleErrorMessage(error, props);
          props?.setRulesCreateLoader(false);
        }
      }
    } else if (
      visitPrev &&
      (visitPrev === ADD_RCL_TABS_DATA?.length || currentStep === 0)
    ) {
      props?.history?.push({
        pathname: EDIT_RULES,
        state: {
          redirectedFromNetworkTab: location.state?.redirectedFromNetworkTab
            ? location.state?.redirectedFromNetworkTab
            : false,
        },
      });
    } else if (goToNext && currentStep === 1) {
      //OMS Constraints Pack Ordering
      if (isOMSConstraintsFlow && props?.isPackOrderingEnabled) {
        setIsOmsPackOrderDataFetching(true);
        let response = await props.getVendorConstraintsStylePackIdMapping({
          filters: [...props?.selectedRclProductLevel],
        });
        let stylePackIdMapping = cloneDeep(response?.data?.data);
        props?.setVendorConstraintsPackOrderIds(stylePackIdMapping);
        setIsOmsPackOrderDataFetching(false);
      }

      props.setProductsLevelDataForBackFlow({
        filterConfig: cloneDeep(props.selectedRclProductLevel),
      });
      props?.setActiveRclStep(currentStep + 1);
    } else if (goToNext) {
      if (isOMSConstraintsFlow) {
        autoSelectParentHierarchy();
      }
      props?.setActiveRclStep(currentStep + 1);
    } else if (visitPrev) {
      setRuleTableData([])
      localStorage.removeItem("rclCreatedTableName");
      props?.setActiveRclStep(currentStep - 1);
    }
  };

  const renderStepsData = (activeStep) => {
    switch (activeStep) {
      case 0:
        return (
          <SelectRclLevel
            screenName={props?.screenName}
            history={props?.history}
            location={location}
            setActiveSteps={(data) => props?.setActiveRclStep(data)}
          />
        );
      case 1:
        return (
          <SelectRclProductLevel
            screenName={props?.screenName}
            history={props?.history}
            location={location}
            setActiveSteps={(data) => props?.setActiveRclStep(data)}
          />
        );
      case 2:
        return (
          <SetRclConstraint
            screenName={props?.screenName}
            history={props?.history}
            setActiveSteps={(data) => props?.setActiveRclStep(data)}
            module={props?.module}
            location={location}
            setShowConfigure={setShowConfigure}
            setRuleCode={setRuleCode}
            ruleTableData={ruleTableData}
            setRuleTableData={setRuleTableData}
            setIsSetAll={setIsSetAll}
          />
        );
      default:
        break;
    }
  };

  const labels = cloneDeep(ADD_RCL_TABS_DATA);
  if (!isConstraintsFlow) {
    labels[2].label = dynamicLabelsBasedOnTenant("set_strategy", "core");
  }

  function isNextButtonDisabled() {
    if (props.createRulesTableLoader) {
      return true;
    }

    if (props?.rclActiveStep === 0) {
      const selectedRclCount = props?.selectedRclLevel?.length ?? 0;
      const minRequired = isOMSConstraintsFlow ? 1 : 2;
      return selectedRclCount < minRequired;
    }

    if (props?.rclActiveStep === 1) {
      return !(
        props?.selectedRclProductLevel &&
        props?.selectedRclLevel &&
        props.selectedRclProductLevel.length &&
        props.selectedRclLevel.length &&
        props.allFiltersSelectedRclProduct
      );
    }

    return false;
  }

  const getStepperSteps = () => {
    return labels.map((tab) => {
      return {
        label: tab?.label,
        description: tab?.description || "",
      };
    });
  };
  return (
    <div className={globalClasses.paddingAroundNew}>
      <div
        className={`${globalClasses.breadcrumbPadding} ${globalClasses.marginBottom_12}`}
      >
        <HeaderBreadCrumbs options={paths}></HeaderBreadCrumbs>
      </div>
      <div className={`${globalClasses.marginTop}`}>
        <Container
          maxWidth={false}
          sx={{
            display: "flex",
            justifyContent: "center",
            margin: "0 auto",
            width: "70%",
            marginBottom: "1rem",
          }}
        >
          {!showConfigure && (
          <Stepper
            activeStep={props?.rclActiveStep}
            steps={getStepperSteps()}
            orientation="horizontal"
          />
          )}
        </Container>
        <Loader loader={isOmsPackOrderDataFetching}>
         {!showConfigure ?  renderStepsData(props?.rclActiveStep) : <ConfigureContent
         setShowConfigure={setShowConfigure}
         ruleCode={ruleCode}
         setRuleTableData ={setRuleTableData}
         setIsSetAll={setIsSetAll}
         isSetAll = {isSetAll}
         setRulesCreateLoader = {props?.setRulesCreateLoader}
         isManageRclFlow={true}
         />}
        </Loader>
      </div>
      {ADD_RCL_TABS_DATA.map((newItem) => {
        if (newItem?.activeState === props?.rclActiveStep) {
          // Custom button labels for step 0 (Select Levels)
          const isStep0 = props?.rclActiveStep === 0;
          const isStep1 = props?.rclActiveStep === 1;

          let secondaryLabel = newItem?.secondaryButtonLabel;
          let primaryLabel = newItem?.primaryButtonLabel;
          let secondaryVariant = "secondary";

          const isStep2 = props?.rclActiveStep === 2;

          if (isStep0) {
            secondaryLabel = t("inventorysmart.rclBackToManageRules");
            primaryLabel = t("inventorysmart.rclGoToSelectProducts");
            secondaryVariant = "tertiary";
          } else if (isStep1) {
            secondaryLabel = t("inventorysmart.rclBackToSelectLevel");
            // For step 1, determine primary label based on flow
            if (isOMSConstraintsFlow) {
              primaryLabel = t("inventorysmart.rclGoToConstraints");
            } else if (!isConstraintsFlow) {
              primaryLabel = t("inventorysmart.rclGoToSelectStrategy");
            } else {
              primaryLabel = t("inventorysmart.rclGoToSetConstraints"); // Constraints flow
            }
            secondaryVariant = "tertiary";
          } else if (isStep2) {
            secondaryLabel = t("inventorysmart.rclBackToSelectProducts");
            secondaryVariant = "tertiary";
            // For step 2, determine primary label based on flow
            primaryLabel = t("inventorysmart.rclSaveRule");
          }

          const isAddHierarchiesDirectToStep1 =
            Boolean(props?.selectedRclForAddHierarchies?.rcl_code) &&
            isStep1 &&
            !isOMSConstraintsFlow;

          return (
            <div
              className={`${customClasses.bottomButtonsContainer} ${globalClasses.flexAlignBetweenCenter}`}
            >
              {isAddHierarchiesDirectToStep1 ? (
                <Button
                  className={customClasses.button}
                  rule_code="set-all-exception"
                  variant="tertiary"
                  onClick={() =>
                    props?.history?.push({
                      pathname: EDIT_RULES,
                      state: {
                        redirectedFromNetworkTab: location.state
                          ?.redirectedFromNetworkTab
                          ? location.state?.redirectedFromNetworkTab
                          : false,
                      },
                    })
                  }
                >
                  {t("inventorysmart.rclBackToManageRules")}
                </Button>
              ) : (
                <Button
                  className={customClasses.button}
                  rule_code="set-all-exception"
                  variant={secondaryVariant}
                  onClick={() =>
                    navigateTabs(props?.rclActiveStep, false, true)
                  }
                >
                  {secondaryLabel}
                </Button>
              )}
              <Button
                className={customClasses.button}
                rule_code="set-all-exception"
                variant="primary"
                onClick={() => navigateTabs(props?.rclActiveStep, true)}
                disabled={isNextButtonDisabled()}
              >
                {primaryLabel}
              </Button>
            </div>
          );
        }
      })}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    selectedRclLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclLevel,
    selectedRclProductLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    setRclConstraints:
      inventorysmartReducer?.rulesConstraintsReducer?.setRclConstraints,
    savedEditedRcls:
      inventorysmartReducer?.rulesConstraintsReducer?.savedEditedRcls,
    rclConstraintsTableData:
      inventorysmartReducer?.rulesConstraintsReducer?.rclConstraintsTableData,
    rclActiveStep:
      inventorysmartReducer?.rulesConstraintsReducer?.rclActiveStep,
    allFiltersSelectedRclProduct:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.allFiltersSelectedRclProduct,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    selectedRclForAddHierarchies:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.selectedRclForAddHierarchies,
    createRulesTableLoader:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesTableLoader,
    hierarchyList:
      inventorysmartReducer?.rulesConstraintsReducer?.hierarchyList,
    omsScreenConfig:
      store.omsReducer?.orderingCommonService.orderingScreensConfig?.constraints
        ?.vendor_constraints,
    isPackOrderingEnabled:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig
        ?.pack_ordering,
    enable_validation_on_save:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs
        ?.enable_validation_on_save,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    clearRclTabData: (body) => dispatch(clearRclTabData(body)),
    setRulesCreateLoader: (payload) => dispatch(setRulesTableLoader(payload)),
    setActiveRclStep: (payload) => dispatch(setActiveRclStep(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setRclSelectedLevel: (payload) => dispatch(setRclSelectedLevel(payload)),
    saveEditedRCL: (payload) => dispatch(saveEditedRCL(payload)),
    setProductsLevelDataForBackFlow: (payload) =>
      dispatch(setProductsLevelDataForBackFlow(payload)),
    setVendorConstraintsPackOrderIds: (payload) =>
      dispatch(setVendorConstraintsPackOrderIds(payload)),
    getVendorConstraintsStylePackIdMapping: (payload) =>
      dispatch(getVendorConstraintsStylePackIdMapping(payload)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setCreateRulesConfigs: (payload) =>
      dispatch(setCreateRulesConfigs(payload)),
    setConstraintsConfigs: (payload) =>
      dispatch(setConstraintsConfigs(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddRclConstraints);
