import PropTypes from "prop-types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { bindActionCreators } from "redux";
import { ActionCreators } from "redux-undo";
import { Button, Switch, Spinner, Prompt } from "impact-ui";
import { get, isEmpty } from "lodash";
import { CircularProgress } from "@mui/material";
import { connect, useDispatch, useSelector } from "react-redux";
import { addSnack } from "actions/snackbarActions";
import { useHistory } from "react-router";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { SNACK_VARIANT } from "constants/toast.constant";
import * as actions from "./slice/planningScreen.slice";
import * as apis from "./apis/planningScreen.api";
import * as eohBohSyncApis from "./apis/eohBohSync.api.js";
import * as dashboard from "../CommonDashboard/dashboard.slice.js";
import {
  setPlanSmartAlertModal,
  setPlanSmartLogoutStatus
} from "core/actions/sideBarActions";

import { HOME_ROUTE } from "constants/route.constant";
import BudgetTable from "./components/BudgetTable/BudgetTable";
import EohBohIcon from "assets/eohBoh.svg";
import ContentDensityIcon from "assets/contentDensity.svg";
import RightArrow from "assets/rightArrow.svg";
import ContentDensityDefault from "assets/cntDenDefault.svg";
import ContentDensityCompact from "assets/cntDenCompact.svg";
import ContentDensityComfort from "assets/cntDenComfort.svg";
import DownloadCurrent from "assets/downloadCurrent.svg";
import DownloadEntire from "assets/downloadEntire.svg";
import RecalculateIcon from "assets/recalculate.svg";
import AddVersionDropdownIcon from "assets/addVersionDropdown.svg";
import RefreshIcon from "assets/refresh.svg";
import DownloadIcon from "assets/dropdownDownload.svg";
import MenuIcon from "assets/menuIcon.svg";
import MatchWith from "assets/matchWith.svg";
import UndoIcon from "assets/undoNew.svg";
import ResetIcon from "assets/resetNew.svg";
import "./PlanningScreen.css";
import PlanNameEdit from "./components/PlanNameEdit/PlanNameEdit.jsx";
import MockBudgetTable from "./components/BudgetTable/MockBudgetTable";
import CustomActionButton from "../../components/Impact/CustomActionButton/CustomActionButton.jsx";
import Recalculate from "./components/Recalculate/Recalculate";
import MatchWpWith from "./components/MatchWith/MatchWith";
import AddHideVersionModal from "./components/AddHideVersions/AddHideVersionModal";
import useWorker from "../../hooks/useWorker.js";
import "./workers/calculation.worker.js";
import {
  PLAN_LOCK_MESSAGE,
  calcOnServer,
  RESET_WARNING_MESSAGE,
  TARGET_PLAN_STATUS_CODES
} from "./planningScreen.constant.js";
import getPlanningScreenSeasonType from "../../utils/getPlanningScreenSeasonType.util.js";
import SaveAsWpModal from "./components/SaveAsWP/SavePlan.jsx";
import { PLANS_LIST_STATUS_VALUE } from "./components/SaveAsWP/savePlan.constant.js";
import { resetBudgetTable } from "./planningScreen.util.js";
import { getButtonName } from "./components/SaveAsWP/savePlan.util";
import TableSettingsPopover from "./components/TableSettingsPopover/TableSettingsPopover";
import EohBohSyncConfirmModal from "./components/EohBohSyncConfirmModal/EohBohSyncConfirmModal.jsx";
import redrawBudgetTable from "../../utils/redrawBudgetTable.util.js";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import ButtonDropdown from "./components/ButtonDropdown/ButtonDropdown.jsx";
import CustomPopover from "./components/ButtonDropdown/CustomPopover.jsx";
import SettingsIcon from "assets/settingsIcon.svg";
import { TENANT } from "config/api";
import { TENANT_MAPPING } from "config/constants";

