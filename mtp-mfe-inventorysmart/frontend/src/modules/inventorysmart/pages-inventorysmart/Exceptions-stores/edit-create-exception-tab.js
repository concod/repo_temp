import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import ProductListForException from "./exception-product-listing-table";
import StoreListForException from "./exception-store-listing-table";
import SetConstraints from "./set-constraint-for-exception";
import { connect } from "react-redux";
import { Container } from "@mui/material";
import { useExceptionStyles } from "./exceptionStyles";
import { isEmpty, isUndefined, cloneDeep, isNull } from "lodash";
import { EXCEPTION_SCREEN, CONSTRAINTS ,CREATE_NEW_RULE} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { saveCreateNewRuleFlowSession } from "../Constraints/create-new-rule-flow/createNewRuleFlowSession";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  APP_NAME,
  ERROR_MESSAGE,
  EXCEPTION_RCL_LABEL_MAP,
  EXCEPTION_TABS_DETAIL,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  ROLES_ACCESS_MODULES_MAPPING,
  SUCCESS_MESSAGE,
  UPDATED_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  clearExceptionTabState,
  saveConstraintsData,
  saveSetAllDataConstraints,
  setExceptionTableLoader,
  setSelectedExceptionConstraintsList,
  setSelectedProductList,
  setSelectedStoreList,
  setProductListBackFlowData,
  setStoreListBackFlowData,
  setExceptionConfigs,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import {
  displaySnackMessages,
  isActionAllowedOnSubModule,
} from "../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { getPSMItineraryConfig } from "core/actions/tenantConfigActions";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import moment from "moment";
import { validateConstraintFields } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { handleErrorMessage } from "../Constraints/Rules-Constraints/add-rcl-component";
import { setConstraintsConfigs } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { Stepper, Button, Tooltip, Alert } from "impact-ui-v3";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  setFilterConfiguration,
  setShowFilters,
  setIsFilterApplied,
} from "core/actions/filterAction";
import CheckmarkIcon from "assets/IS_icons/checkmark.svg";

