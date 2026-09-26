import { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { cloneDeep } from "lodash";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { Button, ButtonGroup, Stepper, useTranslation } from "impact-ui-v3";
import EyeIcon from "assets/IS_icons/IS_Eye.svg";
import EditIcon from "assets/IS_icons/IS_Edit.svg";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  ADD_NEW_DC_TRANSFER_RULE,
  CONFIGURATION,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  createDCTransferRuleMapping,
  saveDCTransferRule,
  updateDCTransferRule,
} from "modules/inventorysmart/services-inventorysmart/DC-Transfer-Rule/dc-transfer-rule";
import {
  FULFILMENT_TYPE,
  FULFILLMENT_TYPE_API_MAP,
} from "../constants";
import {
  areDcSelectionFiltersEqual,
  buildDCSelectionCreationPayload,
  buildFilterMappedPayload,
} from "./dcSelectionFilterUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";
import FulfilmentTypeStep from "./FulfilmentTypeStep";
import ReviewCombinationsStep from "./ReviewCombinationsStep";
import RuleNameDescription from "./RuleNameDescription";

const CreateDCTransferRuleFlow = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const globalClasses = globalStyles();
  const classes = useCreateRuleFlowStyles();
  const isDefaultRule = Boolean(location.state?.isDefault);
  const openedFromView = location.state?.mode === "view";
  const [activeStep, setActiveStep] = useState(0);
  const [showBasicDetails, setShowBasicDetails] = useState(false);
  const ruleId = location.state?.ruleId ?? null;
  const [viewMode, setViewMode] = useState(() => {
    if (isDefaultRule || openedFromView) {
      return "view";
    }
    return "edit";
  });
  // Always show toggle. View is selectable for default rules and when opened via
  // View; Edit stays disabled for default rules.
  const [showViewEditToggle] = useState(true);
  const allowViewModeSelection = isDefaultRule || openedFromView;
  const [ruleDetails, setRuleDetails] = useState({
    ruleName: location.state?.ruleName || "",
    description: location.state?.description || "",
  });
  const [fulfilmentType, setFulfilmentType] = useState(
    location.state?.fulfilmentType || FULFILMENT_TYPE.NEED_BASED
  );
  const [dcSelectionFilters, setDCSelectionFilters] = useState(() =>
    cloneDeep(location.state?.dcSelectionFilters || {})
  );
  const [dcFilterFields, setDCFilterFields] = useState([]);
  const [dcSelectAllState, setDCSelectAllState] = useState({});
  const [isFilterConfigLoading, setIsFilterConfigLoading] = useState(true);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [mappingTableName, setMappingTableName] = useState(
    location.state?.mappingTableName || ""
  );
  const [hasCircularTransfers, setHasCircularTransfers] = useState(false);
  const [selectedMappingRows, setSelectedMappingRows] = useState([]);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const initialFulfilmentTypeRef = useRef(
    location.state?.fulfilmentType || FULFILMENT_TYPE.NEED_BASED
  );
  const initialDcSelectionFiltersRef = useRef(
    cloneDeep(location.state?.dcSelectionFilters || {})
  );

  const isViewMode = viewMode === "view" || isDefaultRule;
  const isExistingRule = ruleId !== null && ruleId !== undefined;
  const isFixedPush = fulfilmentType === FULFILMENT_TYPE.FIXED_PUSH;
  const shouldBlockSaveForCircularTransfers =
    isFixedPush && hasCircularTransfers;

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

  const getStepperSteps = () => [
    {
      label: t(
        "inventorysmart.dcTransferRule.step.fulfilmentTypeDcSelection.label"
      ),
      description: "",
    },
    {
      label: t("inventorysmart.dcTransferRule.step.reviewCombinations.label"),
      description: "",
    },
  ];

  const openBasicDetails = () => {
    setShowBasicDetails(true);
  };

  const navigateToDCTransferRules = (options = {}) => {
    navigate(CONFIGURATION, {
      state: {
        from: ADD_NEW_DC_TRANSFER_RULE,
        ...(options.showRuleCreatedSuccess
          ? { showRuleCreatedSuccess: true }
          : {}),
      },
      replace: true,
    });
  };

  const isSaveResponseSuccessful = (responseData) =>
    responseData?.status !== false;

  const handleBasicDetailsCancel = () => {
    navigateToDCTransferRules();
  };

  const handleBasicDetailsNext = (details) => {
    if (isViewMode) {
      setShowBasicDetails(false);
      setActiveStep(0);
      return;
    }
    setRuleDetails((prev) => ({
      ...prev,
      ...details,
    }));
    setShowBasicDetails(false);
    setActiveStep(0);
  };

  const isStep0 = activeStep === 0;
  const hasAnyDCFilterSelected = Object.values(dcSelectionFilters || {}).some(
    (selected) =>
      Array.isArray(selected) ? selected.length > 0 : Boolean(selected)
  );
  const canProceedToReviewStep = isViewMode
    ? mappingTableName || hasAnyDCFilterSelected
    : hasAnyDCFilterSelected;

  const handleViewModeChange = (_event, newValue) => {
    if (isDefaultRule || !showViewEditToggle) {
      return;
    }
    const nextValue =
      newValue ??
      _event?.currentTarget?.value ??
      _event?.target?.value;
    if (!nextValue || nextValue === viewMode) {
      return;
    }
    if (nextValue === "view" && !allowViewModeSelection) {
      return;
    }
    setViewMode(nextValue);
    if (nextValue === "view") {
      setHasCircularTransfers(false);
      setSelectedMappingRows([]);
    }
  };

  const viewEditOptions = [
    {
      label: t("inventorysmart.dcTransferRule.viewMode"),
      value: "view",
      icon: <EyeIcon className={classes.viewEditIcon} />,
      disabled: !allowViewModeSelection,
    },
    {
      label: t("inventorysmart.dcTransferRule.editMode"),
      value: "edit",
      icon: <EditIcon className={classes.viewEditIcon} />,
      disabled: isDefaultRule,
    },
  ];

  const renderViewEditToggle = () => (
    <div className={globalClasses.flexRow}>
      <div className={globalClasses.shrink0}>
        <ButtonGroup
          onChange={handleViewModeChange}
          options={viewEditOptions}
          selectedOption={isDefaultRule ? "view" : viewMode}
        />
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <FulfilmentTypeStep
            fulfilmentType={fulfilmentType}
            onFulfilmentTypeChange={setFulfilmentType}
            dcSelectionFilters={dcSelectionFilters}
            onDCSelectionFiltersChange={setDCSelectionFilters}
            onFilterFieldsChange={setDCFilterFields}
            onSelectAllStateChange={setDCSelectAllState}
            onConfigLoadingChange={setIsFilterConfigLoading}
            isDisabled={isViewMode}
          />
        );
      case 1:
        return (
          <ReviewCombinationsStep
            mappingTableName={mappingTableName}
            fulfilmentType={fulfilmentType}
            onError={handleErrorMessage}
            onCircularTransfersChange={setHasCircularTransfers}
            onSelectedRowsChange={setSelectedMappingRows}
            isDisabled={isViewMode}
            preselectActiveRows
          />
        );
      default:
        return null;
    }
  };

  const displaySnack = useCallback((message, variant = "error") => {
    dispatch(
      addSnack({
        message,
        options: { variant },
      })
    );
  }, [dispatch]);

  const handleErrorMessage = useCallback((error) => {
    const errObj = error?.response?.data;
    if (errObj?.show_message) {
      displaySnack(errObj.message);
    } else {
      displaySnack(ERROR_MESSAGE);
    }
  }, [displaySnack]);

  const getUpdateFlowOptions = () => {
    if (!isExistingRule) {
      return null;
    }

    if (isViewMode) {
      return {
        isFilterChanged: false,
        isFulfilmentTypeChanged: false,
        ruleId,
      };
    }

    return {
      isFilterChanged: !areDcSelectionFiltersEqual(
        initialDcSelectionFiltersRef.current,
        dcSelectionFilters,
        dcFilterFields
      ),
      isFulfilmentTypeChanged:
        initialFulfilmentTypeRef.current !== fulfilmentType,
      ruleId,
    };
  };

  const proceedToReviewStep = useCallback(async () => {
    setIsCreatingMapping(true);
    try {
      const response = await createDCTransferRuleMapping(
        buildDCSelectionCreationPayload(
          dcFilterFields,
          dcSelectionFilters,
          dcSelectAllState,
          getUpdateFlowOptions()
        )
      )();
      const tableName = response?.data?.data?.table_name;
      if (!tableName) {
        displaySnack(ERROR_MESSAGE);
        return;
      }
      setMappingTableName(tableName);
      setActiveStep(1);
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsCreatingMapping(false);
    }
  }, [
    dcFilterFields,
    dcSelectionFilters,
    dcSelectAllState,
    displaySnack,
    fulfilmentType,
    handleErrorMessage,
    isExistingRule,
    isViewMode,
    ruleId,
  ]);

  const onSecondary = () => {
    if (isStep0) {
      openBasicDetails();
      return;
    }
    setHasCircularTransfers(false);
    setSelectedMappingRows([]);
    if (!isViewMode) {
      setMappingTableName("");
    }
    setActiveStep(0);
  };

  const onPrimary = async () => {
    if (isStep0) {
      if (isViewMode && mappingTableName) {
        setActiveStep(1);
        return;
      }

      if (!hasAnyDCFilterSelected) {
        displaySnack(ERROR_MESSAGE);
        return;
      }

      await proceedToReviewStep();
      return;
    }

    if (isViewMode || shouldBlockSaveForCircularTransfers || isSavingRule) {
      return;
    }

    const payload = {
      rule_name: ruleDetails.ruleName,
      description: ruleDetails.description,
      active_rows: selectedMappingRows
        .map((row) => row?.id)
        .filter((id) => id !== undefined && id !== null),
      table_name: mappingTableName,
      filter_mapped: buildFilterMappedPayload(
        dcFilterFields,
        dcSelectionFilters
      ),
      fulfillment_type:
        FULFILLMENT_TYPE_API_MAP[fulfilmentType] || fulfilmentType,
    };

    setIsSavingRule(true);
    try {
      const response = isExistingRule
        ? await updateDCTransferRule({
            ...payload,
            rule_id: ruleId,
          })()
        : await saveDCTransferRule(payload)();

      const responseData = response?.data;
      if (!isSaveResponseSuccessful(responseData)) {
        displaySnack(responseData?.message || ERROR_MESSAGE);
        return;
      }

      if (isExistingRule) {
        displaySnack(
          responseData?.message ||
            t("inventorysmart.dcTransferRule.mappingUpdatedSuccessfully"),
          "success"
        );
        navigateToDCTransferRules();
        return;
      }

      navigateToDCTransferRules({ showRuleCreatedSuccess: true });
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsSavingRule(false);
    }
  };

  const renderFooter = () => {
    if (isStep0) {
      return (
        <>
          <Button
            className={classes.button}
            variant="tertiary"
            onClick={openBasicDetails}
          >
            {t(
              "inventorysmart.dcTransferRule.step.fulfilmentTypeDcSelection.backButton"
            )}
          </Button>
          <div className={classes.footerRightActions}>
            <Button
              className={classes.button}
              variant="secondary"
              onClick={navigateToDCTransferRules}
            >
              {t("inventorysmart.cancel")}
            </Button>
            <Button
              className={classes.button}
              variant="primary"
              onClick={onPrimary}
              disabled={
                isFilterConfigLoading ||
                isCreatingMapping ||
                !canProceedToReviewStep
              }
            >
              {t(
                "inventorysmart.dcTransferRule.step.fulfilmentTypeDcSelection.primaryButton"
              )}
            </Button>
          </div>
        </>
      );
    }

    return (
      <>
        <Button
          className={classes.button}
          variant="tertiary"
          onClick={onSecondary}
        >
          {t(
            "inventorysmart.dcTransferRule.step.reviewCombinations.secondaryButton"
          )}
        </Button>
        <Button
          className={classes.button}
          variant="primary"
          onClick={onPrimary}
          disabled={
            isViewMode ||
            shouldBlockSaveForCircularTransfers ||
            isSavingRule ||
            selectedMappingRows.length === 0
          }
        >
          {t(
            "inventorysmart.dcTransferRule.step.reviewCombinations.primaryButton"
          )}
        </Button>
      </>
    );
  };

  if (showBasicDetails) {
    return (
      <RuleNameDescription
        initialRuleName={ruleDetails.ruleName}
        initialDescription={ruleDetails.description}
        onCancel={handleBasicDetailsCancel}
        onNext={handleBasicDetailsNext}
        isDisabled={isViewMode}
        excludeRuleId={isExistingRule ? ruleId : null}
      />
    );
  }

  return (
    <div className={globalClasses.paddingAround}>
      <HeaderBreadCrumbs options={paths} />
      <div>
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
        {renderStepContent()}
      </div>
      <div
        className={`${classes.bottomButtonsContainer} ${globalClasses.flexAlignBetweenCenter}`}
      >
        {renderFooter()}
      </div>
    </div>
  );
};

export default CreateDCTransferRuleFlow;