import * as downloadApis from "components/planSmart/downloadPlan/downloadPlanModal.api";
import { DOWNLOAD_PLAN_LABEL } from "components/planSmart/downloadPlan/downloadPlanModal.constant";
import {
  getParams,
  getHierarchyValuesForDownloadPlan
} from "components/planSmart/downloadPlan/downloadPlanModal.utils";
import UpdatePlanConfirmationModal from "./components/ConfirmationModal/ConfirmationModal.jsx";
import Loader from "./components/Loader/Loader.jsx";
import { getPlanningScreenBreadCrumbsDetails } from "./planningScreen.util";
import * as budgetTableApi from "./components/BudgetTable/apis/budgetTable.api";
import ViewManagementController from "../ViewManagement/ViewManagementController.jsx";
import {
  setActiveViewMetricsData,
  showViewManagementSelector,
  currentViewsListSelector,
  activeViewDetailsSelector,
  activeViewSettingsSelector,
  activeViewShowOrHideMetricsDataSelector
} from "../ViewManagement/viewManagement.slice.js";
import { applyTableSettings } from "../ViewManagement/components/TableSettings/tableSettings.util.js";

function PlanningScreen(props) {
  const {
    getPlanDetails,
    productHierarchy,
    planDetailsLoader,
    setPlanningScreenEditMode,
    planDetail,
    executePlanUpdate,
    updatePlanLoader,
    trackBudgetTableChanges,
    getKpiConfig,
    getKpiConfigV2,
    getPlanActualizedWeeks,
    planActualizedWeeksLoader,
    kpiConfigLoader,
    kpiConfigV2Loader,
    getFormula,
    formulaLoader,
    savePlanLoader,
    fetchShowHideData,
    lockedCells,
    setLockedCells,
    setTrackBudgetTableChanges,
    initialBudgetTableResp,
    setBudgeTableRowData,
    eohBohSync,
    updateEohBohSync,
    getBudgetTableData,
    updateEohBohSyncLoader,
    undoAction,
    reducerPastLength,
    checkBohSyncRequired,
    checkBohSyncRequiredLoader,
    budgetTableLoader,
    showHideMetricLoader,
    matchWithKpiUpdateLoader,
    resetPlanningScreen,
    addSnack,
    getWrittenTwoDeliveryDetails,
    downloadPlanReq,
    varianceList,
    planKpiConfig,
    hierarchyLevels,
    setIsDownloadPlanVisible,
    calculationUUID,
    setCalculationUUID,
    isEditActionsEnabled,
    budgetTableUndoApi,
    EohBohSyncAction,
    budgetTableResetApi,
    isWrittenKpiEdited,
    showViewManagement,
    activeViewDetails,
    currentViewsList,
    setBudgetShowHideMetricsData,
    currentVersion,
    versionVarianceMap,
    setIsSnackDispatched,
    planKpiConfigV2
  } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const history = useHistory();
  //TODO: REMOVE IN SP 63
  const isTargetPlan = (location?.pathname || "").includes("target-plan");
  const planCode = get(props, "match.params.planCode", null);
  const viewType = get(props, "match.params.viewType", false);
  const mock = get(props, "match.params.mock", false);
  const showBudgetTable =
    !formulaLoader && !kpiConfigLoader && !kpiConfigV2Loader;
  const editMode = viewType === "edit";

  const {
    dashboardRedirectionUrl,
    label,
    seasonType
  } = getPlanningScreenBreadCrumbsDetails(planDetail?.status);

  const labels = [
    {
      labelType: "icon",
      to: HOME_ROUTE
    },
    {
      label: label,
      to: dashboardRedirectionUrl
    }
  ];

  const dispatch = useDispatch();
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showTableSettings, setShowTableSettings] = useState(false);
  const [showMatchWithPanel, setShowMatchWithPanel] = useState(false);
  const [saveConfirmationModal, setSaveConfirmationModal] = useState(false);
  const [gridSettings, setGridSettings] = useState([]);
  const [openPopover, setOpenPopover] = useState(false);
  const [openCntDensityPopup, setOpenCntDensityPopup] = useState(false);
  const [openDownloadPopup, setOpenDownloadPopup] = useState(false);
  const [isDownloadDisabled, setIsDownloadDisabled] = useState(false);
  const [isCancelButtonDisabled, setIsCancelButtonDisabled] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [logoutAlert, setLogoutAlert] = useState({});
  const [showCustomPopUp, setShowCustomPopUp] = useState(false);
  const [showViewsList, setShowViewsList] = useState(false);

  const [calculationWorker] = useWorker("calculation.worker.js");
  const tableRef = useRef(null);
  const tableSettingButtonRef = useRef(null);
  const tableRowDataRef = useRef([]);
  const initialTableRowDataRef = useRef([]);
  const buttonDropdownRef = useRef(null);
  const cntDensityRef = useRef(null);
  const downloadRef = useRef(null);
  const calculationUUIDRef = useRef(null);

  const lockedCellsRef = useRef(props.lockedCells);
  lockedCellsRef.current = props.lockedCells;
  calculationUUIDRef.current = calculationUUID;
  const [isUndo, setIsUndo] = useState(false);

  const tableSettingsData = useSelector(activeViewSettingsSelector);
  const showHideMetricData = useSelector(
    activeViewShowOrHideMetricsDataSelector
  );

  const canUndo = reducerPastLength > 5;
  const showEohBohButton = true;
  const dropdownButtons = [
    {
      name: "BOH & EOH Sync",
      startIcon: EohBohIcon,
      endComponent: !showEohBohButton && (
        <Switch
          checked={eohBohSync}
          onChange={() => handleEopBopSync()}
          id="syncBohAndEoh"
          leftLabel={
            updateEohBohSyncLoader ? (
              <Spinner size="xs" className={"bohEohSpinner"} />
            ) : null
          }
          disabled={updateEohBohSyncLoader}
        />
      ),
      buttonStyle: {
        borderBottom: "1px solid #EEF0F7"
      }
    },
    {
      name: "Add Version",
      startIcon: AddVersionDropdownIcon,
      action: () => setShowVersionModal(true)
    },
    {
      name: "Chester Refresh",
      startIcon: RefreshIcon
    },
    {
      name: "Content Density",
      startIcon: ContentDensityIcon,
      isMenuButton: true,
      menuRef: cntDensityRef,
      show: openCntDensityPopup,
      setShow: setOpenCntDensityPopup,
      menuButtons: [
        { name: "Default", startIcon: ContentDensityDefault },
        { name: "Compact", startIcon: ContentDensityCompact },
        { name: "Comfort", startIcon: ContentDensityComfort }
      ],
      menuPosition: { top: 0, left: -125 },
      endComponent: (
        <p style={{ display: "flex", alignItems: "center" }}>
          <RightArrow />
        </p>
      )
    },
    {
      name: "Download",
      startIcon: DownloadIcon,
      action: () => {
        dispatch(actions.setIsDownloadPlanVisible(true));
      },
      isMenuButton: true,
      menuRef: downloadRef,
      show: openDownloadPopup,
      setShow: setOpenDownloadPopup,
      menuButtons: [
        {
          name: "Current page",
          startIcon: DownloadCurrent,
          action: () => {
            handleDownload(DOWNLOAD_PLAN_LABEL.THIS_PAGE);
            setOpenPopover(false);
          }
        }
        // {
        //   name: "Entire plan",
        //   startIcon: DownloadEntire,
        //   action: () => {
        //     handleDownload(DOWNLOAD_PLAN_LABEL.ENTIRE);
        //     setOpenPopover(false);
        //   }
        // }
      ],
      menuPosition: { top: 0, left: -152 },
      endComponent: (
        <p style={{ display: "flex", alignItems: "center" }}>
          <RightArrow />
        </p>
      )
    }
  ];

  useEffect(() => {
    dispatch(setIsSnackDispatched(false));
    dispatch(
      setPlanSmartAlertModal(
        Object.keys(trackBudgetTableChanges || []).length > 0
      )
    );
    addBeforeUnloadListener(false);
    history.block(({ pathname }) => {
      if (trackBudgetTableChanges?.length > 0) {
        setBlocked(true);
        setShowConfirmationModal(true);
        removeBeforeUnloadListener();
        return false;
      }
      return true;
    });
  }, [trackBudgetTableChanges]);

  // handler function for page reload and tab close
  const handleTabClose = (event) => {
    if (Object.keys(trackBudgetTableChanges || []).length > 0) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  const addBeforeUnloadListener = (isOnce) => {
    window.addEventListener("beforeunload", handleTabClose, {
      capture: true,
      once: isOnce
    });
  };
  const removeBeforeUnloadListener = () => {
    window.removeEventListener("beforeunload", handleTabClose, {
      capture: true
    });
  };
  const getDropdownButtons = () => {
    return TENANT.toLocaleLowerCase() === TENANT_MAPPING.ARHAUS
      ? TARGET_PLAN_STATUS_CODES.includes(planDetail?.status)
        ? dropdownButtons.filter(
            (obj) =>
              obj.name !== "BOH & EOH Sync" &&
              obj.name !== "Chester Refresh" &&
              obj.name !== "Content Density" &&
              obj.name !== "Add Version"
          )
        : dropdownButtons.filter(
            (obj) =>
              obj.name !== "BOH & EOH Sync" &&
              obj.name !== "Chester Refresh" &&
              obj.name !== "Content Density"
          )
      : dropdownButtons;
  };

  const downloadPlanCallback = () => {
    setIsDownloadPlanVisible(false);
  };

  /**
   * Exports plan data based on the selected download option.
   * @example
   * downloadPlanData(DOWNLOAD_PLAN_LABEL.THIS_PAGE)
   * // Successfully downloaded.
   * @param {string} groupValue - Specifies the download option, either 'THIS_PAGE' or 'ENTIRE'.
   * @returns {void} No return value.
   * @description
   *   - Uses different functions to download data based on the page or the entire plan.
   *   - Displays a success message after downloading the current page CSV.
   *   - Sends a specific payload for full plan download request.
   */
  const handleDownload = (groupValue) => {
    if (groupValue === DOWNLOAD_PLAN_LABEL.THIS_PAGE) {
      tableRef.current.api.exportDataAsCsv(
        getParams({ planKpiConfig, varianceList, planKpiConfigV2 })
      );
      setIsDownloadPlanVisible(false);
      addSnack({
        message: "Successfully downloaded.",
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      });
    } else if (groupValue === DOWNLOAD_PLAN_LABEL.ENTIRE) {
      const payload = {
        source: "client",
        plan_code: planCode,
        aggregated_single_sheet: false,
        filters: getHierarchyValuesForDownloadPlan(hierarchyLevels, planDetail)
      };
      downloadPlanReq(
        payload,
        downloadPlanCallback,
        setIsDownloadDisabled,
        setIsCancelButtonDisabled
      );
    }
  };

  const handleUndo = () => {
    if (calcOnServer()) {
      const payload = {
        planCode,
        session_id: calculationUUIDRef.current,
        module: "pre-season"
      };
      budgetTableUndoApi(payload, dispatch, tableRowDataRef.current, tableRef);
    } else {
      dispatch(undoAction());
      setIsUndo(true);
      redrawBudgetTable({ tableRef });
    }
  };

  const handleResetCallback = () => {
    applyTableSettings({
      currentVersion,
      showHideMetricsData: showHideMetricData,
      settings: tableSettingsData,
      setActiveViewMetricsData: dispatchSetActiveViewMetricsData,
      setGridSettings,
      setTableShowHideMetricsData: dispatchSetTableShowHideMetricsData,
      tableRef,
      versionVarianceMap
    });
  };

  const handleReset = () => {
    setShowCustomPopUp(false);
    dispatch(actions.setIsEditActionsEnabled(false));
    if (calcOnServer()) {
      const payload = {
        planCode,
        session_id: calculationUUIDRef.current,
        module: "pre-season"
      };
      budgetTableResetApi(
        payload,
        dispatch,
        tableRowDataRef.current,
        tableRef,
        handleResetCallback
      );
    } else {
      resetBudgetTable(
        setLockedCells,
        setTrackBudgetTableChanges,
        setBudgeTableRowData,
        initialBudgetTableResp.data_row
      );
      redrawBudgetTable({ tableRef });
    }
  };

  useEffect(() => {
    setCalculationUUID(null);
    dispatch(actions.setIsRecalculatePanelOpen(false));

    if (viewType === "edit" || viewType === "view") {
      setPlanningScreenEditMode(viewType === "edit");
    }

    if (!mock) {
      getKpiConfig(planCode);
      getKpiConfigV2(planCode);
    }

    getPlanActualizedWeeks(planCode).then(() => {
      fetchShowHideData(planCode, mock);

      if (productHierarchy?.length > 0 && planCode >= 0) {
        const planDetailSuccessCallBack = (planDetailsResp) => {
          // THE STATUS CODE 2 & 4 is checked if the plan is scenario plan or scenario forecast
          if (
            ![2, 3].includes(planDetailsResp?.status) &&
            planDetailsResp?.is_locked &&
            editMode
          ) {
            addSnack({
              message: PLAN_LOCK_MESSAGE,
              options: {
                variant: SNACK_VARIANT.ERROR
              }
            });
            setTimeout(() => {
              navigate(window.history.back());
            }, 1000);
          }
          if (planDetailsResp.eoh_boh_sync && editMode) {
            checkBohSyncRequired();
          }

          getBudgetTableData(mock, { setShowViewsList: setShowViewsList });
        };

        getPlanDetails(planCode, planDetailSuccessCallBack);
      }
    });

    return () => {
      dispatch(actions.setIsEditActionsEnabled(false));
      dispatch(resetPlanningScreen());
      // Added below line to reset the state when user navigates to different page
      dispatch(ActionCreators.jumpToPast(0));
      resetBudgetTable(
        setLockedCells,
        setTrackBudgetTableChanges,
        setBudgeTableRowData,
        []
      );
      removeBeforeUnloadListener();
      dispatch(setPlanSmartLogoutStatus({ status: false, cb: () => {} }));
    };
  }, [productHierarchy]);

  useEffect(() => {
    if (seasonType) {
      getFormula(seasonType);
    }
  }, [planDetail]);

  useEffect(() => {
    setLogoutAlert({ ...props.logoutAlertStatus });
  }, [props.logoutAlertStatus]);

  const planName = planDetail?.plan_display_name
    ? planDetail?.plan_display_name
    : planDetail?.name?.slice(0, 64);

  const planStatus = planDetail?.status;

  const isViewManagementDisabled = useMemo(() => {
    return isEmpty(activeViewDetails) && (currentViewsList?.length ?? 0) > 0;
  }, [activeViewDetails, currentViewsList]);

  const handleEopBopSync = () => {
    updateEohBohSync(!eohBohSync);
  };

  const isDisabled = () => {
    return (
      updatePlanLoader ||
      !trackBudgetTableChanges ||
      trackBudgetTableChanges?.length === 0
    );
  };

  const isUpdateDisabledDueToUndo = () => {
    return !isEditActionsEnabled;
  };

  const handleEohBohSyncAction = () => {
    const tableRows = get(tableRowDataRef, "current", []) || [];

    //payload
    const payload = {
      planCode: planDetail?.plan_code,
      module: seasonType,
      lockedCells: lockedCellsRef.current,
      session_id: calculationUUIDRef.current,
      trackBudgetTableChanges: [],
      columnDefs: [],
      isWrittenKpiEdited: isWrittenKpiEdited
    };
    EohBohSyncAction(payload, tableRef, tableRows);
  };

  const dispatchSetActiveViewMetricsData = (data) =>
    dispatch(setActiveViewMetricsData(data));
  const dispatchSetTableShowHideMetricsData = (data) =>
    dispatch(setBudgetShowHideMetricsData(data));

  const viewDetailsApplyCallback = (settingsData, metricData) => {
    applyTableSettings({
      currentVersion,
      showHideMetricsData: metricData,
      settings: settingsData,
      setActiveViewMetricsData: dispatchSetActiveViewMetricsData,
      setGridSettings,
      setTableShowHideMetricsData: dispatchSetTableShowHideMetricsData,
      tableRef,
      versionVarianceMap
    });
    // dispatch(setBudgetShowHideMetricsData(metricData));
  };

  const activeViewtableSettingsData = useSelector(activeViewSettingsSelector);
  const activeViewMetricsData = useSelector(
    activeViewShowOrHideMetricsDataSelector
  );

  const activeViewApplyCallback = () => {
    applyTableSettings({
      currentVersion,
      showHideMetricsData: activeViewMetricsData,
      settings: activeViewtableSettingsData,
      setActiveViewMetricsData: dispatchSetActiveViewMetricsData,
      setGridSettings,
      setTableShowHideMetricsData: dispatchSetTableShowHideMetricsData,
      tableRef,
      versionVarianceMap
    });
  };

  return (
    <Loader
      loader={
        planDetailsLoader ||
        checkBohSyncRequiredLoader ||
        budgetTableLoader ||
        showHideMetricLoader ||
        matchWithKpiUpdateLoader ||
        updatePlanLoader ||
        kpiConfigV2Loader ||
        planActualizedWeeksLoader
      }
    >
      <div className="planningScreenContainer">
        <div className="planningScreenHeader">
          <PlanNameEdit labels={labels} />
          <div className="planningScreenInfoContainer">
            {!!(lockedCells && Object.keys(lockedCells).length) && (
              <div className="planningScreenLockInfo">
                <LockOutlinedIcon className="planningScreenLockInfoIcon" />
                <span className="planningScreenLockInfoText">
                  There are locked cells in the workbook
                </span>
              </div>
            )}
          </div>
          <div className="planningScreenActionContainer">
            {trackBudgetTableChanges?.length > 0 && blocked && (
              <UpdatePlanConfirmationModal
                showUpdatePlanAlert={showConfirmationModal}
                onSubmit={() => {
                  executePlanUpdate();
                  setShowConfirmationModal(false);
                  setBlocked(false);
                }}
                onClose={() => {
                  resetBudgetTable(
                    setLockedCells,
                    setTrackBudgetTableChanges,
                    setBudgeTableRowData,
                    initialBudgetTableResp.data_row
                  );
                  setShowConfirmationModal(false);
                  addBeforeUnloadListener(true);
                }}
              />
            )}
            {logoutAlert?.status && (
              <UpdatePlanConfirmationModal
                showUpdatePlanAlert={logoutAlert?.status}
                onSubmit={() => {
                  executePlanUpdate();
                  setLogoutAlert({ status: false, cb: () => {} });
                }}
                onClose={() => {
                  resetBudgetTable(
                    setLockedCells,
                    setTrackBudgetTableChanges,
                    setBudgeTableRowData,
                    initialBudgetTableResp.data_row
                  );
                  setLogoutAlert({ status: false, cb: () => {} });
                }}
              />
            )}
            {editMode &&
              !TARGET_PLAN_STATUS_CODES.includes(planDetail?.status) && (
                <Button
                  className="customActionButton"
                  variant="primary"
                  onClick={handleEohBohSyncAction}
                  disabled={
                    !!budgetTableLoader || calcOnServer() ? false : isDisabled()
                  }
                >
                  Sync
                </Button>
              )}
            {showViewManagement && showViewsList && showBudgetTable && (
              <ViewManagementController
                isViewManagementDisabled={isViewManagementDisabled}
                setGridSettings={setGridSettings}
                setShowHideMetricsDataAction={
                  dispatchSetTableShowHideMetricsData
                }
                tableRef={tableRef}
                viewDetailsApplyCallback={viewDetailsApplyCallback}
              />
            )}
            {editMode && (
              <CustomActionButton
                icon={() => <MatchWith />}
                onClick={() => setShowMatchWithPanel(true)}
                tooltipText="Match with"
              />
            )}
            {!TARGET_PLAN_STATUS_CODES.includes(planDetail?.status) &&
              editMode && (
                <CustomActionButton
                  icon={() => <RecalculateIcon />}
                  onClick={() =>
                    dispatch(actions.setIsRecalculatePanelOpen(true))
                  }
                  tooltipText="Recalculate"
                />
              )}
            <CustomPopover
              show={openPopover}
              setShow={setOpenPopover}
              triggerRef={buttonDropdownRef}
              triggerElement={
                <CustomActionButton
                  domRef={buttonDropdownRef}
                  icon={() => <MenuIcon />}
                  tooltipText="More"
                />
              }
              tooltip={true}
            >
              <ButtonDropdown
                dropdownButtons={[...getDropdownButtons()]}
                setPopover={setOpenPopover}
              />
            </CustomPopover>
            {editMode && (
              <>
                <hr className="splitDivider" />

                <CustomActionButton
                  icon={() => <UndoIcon />}
                  tooltipText="Undo"
                  onClick={handleUndo}
                  disabled={!isEditActionsEnabled}
                />
                <CustomActionButton
                  icon={() => <ResetIcon />}
                  onClick={() => setShowCustomPopUp(true)}
                  // disabled={isDisabled()}
                  tooltipText="Reset"
                  disabled={!isEditActionsEnabled}
                />
                <Prompt
                  isOpen={showCustomPopUp}
                  title="Confirmation"
                  subHeading={RESET_WARNING_MESSAGE}
                  primaryButtonProps={{
                    children: "Reset",
                    onClick: () => {
                      handleReset();
                    }
                  }}
                  tertiaryButtonProps={{
                    children: "Cancel",
                    onClick: () => {
                      setShowCustomPopUp(false);
                    }
                  }}
                />
                <Button
                  className="customActionButton"
                  variant="primary"
                  onClick={() => executePlanUpdate(calculationUUIDRef)}
                  disabled={
                    calcOnServer() ? isUpdateDisabledDueToUndo() : isDisabled()
                  }
                  icon={
                    updatePlanLoader
                      ? () => <CircularProgress size="1rem" />
                      : null
                  }
                >
                  Update
                </Button>
              </>
            )}
            {(planStatus === PLANS_LIST_STATUS_VALUE.SCENARIO_PLAN ||
              planStatus === PLANS_LIST_STATUS_VALUE.SCENARIO_FORECAST) && (
              <Button
                className="customActionButton"
                variant="primary"
                disabled={savePlanLoader}
                onClick={() => setSaveConfirmationModal(true)}
                icon={
                  savePlanLoader ? () => <CircularProgress size="1rem" /> : null
                }
              >
                {getButtonName(planStatus)}
              </Button>
            )}
          </div>
        </div>
        {mock ? (
          <MockBudgetTable
            calculationWorker={calculationWorker}
            tableRef={tableRef}
            tableRowDataRef={tableRowDataRef}
            initialTableRowDataRef={initialTableRowDataRef}
            viewType={viewType}
            lockedCellRef={lockedCellsRef}
            editMode={editMode}
          />
        ) : (
          showBudgetTable && (
            <BudgetTable
              calculationWorker={calculationWorker}
              tableRef={tableRef}
              tableRowDataRef={tableRowDataRef}
              initialTableRowDataRef={initialTableRowDataRef}
              viewType={viewType}
              lockedCellRef={lockedCellsRef}
              isTargetPlan={isTargetPlan}
              seasonType={seasonType}
              gridSettings={gridSettings}
              setGridSettings={setGridSettings}
              editMode={editMode}
              calculationUUIDRef={calculationUUIDRef}
              tableLoader={
                budgetTableLoader ||
                updatePlanLoader ||
                matchWithKpiUpdateLoader
              }
              isUndo={isUndo}
            />
          )
        )}

        <Recalculate
          planCode={planCode}
          planStatus={planStatus}
          tableRowDataRef={tableRowDataRef}
          tableRef={tableRef}
        />
        {showVersionModal && (
          <AddHideVersionModal
            planName={planName}
            planCode={planCode}
            showVersionModal={showVersionModal}
            setShowVersionModal={setShowVersionModal}
            setGridSettings={setGridSettings}
            tableRef={tableRef}
          />
        )}
        <TableSettingsPopover
          show={showTableSettings}
          tableRef={tableRef}
          tableSettingButtonRef={tableSettingButtonRef}
          setShowTableSettings={setShowTableSettings}
          setGridSettings={setGridSettings}
        />
        {showMatchWithPanel && (
          <MatchWpWith
            showMatchWithPanel={showMatchWithPanel}
            setShowMatchWithPanel={setShowMatchWithPanel}
            setShowViewsList={setShowViewsList}
            activeViewApplyCallback={activeViewApplyCallback}
          />
        )}
        {saveConfirmationModal && (
          <SaveAsWpModal
            saveConfirmationModal={saveConfirmationModal}
            setSaveConfirmationModal={setSaveConfirmationModal}
            planCode={planCode}
            navigate={navigate}
            planStatus={planStatus}
          />
        )}
      </div>
      <EohBohSyncConfirmModal />
    </Loader>
  );
}