const EditCreateExceptionTabComponent = (props) => {
  const { t } = useTranslation();
  const classes = useExceptionStyles();
  const customClasses = useStyles();
  const globalClasses = globalStyles();
  const [activeStep, setActiveSteps] = useState(0);
  const [isDataSaved, setIsDataSaved] = useState(false);
  const [productFilterDependency, setProductFilterDependency] = useState([]);
  const productFilterHandlerRef = React.useRef(null);
  const [storeFilterDependency, setStoreFilterDependency] = useState([]);
  const storeFilterHandlerRef = React.useRef(null);
  const [psmItineraryConfig, setPsmItineraryConfig] = useState({});
  const [showStoreStepAlert, setShowStoreStepAlert] = useState(true);

  const filtersFromCreateRclFlow = React.useMemo(() => {
    try {
      const sessionData = JSON.parse(sessionStorage.getItem("inventorysmart_create_new_rule_flow") || "{}");
      return sessionData?.filters || [];
    } catch {
      return [];
    }
  }, []);
  const isRedirectionFromCreateRclEnabled = props.exceptionConfigs?.isRedirectionFromCreateRclEnabled && !isEmpty(filtersFromCreateRclFlow);

  const constraintsExceptionRedirection = React.useMemo(() => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem("inventorysmart_constraints_exception_filters") ||
          "{}"
      );
      return {
        filters: stored?.filters || [],
        // Which landing tab the user came from: "all_rules" | "rule_groups".
        source: stored?.source || "all_rules",
        rule_list: stored?.rule_list || [],
        table_name: stored?.table_name ?? null,
      };
    } catch {
      return { filters: [], source: "all_rules" };
    }
  }, []);
  const filtersFromConstraintsFlow = constraintsExceptionRedirection.filters;
  const redirectionSource = constraintsExceptionRedirection.source;
  const isRedirectionFromConstraints = !isEmpty(filtersFromConstraintsFlow);
  // Create-new-rule / landing redirect is the new layout even if Redux
  // showNewConstraintFlow is still false (refresh or skip Constraints landing).
  const isNewExceptionLayout =
    props.showNewConstraintFlow ||
    isRedirectionFromCreateRclEnabled ||
    isRedirectionFromConstraints;

  // Store filters locked by an upstream flow (create RCL / constraints) = the store step's
  // first-time pre-selection; [] for a plain exception flow.
  const getFlowStoreFilters = () => {
    if (isRedirectionFromCreateRclEnabled) {
      return filtersFromCreateRclFlow.filter(
        (item) => item.dimension === "store"
      );
    }
    if (isRedirectionFromConstraints) {
      return filtersFromConstraintsFlow.filter(
        (item) => item.dimension === "store"
      );
    }
    return [];
  };

  useEffect(() => {
    fetchConstraintConfigs();
    fetchExceptionConfigs();
    getPSMItineraryConfig().then(config => {
      setPsmItineraryConfig(config || {});
    }).catch(error => {
      console.error('Error fetching PSM Itinerary Config:', error);
    });
    return () => {
      props?.clearExceptionTabState();
      props.setFilterConfiguration({
        addExceptionStoreFilterConfig: { filterConfig: [] },
      });
    };
  }, []);

  useEffect(() => {
    if (isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints) {
      setStoreFilterDependency(getFlowStoreFilters());
    }
  }, []);

  useEffect(() => {
    fetchModulesAccess();
  }, [props.inventorysmartScreenConfig]);

  const hasStoreFilters = !isEmpty(
    props?.filtersOfExceptionStoreList?.filters
  );

  // Review Products leaves global showFilters / isFilterApplied on. Only show
  // the store strip when this step has store filters (table is loaded).
  useEffect(() => {
    if (!isNewExceptionLayout || activeStep !== 1) return;
    props.setShowFilters(hasStoreFilters);
    props.setIsFilterApplied(hasStoreFilters);
  }, [activeStep, hasStoreFilters]);

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

  const fetchExceptionConfigs = async () => {
    try {
      let reqBody = {
        module_name: "exception_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setExceptionConfigs(response);
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

  const renderStepsData = (activeStep) => {
    switch (activeStep) {
      case 0:
        return (
          <ProductListForException
            screenName={props?.screenName}
            history={props?.history}
            setActiveSteps={(data) => setActiveSteps(data)}
            renderFiltersInParent={true}
            onFilterDependencyChange={(dependency) => setProductFilterDependency(dependency)}
            onFilterHandlerReady={(handler) => {
              productFilterHandlerRef.current = handler;
            }}
            isRedirectionFromCreateRclEnabled={isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints}
            rclFilterSelections={isRedirectionFromConstraints ? filtersFromConstraintsFlow : filtersFromCreateRclFlow}
            ruleGroupRuleList={constraintsExceptionRedirection.rule_list}
            ruleGroupTableName={constraintsExceptionRedirection.table_name}
          />
        );
      case 1:
        return (
          <StoreListForException
            screenName={props?.screenName}
            history={props?.history}
            setActiveSteps={(data) => setActiveSteps(data)}
            productFilterDependency={props?.filtersOfExceptionProdStores}
            renderFiltersInParent={true}
            onFilterDependencyChange={(dependency) => setStoreFilterDependency(dependency)}
            onFilterHandlerReady={(handler) => {
              storeFilterHandlerRef.current = handler;
            }}
            isRedirectionFromCreateRclEnabled={isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints}
            rclFilterSelections={isRedirectionFromConstraints ? filtersFromConstraintsFlow : filtersFromCreateRclFlow}
          />
        );
      case 2:
        return (
          <SetConstraints
            screenName={props?.screenName}
            history={props?.history}
            isDataSaved={isDataSaved}
            setActiveSteps={(data) => setActiveSteps(data)}
            table_name={props?.tempExceptionsTableName}
            productFilterDependency={props?.filtersOfExceptionProdStores}
            module={props?.module}
            enableEdit={enableEdit()}
            isRedirectionFromCreateRclEnabled={isRedirectionFromCreateRclEnabled}
          />
        );
      default:
        break;
    }
  };

  const navigateTabs = async (currentStep, goToNext, visitPrev) => {
    let saveSuccessfull = [];
    if (currentStep === EXCEPTION_TABS_DETAIL?.length - 1 && goToNext) {
      // call the save api if last tab
      if (props?.savedEditedConstraints?.length > 0) {
        const constraintValidationChecks = validateConstraintFields(
          cloneDeep(props.savedEditedConstraints)
        );
        if (constraintValidationChecks?.inValidDate?.length > 0) {
          displaySnackMessages(
            `Invalid Date found in ${constraintValidationChecks.inValidDate}`,
            "error",
            props
          );
          return;
        }
        if (constraintValidationChecks?.nullValues?.length > 0) {
          displaySnackMessages(
            `Null values found in ${constraintValidationChecks.nullValues}`,
            "error",
            props
          );
          return;
        }
        props?.setExceptionTableLoader(true);
        let resultOfApi = props?.savedEditedConstraints?.map(
          async (editedRos) => {
            try {
              let response = await saveSetAllDataConstraints(editedRos);
              if (response?.data?.data) saveSuccessfull.push(true);
              return response;
            } catch (error) {
              saveSuccessfull.push("false");
              handleErrorMessage(error, props);
              return error;
            }
          }
        );
        Promise.all(resultOfApi)
          .then(async (result) => {
            setIsDataSaved(true);
            let savedResponse = await saveConstraintsData(
              localStorage.getItem("exceptionTableName")
            );
            displaySnackMessages(
              savedResponse?.data?.message,
              "success",
              props
            );
            props?.setExceptionTableLoader(false);
            props?.setSelectedProductList([]);
            props?.setSelectedStoreList([]);
            props?.setSelectedExceptionConstraintsList([]);
            if (isRedirectionFromCreateRclEnabled) {
              sessionStorage.removeItem("inventorysmart_create_new_rule_flow");
              props.history.push({
                pathname: CONSTRAINTS,
                state: { preselectedTab:"all_rules" },
              });
            } else if (isRedirectionFromConstraints) {
              sessionStorage.removeItem("inventorysmart_constraints_exception_filters");
              props.history.push({
                pathname: CONSTRAINTS,
                state: { preselectedTab: redirectionSource },
              });
            }
          })
          .catch((error) => {
            handleErrorMessage(error, props);
            setIsDataSaved(false);
            props?.setExceptionTableLoader(false);
          });
      } else {
        props?.setExceptionTableLoader(true);
        try {
          setIsDataSaved(true);
          let savedResponse = await saveConstraintsData(
            localStorage.getItem("exceptionTableName")
          );

          props?.setSelectedProductList([]);
          props?.setSelectedStoreList([]);
          props?.setSelectedExceptionConstraintsList([]);
          displaySnackMessages(savedResponse?.data?.message, "success", props);
          props?.setExceptionTableLoader(false);
          if (isRedirectionFromCreateRclEnabled) {
            sessionStorage.removeItem("inventorysmart_create_new_rule_flow");
            props.history.push({
              pathname: CONSTRAINTS,
              state: { preselectedTab: "all_rules" },
            });
          } else if (isRedirectionFromConstraints) {
            sessionStorage.removeItem("inventorysmart_constraints_exception_filters");
            props.history.push({
              pathname: CONSTRAINTS,
              state: { preselectedTab: redirectionSource },
            });
          }
        } catch (error) {
          handleErrorMessage(error, props);
          setIsDataSaved(false);
          props?.setExceptionTableLoader(false);
        }
      }
    } else if (
      visitPrev &&
      (visitPrev === EXCEPTION_TABS_DETAIL?.length || currentStep === 0)
    ) {
      if (isRedirectionFromCreateRclEnabled) {
        saveCreateNewRuleFlowSession({ activeStep: 1 });
        props.history.push(CREATE_NEW_RULE);
      } else if (isRedirectionFromConstraints) {
        sessionStorage.removeItem("inventorysmart_constraints_exception_filters");
        props.history.push({
          pathname: CONSTRAINTS,
          state: { preselectedTab: redirectionSource },
        });
      } else {
        props.history.push(EXCEPTION_SCREEN);
      }
      props?.setSelectedProductList([]);
      props?.setSelectedStoreList([]);
      props?.setSelectedExceptionConstraintsList([]);
    } else if (goToNext) {
      if (currentStep === 0) {
        props.setProductListBackFlowData({
          ...props.productListBackFlowData,
          selectedProductList: props.selectedProductList,
        });
        if (!isRedirectionFromCreateRclEnabled && !isRedirectionFromConstraints) {
          props.setExceptionTableLoader(true);
        }
      } else if (currentStep === 1) {
        props.setStoreListBackFlowData({
          ...props.storeListBackFlowData,
          selectedStoreList: props.selectedStoreList,
        });
        props.setExceptionTableLoader(true);
      }
      setActiveSteps(currentStep + 1);
    } else if (visitPrev) {
      // Product step mount clears the applied store filters, so leaving the store step backwards must
      // drop its buffered selection and pre-selection too (spread keeps other back-flow keys):
      // re-entry then starts from the empty state instead of re-applying filters with "Next" enabled.
      if (currentStep === 1) {
        props.setStoreListBackFlowData({
          ...props.storeListBackFlowData,
          selectedStoreList: [],
        });
        setStoreFilterDependency(getFlowStoreFilters());
      }
      props.setExceptionTableLoader(true);
      setActiveSteps(currentStep - 1);
    }
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const enableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_EXCEPTION_TAB_COMPONENT,
      "edit"
    );
    return editEnabled;
  };

  const isSelectionEmpty = (selection) => {
    if (isUndefined(selection) || isNull(selection)) {
      return true;
    }
    if (selection?.isSelectAllRecords) {
      return false;
    }
    if (Array.isArray(selection)) {
      return selection.length === 0;
    }
    return isEmpty(selection);
  };

  const getStepperSteps = () => {
    const useItinerary = psmItineraryConfig?.[0]?.attribute_value?.use_itinerary;
    return EXCEPTION_TABS_DETAIL.map((tab) => {
      let label = tab?.label;
      if ((isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints) && EXCEPTION_RCL_LABEL_MAP[label]) {
        label = EXCEPTION_RCL_LABEL_MAP[label];
      }
      if (useItinerary === true && label === "Select Store") {
        label = "Select Ship";
      }
      return { label };
    });
  };

  // Create New Rule: 70% row, 3 equal cards. With Base Rule Saved, 4 equal cards at 85%.
  const renderStepper = (inHeader = false) => {
    const showBaseRuleSaved = isRedirectionFromCreateRclEnabled;
    return (
      <Container
        maxWidth={false}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
          width: showBaseRuleSaved ? "1192px" : "70%",
          maxWidth: "100%",
          marginTop:
            !inHeader &&
            ((activeStep === 0 &&
              (isRedirectionFromCreateRclEnabled ||
                isRedirectionFromConstraints)) ||
              activeStep === 2)
              ? "12px"
              : 0,
          marginBottom: inHeader ? 0 : "24px",
        }}
      >
        <div
          className={showBaseRuleSaved ? classes.equalWidthStepperRow : undefined}
          style={showBaseRuleSaved ? undefined : { width: "100%" }}
        >
          {showBaseRuleSaved && (
            <>
              <div className={classes.baseRuleSavedContainer}>
                <span className={classes.baseRuleSavedCheckIcon}>
                  <CheckmarkIcon />
                </span>
                <span className={classes.baseRuleSavedLabel}>Base Rule Saved</span>
                <span className={classes.baseRuleSavedInfoWrap}>
                  <Tooltip
                    title="Your rules and their configured constraints have been saved."
                    orientation="right"
                    variant="tertiary"
                  >
                    <InfoOutlinedIcon className={classes.baseRuleSavedInfoIcon} />
                  </Tooltip>
                </span>
              </div>
              <div className={classes.baseRuleSavedConnector} aria-hidden />
            </>
          )}
          <div
            className={showBaseRuleSaved ? classes.equalWidthStepper : undefined}
            style={showBaseRuleSaved ? undefined : { width: "100%" }}
          >
            <Stepper
              activeStep={activeStep}
              steps={getStepperSteps()}
              orientation="horizontal"
              handleStep={() => {}}
            />
          </div>
        </div>
      </Container>
    );
  };

  // Stores were locked by an upstream flow (create RCL / constraints); user can only add filters.
  const isStorePreselectedFromFlow = (
    isRedirectionFromConstraints
      ? filtersFromConstraintsFlow
      : filtersFromCreateRclFlow
  ).some((item) => item.dimension === "store");

  const storeFiltersApplied = !isEmpty(
    props?.filtersOfExceptionStoreList?.filters
  );

  const renderStoreStepAlert = () => {
    if (storeFiltersApplied || !showStoreStepAlert) return null;
    return (
      <div className={classes.storeStepAlertAnchor}>
        <div className={classes.storeStepAlertFloat}>
          <Alert
            severity="info"
            title={
              isStorePreselectedFromFlow
                ? t("inventorysmart.storeAlertPreselected")
                : t("inventorysmart.storeAlertNoSelection")
            }
            onClose={() => setShowStoreStepAlert(false)}
          />
        </div>
      </div>
    );
  };

  const breadcrumbOptions = [
    {
      label: t("inventorysmart.home"),
      to: "/home",
    },
    {
      label: t("inventorysmart.constraints"),
      id: 1,
      action: () => {
        sessionStorage.removeItem("inventorysmart_create_new_rule_flow");
        sessionStorage.removeItem(
          "inventorysmart_constraints_exception_filters"
        );
        props.history.push(CONSTRAINTS);
      },
    },
    {
      label: t("inventorysmart.manageExceptions"),
      id: 2,
      action: () => {
        props.history.push(EXCEPTION_SCREEN);
      },
    },
    {
      label: t("inventorysmart.addExceptions"),
      id: 3,
    },
  ].filter(
    (item) =>
      !(
        item.label === t("inventorysmart.manageExceptions") &&
        (isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints)
      )
  );

  return (
    <>
      <div className={`${globalClasses.paddingAroundNew} ${customClasses.marginBottom44}`}>
        {activeStep === 0 && (isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints) && (
          <div className={globalClasses.breadcrumbPadding}>
            <HeaderBreadCrumbs options={breadcrumbOptions} />
          </div>
        )}
        {activeStep === 0 && !isRedirectionFromCreateRclEnabled && !isRedirectionFromConstraints && (
            <CoreComponentScreen
              showChipsOnLoad={true}
              showFilterDashboard={true}
              filterConfigKey={"productExceptionFilterConfig"}
              onApplyFilter={(dependencyData, filterData) => {
                if (productFilterHandlerRef.current) {
                  productFilterHandlerRef.current(dependencyData, filterData);
                }
              }}
              hideNoDataFound={
                isEmpty(props?.filtersOfExceptionProdStores?.filters) ? false : true
              }
              filterDependency={productFilterDependency}
              headerBreadCrumb={<HeaderBreadCrumbs options={breadcrumbOptions} />}
              autoHideFilterButton={true}
            />
        )}
        {activeStep === 1 && isNewExceptionLayout && (
          <div className={globalClasses.breadcrumbPadding}>
            <HeaderBreadCrumbs options={breadcrumbOptions} />
          </div>
        )}
        {activeStep === 1 && (
          <div
            className={
              isNewExceptionLayout
                ? `${classes.storeStepHeader} ${globalClasses.marginTop_12}`
                : undefined
            }
          >
          <CoreComponentScreen
            showChipsOnLoad={true}
            showFilterDashboard={true}
            filterConfigKey={"addExceptionStoreFilterConfig"}
            onApplyFilter={(dependencyData, filterData) => {
              if (storeFilterHandlerRef.current) {
                storeFilterHandlerRef.current(dependencyData, filterData);
              }
            }}
            hideNoDataFound={hasStoreFilters}
            filterDependency={storeFilterDependency}
            showStrip={isNewExceptionLayout && hasStoreFilters}
            // Re-entry mounts the dashboard afresh; lets it keep the already applied filter data
            // (chips + count) instead of discarding it as a first render. Off until filters exist.
            skipFirstRenderCheck={storeFiltersApplied}
            autoApplyEnabled={!storeFiltersApplied}
            // New flow: breadcrumb moves to its own row, so reserve an invisible left slot to keep the stepper centered.
            headerBreadCrumb={
              isNewExceptionLayout ? (
                <div aria-hidden className={classes.stepperHeaderSpacer} />
              ) : (
                <HeaderBreadCrumbs options={breadcrumbOptions} />
              )
            }
            customHeaderComponent={
              isNewExceptionLayout ? () => renderStepper(true) : undefined
            }
            // Fragment keeps this truthy so the core keeps reserving the filter-toggle slot even when the alert is hidden.
            renderAboveFilterDashboard={
              isNewExceptionLayout ? (
                <>{renderStoreStepAlert()}</>
              ) : undefined
            }
            {...(isNewExceptionLayout
              ? {
                  emptyStateHeading: t("inventorysmart.selectStores"),
                  emptyStateDescription: isStorePreselectedFromFlow
                    ? t("inventorysmart.storeEmptyStateDescriptionPreselected")
                    : t("inventorysmart.storeEmptyStateDescription"),
                }
              : {})}
            autoHideFilterButton={true}
            customClassName={
              isNewExceptionLayout
                ? classes.storeStepFilterWrapper
                : undefined
            }
            {...(isRedirectionFromCreateRclEnabled ||
            isRedirectionFromConstraints
              ? {
                  autoApplyEnabled: false,
                  hideSaveFilterSection: true,
                  emptyStateProps: (isRedirectionFromConstraints
                    ? filtersFromConstraintsFlow
                    : filtersFromCreateRclFlow
                  ).some((item) => item.dimension === "store")
                    ? {
                        primaryButtonLabel: t(
                          "inventorysmart.selectMoreFilters"
                        ),
                        secondaryButtonLabel: t(
                          "inventorysmart.goWithPreviousSelection"
                        ),
                        onSecondaryButtonClick: () => {
                          const activeFilters = isRedirectionFromConstraints
                            ? filtersFromConstraintsFlow
                            : filtersFromCreateRclFlow;
                          const storeFilters = activeFilters.filter(
                            (item) => item.dimension === "store"
                          );
                          if (storeFilterHandlerRef.current) {
                            storeFilterHandlerRef.current(storeFilters);
                          }
                        },
                      }
                    : {
                        primaryButtonLabel: t("inventorysmart.selectFilters"),
                      },
                }
              : {})}
          />
          </div>
        )}
        {activeStep === 2 && (
          <div className={globalClasses.breadcrumbPadding}>
            <HeaderBreadCrumbs options={breadcrumbOptions} />
          </div>
        )}
        {((activeStep === 0 && !isEmpty(props?.filtersOfExceptionProdStores?.filters)) ||
          (activeStep === 1 && !isNewExceptionLayout && hasStoreFilters) ||
          activeStep === 2) &&
          renderStepper()}
        <div
          className={
            isNewExceptionLayout && activeStep === 1 && props.showFilters
              ? undefined
              : globalClasses.marginTop_24
          }
        >
          {renderStepsData(activeStep)}
        </div>
      </div>
      {EXCEPTION_TABS_DETAIL.map((newItem) => {
        if (newItem?.activeState === activeStep) {
          return (
            <div
              className={`${customClasses.bottomButtonsContainer} ${globalClasses.flexAlignBetweenCenter}`}
            >
              <Button
                className={customClasses.button}
                rule_code="set-all-exception"
                variant="tertiary"
                size="large"
                onClick={() => navigateTabs(activeStep, false, true)}
                style={{ marginRight: "10px" }}
                disabled={isDataSaved}
              >
                {`< ${(isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints) ? newItem?.secondaryButtonLabelOnRclRedirect : newItem?.secondaryButtonLabel}`}
              </Button>
              <div>
                {newItem?.activeState === 2 && !isRedirectionFromCreateRclEnabled && !isRedirectionFromConstraints && (
                  <Button
                    className={customClasses.marginRight}
                    variant="secondary"
                    size="large"
                    onClick={() => props.history.push(EXCEPTION_SCREEN)}
                  >
                    {`Go to manage exceptions >`}
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => navigateTabs(activeStep, true)}
                  disabled={
                    (activeStep === EXCEPTION_TABS_DETAIL?.length - 1 &&
                      !enableEdit()) ||
                    isSelectionEmpty(props?.[newItem?.reducerKeyToCheck]) ||
                    isDataSaved
                  }
                >
                  {`${(isRedirectionFromCreateRclEnabled || isRedirectionFromConstraints) ? newItem?.primaryButtonLabelOnRclRedirect : newItem?.primaryButtonLabel} ${activeStep === EXCEPTION_TABS_DETAIL?.length - 1 ? "" : ">"}`}
                </Button>
              </div>
            </div>
          );
        }
      })}
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    selectedStoreList:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedStoreList,
    selectedProductList:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedProductList,
    exceptionConstraintTableData:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.exceptionConstraintTableData,
    savedEditedConstraints:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.savedEditedConstraints,
    selectedExceptionConstraintsList:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedExceptionConstraintsList,
    tempExceptionsTableName:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.tempExceptionsTableName,
    filtersOfExceptionProdStores:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.filtersOfExceptionProdStores,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    productListBackFlowData:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.productListBackFlowData,
    productExceptionFilterConfig:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.productExceptionFilterConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "productExceptionFilterConfig"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig: filterReducer.tenantFilterUamConfig,
    addExceptionStoreFilterConfig:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.addExceptionStoreFilterConfig,
    filterDashboardConfigurationStore:
      filterReducer.filterDashboardConfiguration[
        "addExceptionStoreFilterConfig"
      ],
    filtersOfExceptionStoreList:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.filtersOfExceptionStoreList,
    exceptionConfigs:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionConfigs,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
    // Core drives the filter strip visibility via this global flag.
    showFilters: filterReducer?.showFilters,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
    setSelectedProductList: (body) => dispatch(setSelectedProductList(body)),
    setSelectedStoreList: (body) => dispatch(setSelectedStoreList(body)),
    setSelectedExceptionConstraintsList: (body) =>
      dispatch(setSelectedExceptionConstraintsList(body)),
    clearExceptionTabState: (body) => dispatch(clearExceptionTabState(body)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setProductListBackFlowData: (body) =>
      dispatch(setProductListBackFlowData(body)),
    setStoreListBackFlowData: (body) =>
      dispatch(setStoreListBackFlowData(body)),
    setConstraintsConfigs: (payload) =>
      dispatch(setConstraintsConfigs(payload)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setShowFilters: (payload) => dispatch(setShowFilters(payload)),
    setIsFilterApplied: (payload) => dispatch(setIsFilterApplied(payload)),
    setExceptionConfigs: (payload) => dispatch(setExceptionConfigs(payload)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EditCreateExceptionTabComponent);