import { useEffect, useState, useRef } from "react";
import { useHistory } from "react-router";
import { connect } from "react-redux";
import { Button, Popover } from "@mui/material";
import { Delete, GetApp } from "@mui/icons-material";
import DownloadIcon from "@mui/icons-material/Download";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import UploadIcon from "@mui/icons-material/Upload";
import { Save } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";
import DownloadRollupPopover from "./download-rollup-popover";
import { downloadExcelLink } from "core/Utils/csv-download";
import PlanModal from "./create-or-copy-plan-modal";
import { CREATE_HINDSIGHT_VIEW } from "modules/assortsmart/constants-assortsmart/routesContants";

const useStyles = makeStyles({
  sellingPeriodDiv: {
    whiteSpace: "normal",
  },
  headerDiv: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1rem",
  },
  button: {
    marginRight: 5,
  },
});

const DashboardActionButtons = (props) => {
  const history = useHistory();
  const classes = useStyles();
  const uploadMFP = useRef(null);
  const downloadMFP = useRef(null);
  const [isDownloadPopoverOpen, setisDownloadPopoverOpen] = useState(null);
  const [openCreateModal, setopenCreateModal] = useState(false);
  const [editDisabled, setEditDisabled] = useState(false);
  const [loggedUserCode, setLoggedUserCode] = useState(null);

  useEffect(() => {
    //Disable edit button on cluster dashboard, for planstep higher than 2
    if (
      history.location.pathname.includes("cluster-smart") ||
      history.location.pathname.includes("cluster-dashboard")
    ) {
      if (props.selectedPlans?.length === 1) {
        if (props.selectedPlans[0]?.plan_step >= "1.3") {
          //setEditDisabled(true);
          return;
        }
      }
    }
    setEditDisabled(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedPlans]);

  useEffect(() => {
    if (props.userManagementList?.length) {
      let data = props.userManagementList.filter(
        (user) => user.email.toLowerCase() === props.userAuth.name.toLowerCase()
      );
      if (data?.length) {
        setLoggedUserCode(data?.[0]?.user_code);
      }
    }
  }, [props.userManagementList, props.userAuth]);

  const handleHindsightPlanCreation = (filters) => {
    history.push({
      pathname: CREATE_HINDSIGHT_VIEW,
      state: {
        filters: filters,
      },
    });
  };

  const openCreatePlanFunc = () => {
    if (history.location.pathname.includes("hindsight-dashboard")) {
      handleHindsightPlanCreation();
    }
    setopenCreateModal(true);
  };
  const closeCreatePlanFunc = () => {
    setopenCreateModal(false);
  };

  const handlePopover = (event) => {
    setisDownloadPopoverOpen(event.currentTarget);
  };

  const closePopover = () => {
    setisDownloadPopoverOpen(null);
  };

  const handleDownloadRollup = (option) => {
    closePopover();
    props.onDownloadBuyRollups(option);
  };

  const handleMFPUpload = (event) => {
    if (event.target.files?.length) {
      event.preventDefault();
      props.setMFPUploadFile(event.target.files);
    }
  };

  useEffect(() => {
    if (props.mfpDownloadData?.length) {
      downloadMFP.current.link.click();
    }
  }, [props.mfpDownloadData]);

  return (
    <>
      {openCreateModal && (
        <PlanModal
          accessData={props.userAccessList}
          filterData={props.filterData}
          open={openCreateModal}
          handleClose={closeCreatePlanFunc}
        />
      )}
      <div>
        {history.location.pathname.includes("master-plan-dashboard") && (
          <Button
            onClick={() => props.handleSummaryView(props.selectedPlans)}
            className={classes.button}
            variant="contained"
            color="primary"
            id="assortCreatePlanBtn"
            disabled={props.selectedPlans?.length ? false : true}
          >
            Summary view
          </Button>
        )}
        {!history.location.pathname.includes("master-plan-dashboard") &&
          !history.location.pathname.includes("MFP-dashboard") && (
            <Button
              onClick={openCreatePlanFunc}
              className={classes.button}
              variant="contained"
              color="primary"
              id="assortCreatePlanBtn"
            >
              Create New
            </Button>
          )}
        {props.selectedPlans?.length === 1 &&
          props.selectedPlans?.[0]?.created_by_code === loggedUserCode &&
          !history.location.pathname.includes("master-plan-dashboard") && (
            <>
              {props.selectedPlans?.length >= 1 && (
                <Button
                  className={classes.button}
                  variant="outlined"
                  color="primary"
                  onClick={props.onPlansDelete}
                  title="Delete plan(s)"
                  id="assortDashboardDeleteBtn"
                >
                  <Delete fontSize="small" />
                </Button>
              )}
            </>
          )}
        {props.selectedPlans?.length === 1 &&
          (props.selectedPlans?.[0]?.created_by_code === loggedUserCode ||
            props.selectedPlans?.[0]?.created_by === loggedUserCode) &&
          !history.location.pathname.includes("alldoor") &&
          props.selectedPlans?.length >= 1 && (
            <>
              <Button
                className={classes.button}
                variant="outlined"
                onClick={() => props.editPlanClick(props.selectedPlans[0])}
                title={"Edit Plan"}
                disabled={editDisabled ? true : false}
              >
                <EditIcon />
              </Button>
            </>
          )}
        {history?.location?.pathname?.includes("plan-dashboard") &&
          props.selectedPlans?.[0]?.created_by_code === loggedUserCode &&
          props.selectedPlans?.length >= 1 && (
            <Button
              className={classes.button}
              variant="outlined"
              onClick={() => props.viewPlanClick(props.selectedPlans[0])}
              title={"view Plan"}
              disabled={editDisabled ? true : false}
            >
              <VisibilityIcon />
            </Button>
          )}
        {props.selectedPlans?.length >= 1 &&
          !history.location.pathname.includes("alldoor") && (
            <>
              <Button
                className={classes.button}
                variant="outlined"
                color="primary"
                title="Copy Plan"
                id="assortDashboardCopyPlanBtn"
                onClick={props.onPlanCopy}
              >
                <ContentCopyIcon />
              </Button>
            </>
          )}
        {history.location.pathname.includes("cluster-smart") ||
        history.location.pathname.includes("cluster-dashboard")
          ? props.selectedPlans?.length === 1 && (
              <>
                <Button
                  className={classes.button}
                  variant="outlined"
                  color="primary"
                  title={"Download View Cluster Grade"}
                  onClick={props.handleClusterDownload}
                >
                  {<DownloadIcon fontSize="small" />}
                </Button>
              </>
            )
          : !history.location.pathname.includes("omnichannel") &&
            !history.location.pathname.includes("alldoorchoiceconfiguration") &&
            !history.location.pathname.includes("master-plan-dashboard") &&
            !history.location.pathname.includes("hindsight-dashboard") && (
              <>
                {props.selectedPlans?.length >= 2 &&
                  props.selectedPlans?.length <= 5 && (
                    <Button
                      className={classes.button}
                      id="assortDashboardCompareBtn"
                      variant="outlined"
                      color="primary"
                      onClick={props.comparePlan}
                    >
                      Compare Plan
                    </Button>
                  )}
                {props.selectedPlans?.length >= 1 &&
                  !history.location.pathname?.includes(
                    "hindsight-dashboard"
                  ) && (
                    <>
                      <Button
                        className={classes.button}
                        variant="outlined"
                        color="primary"
                        onClick={handlePopover}
                        title={"Download rollups"}
                        id="assortDashboardDownloadBtn"
                      >
                        <GetApp fontSize="small" />
                      </Button>
                      <Popover
                        id="assortDashboardDownloadBtn"
                        anchorEl={isDownloadPopoverOpen}
                        open={Boolean(isDownloadPopoverOpen)}
                        onClose={closePopover}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "left",
                        }}
                      >
                        <DownloadRollupPopover
                          closePopover={closePopover}
                          onDownload={(option) => {
                            handleDownloadRollup(option);
                          }}
                          screenConfiguration={props.screenConfiguration}
                        />
                      </Popover>
                    </>
                  )}
              </>
            )}
        {history.location.pathname.includes("MFP-dashboard") && (
          <>
            <Button
              variant="outlined"
              color="primary"
              title={"Download MFP Budget data"}
              id={"download-mfp-budget-data"}
              className={classes.button}
              onClick={props.handleMFPFileDownload}
            >
              {<DownloadIcon />}
            </Button>
            {downloadExcelLink(
              props.mfpDownloadData,
              "MFP Upload",
              downloadMFP,
              props.excelHeadersList,
              "",
              "",
              false
            )}
            <Button
              variant="outlined"
              color="primary"
              title={"Upload MFP data"}
              id={"upload-MFP-data"}
              className={classes.button}
              onClick={() => {
                uploadMFP.current.click();
              }}
            >
              <UploadIcon />
              <input
                ref={uploadMFP}
                id="uploadMFP"
                type="file"
                hidden="true"
                accept=".xls,.xlsx , .csv"
                onChange={(e) => {
                  handleMFPUpload(e);
                }}
                onClick={(e) => {
                  e.target.value = null;
                }}
              />
            </Button>
            <Button
              ariant="outlined"
              color="primary"
              className={classes.button}
              id="save-omni-data"
              onClick={props.updateMFPData}
              disabled={!props.isSaveEnabled}
            >
              <Save />
            </Button>
          </>
        )}
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    userManagementList: state.commentBarReducer.userManagementList,
    userAuth: state.authReducer.user,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapActionsToProps = {};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(DashboardActionButtons);