const mapState = (state) => {
  return {
    productHierarchy: actions.productHierarchySelector(state),
    planDetailsLoader: actions.planDetailsLoaderSelector(state),
    planDetail: actions.planDetailsSelector(state),
    updatePlanLoader: actions.updatePlanLoaderSelector(state),
    trackBudgetTableChanges: actions.trackBudgetTableChangesSelector(state),
    kpiConfigLoader: actions.kpiConfigLoaderSelector(state),
    kpiConfigV2Loader: actions.kpiConfigV2LoaderSelector(state),
    planActualizedWeeksLoader: actions.planActualizedWeeksLoaderSelector(state),
    formulaLoader: actions.formulaLoaderSelector(state),
    savePlanLoader: actions.savePlanLoaderSelector(state),
    initialBudgetTableResp: actions.initialBudgetTableRespSelector(state),
    eohBohSync: actions.eohBohSyncSelector(state),
    updateEohBohSyncLoader: actions.updateEohBohSyncLoaderSelector(state),
    lockedCells: actions.lockedCellsSelector(state),
    reducerPastLength: state.plansmartReducer.planningScreen.past.length,
    checkBohSyncRequiredLoader: actions.checkBohSyncRequiredLoaderSelector(
      state
    ),
    budgetTableLoader: actions.budgetTableLoaderSelector(state),
    showHideMetricLoader: actions.showHideMetricLoaderSelector(state),
    matchWithKpiUpdateLoader: actions.matchWithKpiUpdateLoaderSelector(state),
    planKpiConfig: actions.planKpiConfigSelector(state),
    varianceList: actions.varianceListSelector(state),
    hierarchyLevels: actions.productHierarchySelector(state),
    isDownloadPlanVisible: actions.downloadPlanVisibleSelector(state),
    logoutAlertStatus: get(state, "sideBarReducer.logoutAlertStatus"),
    isUpdatePlanEnabled: actions.isUpdatePlanEnabledSelector(state),
    isEditActionsEnabled: actions.isEditActionsEnabledSelector(state),
    calculationUUID: actions.calculationUUIDSelector(state),
    isWrittenKpiEdited: actions.isWrittenKpiEditedSelector(state),
    tableViewData:
      state?.plansmartReducer?.tableViewConfigurationData?.tableViewConfigData,
    viewSelected:
      state?.plansmartReducer?.tableViewConfigurationData?.selectedViewName,
    showViewManagement: showViewManagementSelector(state),
    currentViewsList: currentViewsListSelector(state),
    activeViewDetails: activeViewDetailsSelector(state),
    currentVersion: actions.currentVersionSelector(state),
    versionVarianceMap: actions.varianceVersionMappingSelector(state),
    versionVarianceMap: actions.varianceVersionMappingSelector(state),
    planKpiConfigV2: actions.planKpiConfigV2Selector(state)
  };
};

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators(
      {
        ...actions,
        ...apis,
        ...dashboard,
        ...eohBohSyncApis,
        ...downloadApis,
        ...budgetTableApi,
        addSnack
      },
      dispatch
    )
  };
};

