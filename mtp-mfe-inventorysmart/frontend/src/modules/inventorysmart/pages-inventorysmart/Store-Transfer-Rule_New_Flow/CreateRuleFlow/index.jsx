import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import { Button, Stepper, ButtonGroup, useTranslation } from "impact-ui-v3";
import EyeIcon from "assets/IS_icons/IS_Eye.svg";
import EditIcon from "assets/IS_icons/IS_Edit.svg";
import { addSnack } from "core/actions/snackbarActions";
import {
  ADD_NEW_STORE_TRANSFER_RULE,
  CONFIGURATION,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  createStoreTransferRuleV2,
  updateStoreTransferRuleV2,
  fetchStoreTransferOptions,
  fetchStoreTransferRuleById,
  setNewRuleDetails,
} from "modules/inventorysmart/services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import {
  DEFAULT_STORE_SELECTION_OPTIONS,
  DEFAULT_FORM_STATE,
  DEFAULT_STORE_SELECTION_TABS,
  STEP_META,
} from "../constants";
import { buildStoreTransferRuleSavePayload, getStoreSelectionSaveValidationMessage } from "./buildSaveRulePayload";
import {
  mapRuleDetailToFormState,
  mapRuleDetailToStoreSelectionState,
} from "./mapRuleDetailToFormState";
import RuleNameStep from "./RuleNameStep";
import StoreSelectionStep from "./StoreSelectionStep";
import { parseStoreTransferOptions } from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const CreateStoreTransferRuleFlow = ({
  addSnack,
  createStoreTransferRuleV2: createStoreTransferRuleV2Action,
  updateStoreTransferRuleV2: updateStoreTransferRuleV2Action,
  fetchStoreTransferOptions: fetchStoreTransferOptionsAction,
  fetchStoreTransferRuleById: fetchStoreTransferRuleByIdAction,
  newRuleDetails,
  setNewRuleDetails: setNewRuleDetailsAction,
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useCreateRuleFlowStyles();
  const storeSelectionStepRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [isStoreOptionsLoading, setIsStoreOptionsLoading] = useState(false);
  const [isRuleDetailLoading, setIsRuleDetailLoading] = useState(false);
  const [storeSelectionTabs, setStoreSelectionTabs] = useState(
    DEFAULT_STORE_SELECTION_TABS
  );
  const [storeSelectionOptions, setStoreSelectionOptions] = useState(
    DEFAULT_STORE_SELECTION_OPTIONS
  );
  const [initialStoreSelectionState, setInitialStoreSelectionState] =
    useState(null);
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const optionsLoadedRef = useRef(false);
  const loadedOptionsRef = useRef(DEFAULT_STORE_SELECTION_OPTIONS);
  const ruleBootstrapDoneRef = useRef(false);
  const [viewMode, setViewMode] = useState("edit");
  const [showViewEditToggle, setShowViewEditToggle] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [isDefaultRule, setIsDefaultRule] = useState(false);

  const paths = [
    {
      label: t("inventorysmart.home"),
      to: "/home",
    },
    {
      label: t("inventorysmart.configuration"),
      to: CONFIGURATION,
    },
  ];

  const getStepperSteps = () =>
    STEP_META.map((step) => ({
      label: step.label,
      description: step.description || "",
    }));

  const navigateToStoreTransferRules = () => {
    history.push(CONFIGURATION, {
      state: ADD_NEW_STORE_TRANSFER_RULE,
    });
  };

  const displaySnackMessages = (message, variance) => {
    addSnack({
      message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };

  const handleErrorMessage = (error, defaultError = ERROR_MESSAGE) => {
    const errObj = error?.response?.data;
    if (errObj?.show_message) {
      displaySnackMessages(errObj.message, "error");
    } else {
      displaySnackMessages(defaultError, "error");
    }
  };

  const updateFormState = (updates) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  };

  const isStep0 = activeStep === 0;
  const isStep1 = activeStep === 1;

  const isStep0Valid =
    formState.ruleName.trim().length > 0 && Boolean(formState.fulfilmentType);

  const loadStoreSelectionOptions = async ({ silent = false } = {}) => {
    if (optionsLoadedRef.current) {
      return loadedOptionsRef.current;
    }

    setIsStoreOptionsLoading(true);
    try {
      const response = await fetchStoreTransferOptionsAction();
      const responseData = response?.data;

      if (responseData?.status === false) {
        if (!silent) {
          if (responseData?.show_message) {
            displaySnackMessages(responseData.message, "error");
          } else {
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
        }
        return null;
      }

      const { tabs, options } = parseStoreTransferOptions(
        responseData?.data ?? responseData
      );
      setStoreSelectionTabs(tabs);
      setStoreSelectionOptions(options);
      loadedOptionsRef.current = options;
      optionsLoadedRef.current = true;
      return options;
    } catch (error) {
      if (!silent) {
        handleErrorMessage(error);
      }
      return null;
    } finally {
      setIsStoreOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (ruleBootstrapDoneRef.current) {
      return;
    }

    const navigationState = history.location?.state;
    const ruleId = navigationState?.ruleId;
    const mode = navigationState?.mode || "view";
    const isDefaultFromNav = Boolean(navigationState?.isDefault);

    if (!ruleId && !navigationState?.ruleDetail) {
      ruleBootstrapDoneRef.current = true;
      if (newRuleDetails) {
        setFormState((prev) => ({
          ...prev,
          ruleName: newRuleDetails.rule_name ?? "",
          description: newRuleDetails.description ?? "",
        }));
        setNewRuleDetailsAction(null);
      }
      return;
    }

    const bootstrapExistingRule = async () => {
      ruleBootstrapDoneRef.current = true;
      setIsRuleDetailLoading(true);
      setShowViewEditToggle(true);
      if (ruleId) {
        setEditingRuleId(ruleId);
      }
      if (isDefaultFromNav) {
        setIsDefaultRule(true);
        setViewMode("view");
      }

      try {
        let ruleDetail = navigationState?.ruleDetail;

        if (!ruleDetail && ruleId) {
          const response = await fetchStoreTransferRuleByIdAction(ruleId);
          const responseData = response?.data;
          ruleDetail = responseData?.data ?? responseData;

          if (responseData?.status === false) {
            displaySnackMessages(
              responseData?.message || ERROR_MESSAGE,
              "error"
            );
            return;
          }
        }

        if (!ruleDetail || typeof ruleDetail !== "object") {
          displaySnackMessages(ERROR_MESSAGE, "error");
          return;
        }

        const normalizedRuleDetail =
          ruleDetail.rule_name || ruleDetail.fulfillment_type
            ? ruleDetail
            : ruleDetail.rule || ruleDetail.data || ruleDetail;

        const defaultFlag =
          normalizedRuleDetail?.is_default ??
          normalizedRuleDetail?.isDefault;
        const ruleName = String(normalizedRuleDetail?.rule_name || "")
          .trim()
          .toLowerCase();
        const isDefault =
          isDefaultFromNav ||
          defaultFlag === true ||
          defaultFlag === 1 ||
          defaultFlag === "1" ||
          defaultFlag === "true" ||
          ruleName === "default_rule" ||
          ruleName === "default rule" ||
          ruleName === "default";
        setIsDefaultRule(isDefault);
        setViewMode(isDefault ? "view" : mode === "edit" ? "edit" : "view");

        if (!ruleId && normalizedRuleDetail?.rule_id) {
          setEditingRuleId(normalizedRuleDetail.rule_id);
        }

        const mappedFormState = mapRuleDetailToFormState(normalizedRuleDetail);
        if (newRuleDetails) {
          mappedFormState.ruleName =
            newRuleDetails.rule_name ?? mappedFormState.ruleName;
          mappedFormState.description =
            newRuleDetails.description ?? mappedFormState.description;
          setNewRuleDetailsAction(null);
        }
        setFormState(mappedFormState);

        // Prefetch options for store selection; do not block/break step 1 on failure.
        const options = await loadStoreSelectionOptions({ silent: true });
        if (options) {
          try {
            setInitialStoreSelectionState(
              mapRuleDetailToStoreSelectionState(normalizedRuleDetail, options)
            );
          } catch (_mappingError) {
            setInitialStoreSelectionState(null);
          }
        }
      } catch (error) {
        handleErrorMessage(error);
      } finally {
        setIsRuleDetailLoading(false);
      }
    };

    bootstrapExistingRule();
  }, []);

  const renderStepContent = () => {
    const isDisabled = viewMode === "view" || isDefaultRule;

    switch (activeStep) {
      case 0:
        return (
          <RuleNameStep
            formState={formState}
            onFormChange={updateFormState}
            isDisabled={isDisabled}
          />
        );
      case 1:
        return (
          <StoreSelectionStep
            ref={storeSelectionStepRef}
            isLoading={isStoreOptionsLoading}
            fulfilmentType={formState.fulfilmentType}
            tabOptions={storeSelectionTabs}
            storeSelectionOptions={storeSelectionOptions}
            onValidityChange={setIsStep1Valid}
            isDisabled={isDisabled}
            initialStoreSelectionState={initialStoreSelectionState}
          />
        );
      default:
        return null;
    }
  };

  const onSecondary = () => {
    if (isStep0) {
      navigateToStoreTransferRules();
      return;
    }
    setActiveStep(0);
  };

  const onPrimary = async () => {
    if (isStep0) {
      if (!isStep0Valid) {
        displaySnackMessages(
          t("inventorysmart.ruleNameAndFulfilmentTypeAreRequired"),
          "error"
        );
        return;
      }

      setActiveStep(1);
      const loaded = await loadStoreSelectionOptions();
      if (!loaded) {
        setActiveStep(0);
      }
      return;
    }

    if (viewMode === "view" || isDefaultRule) {
      return;
    }

    if (isStep1) {
      const storeSelectionState =
        storeSelectionStepRef.current?.getStoreSelectionState();
      const validationMessage = getStoreSelectionSaveValidationMessage({
        ...(storeSelectionState || {}),
        fulfilmentType: formState.fulfilmentType,
      });

      if (validationMessage) {
        displaySnackMessages(validationMessage, "error");
        return;
      }

      setIsSaving(true);
      try {
        const payload = buildStoreTransferRuleSavePayload({
          formState,
          storeSelectionState,
        });

        if (!payload) {
          displaySnackMessages(
            t("inventorysmart.saveIsNotYetSupportedForTheSelectedStoreTab"),
            "warning"
          );
          setIsSaving(false);
          return;
        }

        const response = editingRuleId
          ? await updateStoreTransferRuleV2Action(editingRuleId, payload)
          : await createStoreTransferRuleV2Action(payload);
        const responseData = response?.data;

        if (!responseData?.status) {
          displaySnackMessages(
            responseData?.message || ERROR_MESSAGE,
            "error"
          );
          setIsSaving(false);
          return;
        }

        displaySnackMessages(
          responseData?.message ||
            (editingRuleId
              ? t("inventorysmart.ruleUpdatedSuccessfully")
              : t("inventorysmart.ruleCreatedSuccessfully")),
          "success"
        );

        setTimeout(() => {
          setIsSaving(false);
          navigateToStoreTransferRules();
        }, 100);
      } catch (error) {
        handleErrorMessage(error);
        setIsSaving(false);
      }
    }
  };

  const secondaryLabel = isStep0
    ? STEP_META[0].secondaryButtonLabel
    : STEP_META[1].secondaryButtonLabel;

  const secondaryVariant = isStep0 ? "secondary" : "tertiary";

  const primaryLabel = isStep0
    ? STEP_META[0].primaryButtonLabel
    : STEP_META[1].primaryButtonLabel;

  const isViewMode = viewMode === "view";

  const isPrimaryDisabled =
    isSaving ||
    isStoreOptionsLoading ||
    isRuleDetailLoading ||
    (isStep0 && !isStep0Valid) ||
    (isStep1 && (isViewMode || isDefaultRule || !isStep1Valid));

  const handleViewModeChange = (event, newValue) => {
    if (isDefaultRule) {
      return;
    }

    const nextValue =
      newValue ??
      event?.currentTarget?.value ??
      event?.target?.value;

    if (!nextValue || nextValue === viewMode) {
      return;
    }

    setViewMode(nextValue);
  };

  const viewEditOptions = [
    {
      label: "View",
      value: "view",
      icon: <EyeIcon className={classes.viewEditIcon} />,
    },
    {
      label: "Edit",
      value: "edit",
      icon: <EditIcon className={classes.viewEditIcon} />,
      disabled: isDefaultRule,
    },
  ];

  const renderViewEditToggle = () => (
    <div className={globalClasses.flexRow}>
      <div className={globalClasses.shrink0} style={{ marginBottom: "8px" }}>
        <ButtonGroup
          onChange={handleViewModeChange}
          options={viewEditOptions}
          selectedOption={isDefaultRule ? "view" : viewMode}
        />
      </div>
    </div>
  );

  const renderStepperToolbar = () => (
    <div className={classes.stepperToolbar}>
      <div className={classes.stepperToolbarMain}>
        <Stepper
          activeStep={activeStep}
          steps={getStepperSteps()}
          orientation="horizontal"
          width="70%"
        />
      </div>
      <div className={classes.stepperToolbarActions}>
        {showViewEditToggle ? renderViewEditToggle() : null}
      </div>
    </div>
  );

  return (
    <div className={`${globalClasses.paddingAroundNew} ${globalClasses.mainContainerBody}`}>
      <div className={`${globalClasses.breadcrumbPadding}`}>
        <HeaderBreadCrumbs options={paths} />
      </div>
      <div 
        className={globalClasses.tabsContainerBody}
        style={{
          maxHeight: "calc(100vh - 188px)"
        }}
      >
        {renderStepperToolbar()}
        {renderStepContent()}
      </div>
      <div
        className={`${classes.bottomButtonsContainer} ${globalClasses.flexAlignBetweenCenter}`}
      >
        <Button
          className={classes.button}
          variant={secondaryVariant}
          onClick={onSecondary}
          disabled={isSaving || isStoreOptionsLoading || isRuleDetailLoading}
        >
          {secondaryLabel}
        </Button>
        <Button
          className={classes.button}
          variant="primary"
          onClick={onPrimary}
          disabled={isPrimaryDisabled}
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => ({
  newRuleDetails:
    store.inventorysmartReducer.storeTransferRuleService.newRuleDetails,
});

const mapDispatchToProps = (dispatch) => ({
  addSnack: (body) => dispatch(addSnack(body)),
  createStoreTransferRuleV2: (data) => dispatch(createStoreTransferRuleV2(data)),
  updateStoreTransferRuleV2: (ruleId, data) =>
    dispatch(updateStoreTransferRuleV2(ruleId, data)),
  fetchStoreTransferOptions: () => dispatch(fetchStoreTransferOptions()),
  fetchStoreTransferRuleById: (ruleId) =>
    dispatch(fetchStoreTransferRuleById(ruleId)),
  setNewRuleDetails: (payload) => dispatch(setNewRuleDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateStoreTransferRuleFlow);
