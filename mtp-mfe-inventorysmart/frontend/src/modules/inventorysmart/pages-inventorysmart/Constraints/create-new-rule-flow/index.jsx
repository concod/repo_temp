import React, { useEffect, useLayoutEffect, useState } from "react";
import { cloneDeep } from "lodash";
import { connect } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import { Button, Prompt, Stepper } from "impact-ui-v3";
import { Container } from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import { resetFilterConfiguration } from "core/actions/filterAction";
import {
  CONSTRAINTS,
  EDIT_CREATE_EXCEPTION_SCREEN,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { LANDING_SCREEN_TAB } from "../landing-screen/landingScreenConstants";
import { ADD_RCL_TABS_DATA } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  saveEditedRCL as saveEditedRCLAction,
  setCreateRulesConfigs as setCreateRulesConfigsAction,
  setProductsLevelDataForBackFlow as setProductsLevelDataForBackFlowAction,
  setRclConstraints as setRclConstraintsAction,
  setRclSelectedProductLevel as setRclSelectedProductLevelAction,
  setRulesTableLoader as setRulesTableLoaderAction,
  setInvalidKeys as setInvalidKeysAction,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { setConstraintsConfigs as setConstraintsConfigsAction } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import {
  setInventorySmartModulesPermissions as setInventorySmartModulesPermissionsAction,
  setInventorySmartPermissionLoader as setInventorySmartPermissionLoaderAction,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  CREATE_NEW_RULE_SCREEN_NAME,
  fetchCreateNewRuleModuleAccess,
  fetchCreateNewRuleTenantConfigs,
} from "./fetchCreateNewRuleModuleAccess";
import { SelectProduct } from "./SelectProduct";
import { saveCreateNewRuleConstraints } from "./saveCreateNewRuleConstraints";
import SetConstraints from "./SetConstraints";
import { AddExceptionsStepper } from "./AddExceptionsStepper";
import {
  clearCreateNewRuleFlowSession,
  getCreateNewRuleTableName,
  getInitialCreateNewRuleStep,
  loadCreateNewRuleFlowSession,
  resetCreateNewRuleFlowState,
  saveCreateNewRuleFlowSession,
} from "./createNewRuleFlowSession";

// Phased rollout: "Create new rule" is shown only when tenant config enables it
// (`showNewConstraintFlow` in RulesConstraintComponent). Does not use Add RCL Redux step state.

// Clone so this flow never mutates ADD_RCL_TABS_DATA used by legacy Add RCL.
const STEP_META = cloneDeep(ADD_RCL_TABS_DATA).slice(1, 3);

const CreateNewRuleFlowComponent = (props) => {
  const {
    savedEditedRcls,
    selectedRclProductLevel,
    createRulesTableLoader,
    setRulesCreateLoader,
    saveEditedRCL,
    setProductsLevelDataForBackFlow,
    setRclSelectedProductLevel,
    productsLevelDataForBackFlow,
    inventorysmartScreenConfig,
    addSnack: addSnackAction,
    setInventorySmartModulesPermissions,
    setInventorySmartPermissionLoader,
    setConstraintsConfigs,
    setCreateRulesConfigs,
    formattedConstraintsData,
    setRclConstraints,
    screenName,
    resetFilterConfiguration: resetCreateNewRuleFilterConfiguration,
  } = props;

  const history = useHistory();
  const location = useLocation();
  const globalClasses = globalStyles();
  const customClasses = useStyles();
  const [activeStep, setActiveStep] = useState(getInitialCreateNewRuleStep);
  const [step0MandatorySatisfied, setStep0MandatorySatisfied] = useState(
    () => getInitialCreateNewRuleStep() === 1
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showAddExceptionPrompt, setShowAddExceptionPrompt] = useState(false);

  const resetFlowState = () =>
    resetCreateNewRuleFlowState({
      setRclSelectedProductLevel,
      setProductsLevelDataForBackFlow,
      saveEditedRCL,
      resetFilterConfiguration: resetCreateNewRuleFilterConfiguration,
    });

  /** Restore filters from session before paint so step 1 grid can call createRcl. */
  useLayoutEffect(() => {
    const session = loadCreateNewRuleFlowSession();
    if (!session?.filters?.length) {
      return;
    }
    const filters = cloneDeep(session.filters);
    setRclSelectedProductLevel(filters);
    setProductsLevelDataForBackFlow({ filterConfig: filters });
  }, [setProductsLevelDataForBackFlow, setRclSelectedProductLevel]);

  useEffect(() => {
    if (activeStep === 1 && selectedRclProductLevel?.length) {
      setStep0MandatorySatisfied(true);
    }
  }, [activeStep, selectedRclProductLevel?.length]);

  /** Re-fetch UAM on refresh; permissions are only loaded on Constraints → Create new rule click otherwise. */
  useEffect(() => {
    let cancelled = false;
    const loadAccess = async () => {
      try {
        await Promise.all([
          fetchCreateNewRuleModuleAccess({
            inventorysmartScreenConfig,
            setInventorySmartModulesPermissions,
            setInventorySmartPermissionLoader,
          }),
          fetchCreateNewRuleTenantConfigs({
            screenName: screenName || CREATE_NEW_RULE_SCREEN_NAME,
            setConstraintsConfigs,
            setCreateRulesConfigs,
          }),
        ]);
      } catch {
        if (!cancelled) {
          // Errors surfaced inside fetch when snack is wired; keep flow usable on non-RBA tenants.
        }
      }
    };
    loadAccess();
    return () => {
      cancelled = true;
    };
  }, [
    inventorysmartScreenConfig,
    screenName,
    setConstraintsConfigs,
    setCreateRulesConfigs,
    setInventorySmartModulesPermissions,
    setInventorySmartPermissionLoader,
  ]);

  const paths = [
    {
      label: "Home",
      to: "/home",
      action: () => {
        clearCreateNewRuleFlowSession();
      },
    },
    {
      label: "Constraints",
      to: CONSTRAINTS,
      action: () => {
        clearCreateNewRuleFlowSession();
      },
    },
    { label: "Create new rule", to: "#" },
  ];

  const getStepperSteps = () =>
    STEP_META.map((tab) => ({
      label: tab?.label,
      description: tab?.description || "",
    }));

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <SelectProduct
            key="select-products-step"
            screenName={props.screenName}
            onMandatorySatisfactionChange={setStep0MandatorySatisfied}
          />
        );
      case 1:
        return <SetConstraints key="set-constraints-step" />;
      default:
        return null;
    }
  };

  const isStep0 = activeStep === 0;
  const isStep1 = activeStep === 1;

  let secondaryLabel = STEP_META[activeStep]?.secondaryButtonLabel;
  let primaryLabel = STEP_META[activeStep]?.primaryButtonLabel;
  let secondaryVariant = "secondary";

  if (isStep0) {
    secondaryLabel = "Cancel";
    secondaryVariant = "secondary";
    primaryLabel = "Go to set constraints >";
  } else if (isStep1) {
    secondaryLabel = "< Back to select products";
    secondaryVariant = "tertiary";
    primaryLabel = "Save Constraints";
  }

  const onBackFromStep0 = () => {
    resetFlowState();
    history.push({
      pathname: CONSTRAINTS,
      state: { preselectedTab: LANDING_SCREEN_TAB.ALL_RULES },
    });
  };

  const onSecondary = () => {
    if (isStep0) {
      onBackFromStep0();
      return;
    }

    const session = loadCreateNewRuleFlowSession();
    const filters = cloneDeep(
      productsLevelDataForBackFlow?.filterConfig?.length
        ? productsLevelDataForBackFlow.filterConfig
        : selectedRclProductLevel?.length
          ? selectedRclProductLevel
          : session?.filters || []
    );
    if (filters.length) {
      setRclSelectedProductLevel(filters);
      setProductsLevelDataForBackFlow({ filterConfig: filters });
      saveCreateNewRuleFlowSession({
        activeStep: 0,
        filters,
        tableName: session?.tableName,
      });
    } else {
      saveCreateNewRuleFlowSession({ activeStep: 0 });
    }
    setActiveStep(0);
    // Clear invalidKeys when navigating back to step 0
    if (props.setInvalidKeys) {
      props.setInvalidKeys([]);
    }
  };

  const onPrimary = async () => {
    if (isStep0) {
      const filters = cloneDeep(selectedRclProductLevel || []);
      setProductsLevelDataForBackFlow({ filterConfig: filters });
      // Always fetch a new table_name when entering step 1 from step 0 (not on refresh).
      saveCreateNewRuleFlowSession({
        activeStep: 1,
        filters,
        tableName: null,
      });
      setActiveStep(1);
      return;
    }

    if (isStep1) {
      const tableName = getCreateNewRuleTableName();
      setIsSaving(true);
      try {
        await saveCreateNewRuleConstraints({
          savedEditedRcls,
          selectedRclProductLevel,
          tableName,
          setRulesCreateLoader,
          saveEditedRCL,
          snackProps: { addSnack: addSnackAction },
          history,
          location,
          resetFlowState,
          setRclConstraints,
          redirectTo: undefined,
          setInvalidKeys: props.setInvalidKeys,
          enable_validation_on_save: props.enable_validation_on_save,
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const isPrimaryDisabled =
    isSaving ||
    createRulesTableLoader ||
    (isStep0 && !step0MandatorySatisfied);

  return (
    <div className={`${globalClasses.paddingAroundNew} ${customClasses.marginBottom44} ${activeStep === 0 ? globalClasses.paddingBottom_8 : ""}`}>
      <div className={globalClasses.breadcrumbPadding}>
        <HeaderBreadCrumbs options={paths} />
      </div>
      <div className={globalClasses.marginTop_12}>
        <Container
          maxWidth={false}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto",
            width: "70%",
            marginBottom: "0.5rem",
            gap: "24px",
          }}
        >
          <div style={{ flex: "2 1 0", minWidth: 0 }}>
            <Stepper
              activeStep={activeStep}
              steps={getStepperSteps()}
              orientation="horizontal"
              handleStep={() => {}}
            />
          </div>
          <AddExceptionsStepper />
        </Container>
        {renderStepContent()}
      </div>
      <div
        className={`${customClasses.bottomButtonsContainer} ${isStep0 ? customClasses.flexJustifyFlexEnd : globalClasses.flexAlignBetweenCenter}`}
      >
        <Button
          className={customClasses.button}
          rule_code="create-new-rule-flow-secondary"
          variant={secondaryVariant}
          onClick={onSecondary}
          disabled={isSaving || createRulesTableLoader}
        >
          {secondaryLabel}
        </Button>
        <div className={`${globalClasses.flexRow} ${globalClasses.gap_8}`}>
          {isStep1 && (
            <Button
              className={customClasses.button}
              rule_code="create-new-rule-flow-add-exceptions"
              variant="secondary"
              onClick={() => setShowAddExceptionPrompt(true)}
              disabled={isSaving || createRulesTableLoader}
            >
              Add Exceptions
            </Button>
          )}
          <Button
            className={customClasses.button}
            rule_code="create-new-rule-flow-primary"
            variant="primary"
            onClick={onPrimary}
            disabled={isPrimaryDisabled}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
      <Prompt
        isOpen={showAddExceptionPrompt}
        title="Add Exceptions"
        variant="warning"
        primaryButtonLabel="Continue"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={async () => {
          setShowAddExceptionPrompt(false);
          setIsSaving(true);
          try {
            await saveCreateNewRuleConstraints({
              savedEditedRcls,
              selectedRclProductLevel,
              tableName: getCreateNewRuleTableName(),
              setRulesCreateLoader,
              saveEditedRCL,
              snackProps: { addSnack: addSnackAction },
              history,
              location,
              redirectTo: EDIT_CREATE_EXCEPTION_SCREEN,
              formattedConstraintsData,
              setRclConstraints,
              setInvalidKeys: props.setInvalidKeys,
              enable_validation_on_save: props.enable_validation_on_save,
            });
          } finally {
            setIsSaving(false);
          }
        }}
        onSecondaryButtonClick={() => setShowAddExceptionPrompt(false)}
        handleClose={() => setShowAddExceptionPrompt(false)}
      >
        Override base constraints for specific stores
      </Prompt>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    savedEditedRcls:
      inventorysmartReducer?.rulesConstraintsReducer?.savedEditedRcls,
    selectedRclProductLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    productsLevelDataForBackFlow:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.productsLevelDataForBackFlow,
    createRulesTableLoader:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesTableLoader,
    createRulesConfigs:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs,
    formattedConstraintsData:
      inventorysmartReducer?.rulesConstraintsReducer?.formattedConstraintsData,
    invalidKeys:
      inventorysmartReducer?.rulesConstraintsReducer?.invalidKeys,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
    enable_validation_on_save:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs?.enable_validation_on_save,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (body) => dispatch(addSnack(body)),
  setRulesCreateLoader: (payload) => dispatch(setRulesTableLoaderAction(payload)),
  saveEditedRCL: (body) => dispatch(saveEditedRCLAction(body)),
  setRclConstraints: (body) => dispatch(setRclConstraintsAction(body)),
  setInvalidKeys: (payload) => dispatch(setInvalidKeysAction(payload)),
  setProductsLevelDataForBackFlow: (payload) =>
    dispatch(setProductsLevelDataForBackFlowAction(payload)),
  setRclSelectedProductLevel: (payload) =>
    dispatch(setRclSelectedProductLevelAction(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissionsAction(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoaderAction(payload)),
  setConstraintsConfigs: (payload) =>
    dispatch(setConstraintsConfigsAction(payload)),
  setCreateRulesConfigs: (payload) =>
    dispatch(setCreateRulesConfigsAction(payload)),
  resetFilterConfiguration: (payload) =>
    dispatch(resetFilterConfiguration(payload)),
});

export const CreateNewRuleFlow = connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewRuleFlowComponent);