PlanningScreen.propTypes = {
  executePlanUpdate: PropTypes.func,
  formulaLoader: PropTypes.bool,
  getFormula: PropTypes.func,
  getKpiConfig: PropTypes.func,
  getPlanDetails: PropTypes.func,
  kpiConfigLoader: PropTypes.bool,
  kpiConfigV2Loader: PropTypes.bool,
  planDetail: PropTypes.shape({
    name: PropTypes.shape({
      slice: PropTypes.func
    }),
    plan_display_name: PropTypes.string,
    status: PropTypes.number
  }),
  planDetailsLoader: PropTypes.bool,
  productHierarchy: PropTypes.shape({
    length: PropTypes.number
  }),
  setPlanningScreenEditMode: PropTypes.func,
  trackBudgetTableChanges: PropTypes.shape({
    length: PropTypes.number
  }),
  updatePlanLoader: PropTypes.any,
  fetchShowHideData: PropTypes.func,
  savePlanLoader: PropTypes.bool,
  setLockedCells: PropTypes.func,
  setTrackBudgetTableChanges: PropTypes.func,
  initialBudgetTableResp: PropTypes.object,
  setBudgeTableRowData: PropTypes.func,
  undoAction: PropTypes.func.isRequired,
  reducerPastLength: PropTypes.number,
  setIsDownloadPlanVisible: PropTypes.func,
  logoutAlertStatus: PropTypes.object,
  planActualizedWeeksLoader: PropTypes.bool,
  isWrittenKpiEdited: PropTypes.bool,
  isEditActionsEnabled: PropTypes.bool,
  currentViewsList: PropTypes.array,
  activeViewDetails: PropTypes.object,
  showViewManagement: PropTypes.bool,
  setIsSnackDispatched: PropTypes.func,
  setIsSnackDispatched: PropTypes.func,
  planKpiConfigV2: PropTypes.object
};

export default connect(mapState, mapDispatch)(PlanningScreen);
