import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Button, CircularProgress, TextField } from "@mui/material";
import { Box } from "@mui/system";
import { Prompt } from "impact-ui";
import {
  SAVE_SF,
  SAVE_SF_TO_WF,
  SAVE_SP,
  SAVE_SP_TO_WP,
  SCENARIO_FORECAST,
  SCENARIO_PLAN,
  getDashboardUrl,
  getMatchWithText,
  saveAsWarningMsgFn,
  save_as_dropdown_list,
  statusCodeBasedOnPlanType,
} from "modules/plansmart/constants-plansmart/stringConstants";
import {
  planSmartSaveScenarioNameLoaderSelector,
  planSmartUpdateEopBopSyncLoaderSelector,
  plansmartPlanDisplayNameEditLoaderSelector,
  savePlanAPI,
  saveScenarioNameApi,
  updateEopBopSyncValue,
} from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import moment from "moment";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { useStyles } from "../plansmart-styles";
import SaveScenarioPlanModal from "./SaveScenarioPlanModal";
import { useBudgetStyles } from "./budget-table-style";
import MatchWithIcon from "../../../../assets/matchWith.svg";
import AddVersions from "../../../../assets/addVersions.svg";
import CalculateIcon from "@mui/icons-material/CalculateOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ArrowTooltips from "core/Utils/ArrowTooltips";
import { editPlanDisplayName } from "../../services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { addSnack } from "core/actions/snackbarActions";
import { SNACK_VARIANT } from "modules/plansmart/utils-plansmart/snackMessage";
import { Switch, Tooltip, Spinner } from "impact-ui";

