import BalanceIcon from "@mui/icons-material/Balance";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import { Button, CircularProgress, Tooltip } from "@mui/material";
import { Prompt } from "impact-ui";
import {
  CREATE_PLAN_IN_SEASON,
  CREATE_PLAN_PRE_SEASON,
  common,
  plansmartLabelsForButtons,
} from "modules/plansmart/constants-plansmart/stringConstants";
import {
  fetchPlanBudgetDetails,
  getPlanningTableColumns,
  planSmartSavePlanLoaderSelector,
  setPlanSmartSavePlanLoader,
} from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import {
  copyPlanAPI,
  deletePlanSmartPlanAPI,
  planSmartCopyLoaderSelector,
  setPlansmartCopyPlanLoader,
  setPlansmartDashboardLoader,
} from "modules/plansmart/services-plansmart/PlanSmart-Dashboard/plansmart-dashboard-services";
import { useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import {
  CREATE_RECEIPT_PLAN,
  PLAN_CREATE_NEW_PLAN,
} from "../../constants-plansmart/routesConstants";
import { useStyles } from "../plansmart-styles";
import CopyConfirmation from "./CopyConfirmation";
import {
  copyPlan,
  editViewUi,
  onDeletePlan,
} from "./functionsForPlansmartDashboard";

const DashboardActionButtons = (props) => {
  const {
    selectedRows,
    savePlanLoader,
    copyPlanLoader,
    selectedRowLength,
    downloadData,
    tabValue,
    setDownloadModal,
  } = props;
  const [copyModal, setCopyModal] = useState(false);

  const [showConfirmationDialogue, setShowConfirmationDialogue] = useState(
    false
  );

  const downloadLink = useRef(null);
  const history = useHistory();
  const classes = useStyles();

  const handleCopyModal = (value) => {
    setCopyModal(value);
  };

  const handleCopyPlan = (planDisplayName) => {
    copyPlan(props, selectedRows, setCopyModal, history, planDisplayName);
  };

  const copyBtnLoader = copyPlanLoader || savePlanLoader || false;

  const createPlanUrl = `${PLAN_CREATE_NEW_PLAN}?season_type=${
    props?.isInSeasonDashbaord ? CREATE_PLAN_IN_SEASON : CREATE_PLAN_PRE_SEASON
  }`;

  const createReceiptPlanUrl = `${CREATE_RECEIPT_PLAN}`;
  return (
    <>
      <div className={classes.dashboardTools}>
        <div className={classes.buttonsWrapper}>
          <Tooltip title={common.compare}>
            <Button
              id="plansmartComparePlansBtn"
              className={`${classes.plansmartIconButton} ${classes.hide}`}
              disabled={selectedRowLength > 1 ? "" : "disabled"}
              startIcon={<BalanceIcon />}
              variant="contained"
              color="primary"
            >
              {common.compare}
            </Button>
          </Tooltip>
          <>
            {selectedRowLength === 1
              ? editViewUi(selectedRows, classes, history, tabValue)
              : ""}
          </>
          {selectedRowLength === 1 && (
            <>
              {/* Removed the button temporarily till the functionality is not there */}
              <Tooltip title={"Download"}>
                <Button
                  id="plansmartDownloadPlanBtn"
                  className={classes.plansmartIconButton}
                  disabled={
                    selectedRowLength === 1 && downloadData.length
                      ? ""
                      : "disabled"
                  }
                  onClick={() => setDownloadModal(true)}
                  variant="contained"
                >
                  <DownloadIcon />
                </Button>
              </Tooltip>
              <Tooltip title="Copy">
                <Button
                  className={classes.plansmartIconButton}
                  id="plansmartCopyPlanBtn"
                  variant="contained"
                  color="primary"
                  startIcon={
                    copyBtnLoader ? <CircularProgress size="1rem" /> : null
                  }
                  disabled={selectedRowLength !== 1 || copyBtnLoader}
                  onClick={() => setCopyModal(true)}
                >
                  <ContentCopyOutlinedIcon />
                </Button>
              </Tooltip>
            </>
          )}
          {Boolean(selectedRowLength) && (
            <Tooltip title={"Delete"}>
              <Button
                id="plansmartDeletePlanBtn"
                className={classes.plansmartIconButton}
                disabled={selectedRowLength ? false : true}
                onClick={() => {
                  setShowConfirmationDialogue(true);
                }}
                variant="contained"
              >
                <DeleteIcon />
              </Button>
            </Tooltip>
          )}
          {showConfirmationDialogue && (
            <Prompt
              isOpen={showConfirmationDialogue}
              title="Delete Plan"
              subHeading={`Are you sure you want to delete ${selectedRowLength} plan(s) ?`}
              infoList={[]}
              primaryButtonProps={{
                children: "Yes",
                onClick: () => {
                  onDeletePlan(props, selectedRows, history);
                  setShowConfirmationDialogue(false);
                },
              }}
              tertiaryButtonProps={{
                children: "No",
                onClick: () => setShowConfirmationDialogue(false),
              }}
              variant="error"
            />
          )}
        </div>
        <div className={classes.buttonsWrapper}>
          <Tooltip title={common.performance_analysis}>
            <Button
              variant="contained"
              color="primary"
              id="plansmartAnalysisBtn"
              className={`${classes.plansmartIconButton} ${classes.hide}`}
            >
              {common.performance_analysis}
            </Button>
          </Tooltip>

          {!selectedRowLength && (
            <Button
              variant="contained"
              color="primary"
              id="plansmartGotoCreatePlanBtn"
              onClick={() => {
                if (tabValue === 2) {
                  history.push(createReceiptPlanUrl);
                } else {
                  history.push(createPlanUrl);
                }
              }}
              // disabled={disbaleCreateOrReviewButton(props, selectedRows)}
            >
              {
                plansmartLabelsForButtons(props?.isInSeasonDashbaord)
                  .create_new_plan
              }
            </Button>
          )}
        </div>
      </div>

      <CopyConfirmation
        open={copyModal}
        onClose={() => handleCopyModal(false)}
        onSubmit={handleCopyPlan}
        loader={copyBtnLoader}
        isInSeasonDashbaord={props?.isInSeasonDashbaord}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    copyPlanLoader: planSmartCopyLoaderSelector(store),
    savePlanLoader: planSmartSavePlanLoaderSelector(store),
    plansmartScreenName: store.sideBarReducer.userPlatformScreenName,
  };
};
const mapDispatchToProps = (dispatch) => ({
  setSavePlanLoader: (payload) => dispatch(setPlanSmartSavePlanLoader(payload)),
  setPlansmartDashboardLoader: (payload) =>
    dispatch(setPlansmartDashboardLoader(payload)),
  getPlanningTableColumns: (payload) =>
    dispatch(getPlanningTableColumns(payload)),
  fetchPlanBudgetDetails: (payload) =>
    dispatch(fetchPlanBudgetDetails(payload)),
  setCopyLoader: (payload) => dispatch(setPlansmartCopyPlanLoader(payload)),
  copyPlanReq: (payload) => dispatch(copyPlanAPI(payload)),
  deletePlanSmartPlanAPI: (payload) =>
    dispatch(deletePlanSmartPlanAPI(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DashboardActionButtons);