const PlanBudgetFilter = (props) => {
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [saveConfirmationModal, setSaveConfirmationModal] = useState(false);
  const [saveOptionType, setSaveOptionType] = useState("");
  //style for budget table
  const classes = useBudgetStyles();
  const history = useHistory();
  const plansmartClasses = useStyles();
  const {
    planDetails,
    setPlanDetails,
    setComparePlanModal,
    planBudgetData,
    updateBudgetTable,
    showSnackMessage,
    disableAllOptions,
    handlePivotView,
    pivotViewMode,
    handleMatchWith,
    matchWithList,
    matchWithVal,
    budgetTableRef,
    viewMode,
    skuViewMode,
    pivotViewComponent,
    saveScenarioNameReq,
    saveScenarioNameLoader,
    savePlanRequest,
    setDownloadModal,
    openMatchWith,
    showEnablePivot,
    setShowTargetOptimizationModal,
    eohBohSync,
    updateEopBopSyncValueReq,
    planSmartUpdateEopBopSyncLoader,
  } = props;

  const [isDisplayNameEdit, setIsDisplayNameEdit] = useState(false);
  const [planDisplayName, setPlanDisplayName] = useState("");
  const [planDisplayNameError, setPlanDisplayNameError] = useState(false);

  useEffect(() => {
    const planName = planDetails?.name.slice(0, 64);
    setPlanDisplayName(planDetails?.plan_display_name || planName);
  }, [planDetails]);

  const trimPlanDisplayName = (planDisplayName || "").trim();

  const updatedSaveAsList = planDetails
    ? save_as_dropdown_list.filter(
        (value) =>
          value.status.indexOf(planDetails.status) >= 0 &&
          (viewMode ? value.viewMode : true)
      )
    : [];

  const handleSaveAsOption = (selectedOption) => {
    switch (selectedOption.value) {
      case SAVE_SP:
      case SAVE_SF:
        setShowScenarioModal(true);
        break;
      case SAVE_SP_TO_WP:
        setSaveOptionType(SAVE_SP_TO_WP);
        setSaveConfirmationModal(true);
        break;
      case SAVE_SF_TO_WF:
        setSaveOptionType(SAVE_SF_TO_WF);
        setSaveConfirmationModal(true);
        break;
      default:
        break;
    }
  };

  const handleConfirmationModal = async (value) => {
    if (value) {
      switch (saveOptionType) {
        case SAVE_SP_TO_WP:
        case SAVE_SF_TO_WF:
          const dashboardUrl = getDashboardUrl(planDetails?.status);
          try {
            const spToWpResp = await savePlanRequest(planDetails?.plan_code);
            if (spToWpResp?.status === 200 || spToWpResp?.data?.status) {
              showSnackMessage(
                spToWpResp?.data?.message,
                SNACK_VARIANT.SUCCESS,
                spToWpResp
              );
              setTimeout(() => {
                history.push(dashboardUrl);
              }, 1000);
            } else {
              showSnackMessage(
                spToWpResp?.data?.message,
                SNACK_VARIANT.ERROR,
                spToWpResp
              );
            }
          } catch (error) {
            showSnackMessage(
              error?.response?.data?.message,
              SNACK_VARIANT.ERROR,
              error?.response
            );
          }
          break;

        default:
          break;
      }
    }
    setSaveConfirmationModal(false);
  };

  const hideMatchWithOption = false;

  const handleDisplayNameChange = (e) => {
    if ((e.target.value || "").trim().length === 0) {
      setPlanDisplayNameError(true);
    } else {
      setPlanDisplayNameError(false);
    }
    setPlanDisplayName(e.target.value);
  };

  const handleDisplayNameEdit = async () => {
    const response = await props.editBudgetTablePlanDisplayName({
      plan_display_name: trimPlanDisplayName,
      plan_code: planDetails?.plan_code,
    });

    if (response.status) {
      setIsDisplayNameEdit(false);
      setPlanDetails((prevPlanDetails) => {
        return {
          ...prevPlanDetails,
          plan_display_name: trimPlanDisplayName,
        };
      });
    }
  };

  const handleDisplayNameEditClick = () => {
    setIsDisplayNameEdit(true);
    if (planDisplayName.length === 0) {
      setPlanDisplayName(planDetails?.plan_display_name);
    }
  };

  const handleEopBopSync = (value) => {
    updateEopBopSyncValueReq(planDetails.plan_code, value, () => {
      setPlanDetails({
        ...planDetails,
        eoh_boh_sync: value,
      });
    });
  };

  return (
    <>
      {planDetails ? (
        <>
          <div className={classes.planDetailsHeader}>
            <div className={classes.planDetailsWrapper}>
              <div className={classes.planNameWrapper}>
                <div className={classes.planDetails}>
                  {isDisplayNameEdit ? (
                    <>
                      <TextField
                        variant="outlined"
                        value={planDisplayName}
                        onChange={handleDisplayNameChange}
                        disabled={props.plansmartPlanDisplayNameEditLoader}
                        error={planDisplayNameError}
                        inputProps={{ maxLength: 64 }}
                      />

                      <Button
                        className={`${plansmartClasses.plansmartIconButton} small-icon`}
                        variant="contained"
                        id="plansmartEditDisplayNameButton"
                        onClick={() => handleDisplayNameEdit()}
                        disabled={
                          props.plansmartPlanDisplayNameEditLoader ||
                          trimPlanDisplayName ===
                            planDetails?.plan_display_name ||
                          trimPlanDisplayName.length === 0
                        }
                      >
                        {props.plansmartPlanDisplayNameEditLoader ? (
                          <CircularProgress size="1rem" color="primary" />
                        ) : (
                          <CheckOutlinedIcon />
                        )}
                      </Button>
                      <Button
                        className={`${plansmartClasses.plansmartIconButton} small-icon`}
                        variant="contained"
                        id="plansmartEditDisplayNameButton"
                        onClick={() => setIsDisplayNameEdit(false)}
                      >
                        <CloseOutlinedIcon />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span id="plan_name" className="plan_display_name">
                        {planDetails?.plan_display_name ||
                          planDetails?.name.slice(0, 64)}
                      </span>
                      <Button
                        className={`${plansmartClasses.plansmartIconButton} small-icon`}
                        variant="outlined"
                        id="plansmartEditDisplayNameButton"
                        onClick={() => handleDisplayNameEditClick()}
                        disabled={!planBudgetData?.length}
                      >
                        <EditOutlinedIcon />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {!pivotViewMode ? (
              <div className={plansmartClasses.alignButtons}>
                {!viewMode && (
                  <Tooltip
                    text={`BOH and EOH flow sync ${
                      eohBohSync ? "enabled" : "disabled"
                    }`}
                    placement="top"
                  >
                    <Switch
                      checked={eohBohSync}
                      onChange={() => handleEopBopSync(!eohBohSync)}
                      id="syncBohAndEoh"
                      leftLabel={
                        planSmartUpdateEopBopSyncLoader ? (
                          <Spinner
                            size="xs"
                            className={plansmartClasses.bopEohSyncSpinner}
                          />
                        ) : null
                      }
                      disabled={planSmartUpdateEopBopSyncLoader}
                    />
                  </Tooltip>
                )}
                {!skuViewMode && (
                  <>
                    {!hideMatchWithOption && !viewMode && (
                      <ArrowTooltips title="Match with" placement="top">
                        <Button
                          className={plansmartClasses.plansmartIconButton}
                          variant="outlined"
                          id="plansmartMatchWithBtn"
                          onClick={openMatchWith}
                          color="primary"
                        >
                          <MatchWithIcon viewBox="0 0 20 20" />
                        </Button>
                      </ArrowTooltips>
                    )}
                    {showEnablePivot && (
                      <Button
                        variant="outlined"
                        id="plansmartImportPlanBtn"
                        onClick={() => {
                          // props.updateBudgetTable();
                          handlePivotView(true);
                        }}
                      >
                        Enable Pivot
                      </Button>
                    )}
                    <ArrowTooltips title="Add versions" placement="top">
                      <Button
                        className={plansmartClasses.plansmartIconButton}
                        variant="contained"
                        id="plansmartAddVersionButton"
                        onClick={() => setComparePlanModal(true)}
                        disabled={!planBudgetData?.length}
                      >
                        <AddVersions viewBox="0 0 20 20" />
                      </Button>
                    </ArrowTooltips>
                    <ArrowTooltips title="Recalculate" placement="top">
                      <Button
                        className={plansmartClasses.plansmartIconButton}
                        variant="contained"
                        id="plansmartRecalculateButton"
                        onClick={() => setShowTargetOptimizationModal(true)}
                        disabled={!planBudgetData?.length}
                        color="primary"
                      >
                        <CalculateIcon />
                      </Button>
                    </ArrowTooltips>
                  </>
                )}
                {updatedSaveAsList.length > 0 &&
                  updatedSaveAsList.map((saveAsData) => (
                    <Button
                      variant="contained"
                      color="primary"
                      id={saveAsData.label}
                      onClick={() => handleSaveAsOption(saveAsData)}
                    >
                      {saveAsData.label}
                    </Button>
                  ))}
                <ArrowTooltips title="Download" placement="top">
                  <Button
                    className={`${plansmartClasses.plansmartIconButton}`}
                    id="plansmartPlanningScreenDownloadButton"
                    variant="contained"
                    color="primary"
                    title={"Download planTable Data"}
                    onClick={() => {
                      setDownloadModal(true);
                    }}
                  >
                    <DownloadIcon />
                  </Button>
                </ArrowTooltips>
              </div>
            ) : (
              pivotViewComponent
            )}
          </div>

          <Prompt
            isOpen={saveConfirmationModal}
            title={
              <Box display="flex" alignItems="center">
                <WarningAmberIcon color="warning" />
                <Box ml={1}>Warning</Box>
              </Box>
            }
            subHeading={saveAsWarningMsgFn(planDetails?.status)}
            infoList={[]}
            primaryButtonProps={{
              children: "Yes",
              onClick: () => {
                handleConfirmationModal(true);
                setSaveConfirmationModal(false);
              },
            }}
            tertiaryButtonProps={{
              children: "No",
              onClick: () => setSaveConfirmationModal(false),
            }}
          />
        </>
      ) : null}
    </>
  );
};

const mapState = (state) => {
  return {
    saveScenarioNameLoader: planSmartSaveScenarioNameLoaderSelector(state),
    plansmartPlanDisplayNameEditLoader: plansmartPlanDisplayNameEditLoaderSelector(
      state
    ),
    planSmartUpdateEopBopSyncLoader: planSmartUpdateEopBopSyncLoaderSelector(
      state
    ),
  };
};

const mapDispatch = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    saveScenarioNameReq: (scenarioName, planCode, successCallBackFn) =>
      dispatch(saveScenarioNameApi(scenarioName, planCode, successCallBackFn)),
    savePlanRequest: (planCode) => dispatch(savePlanAPI(planCode)),
    editBudgetTablePlanDisplayName: (payload) =>
      dispatch(editPlanDisplayName(payload)),
    updateEopBopSyncValueReq: (planCode, eopBopSync, successCallBack) =>
      dispatch(updateEopBopSyncValue(planCode, eopBopSync, successCallBack)),
  };
};

export default connect(mapState, mapDispatch)(PlanBudgetFilter);
