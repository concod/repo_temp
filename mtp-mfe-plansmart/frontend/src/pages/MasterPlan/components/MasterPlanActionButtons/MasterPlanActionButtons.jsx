import PropTypes from "prop-types";
import { isEmpty } from "lodash";
import { useSelector, useDispatch } from "react-redux";

import { Button, Tooltip } from "impact-ui";
import { CircularProgress } from "@mui/material";

//ToDo: Remove with listing implementation
//import MasterPlanFilter from "../MasterPlanFilter/MasterPlanFilter";
import SelectFilter from "../../../CommonDashboard/components/SelectFilter/SelectFilter";
// import ListingViews from "../../../ViewManagement/components/ListingViews/ListingViews.jsx";

import HistoryToggleOffOutlinedIcon from "@mui/icons-material/HistoryToggleOffOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
// import ViewManagementIcon from "assets/viewManagement.svg";

import {
  masterPlanApproveAccessSelector,
  masterPlanApproveLoaderSelector,
  masterPlanApproveStatusSelector,
  masterPlanLockAccessSelector,
  masterPlanLockLoaderSelector,
  masterPlanLockStatusSelector,
  masterPlanTableRowDataSelector,
  resetMasterPlan
} from "../../masterPlan.slice";

import {
  MASTER_PLAN_ACTION_BUTTONS,
  MASTER_PLAN_FILTER_CONF,
  MASTER_PLAN_FILTER_CONF_URL,
  // MASTER_PLAN_VIEW_MANAGEMENT
} from "../../masterplan.constant";
import "../../MasterPlan.scss";

const MasterPlanActionButtons = ({
  handleMasterPlanApprove,
  handleMasterPlanDownload,
  handleMasterPlanFilter,
  handleMasterPlanHistoryNav,
  handleMasterPlanLock,
  selectedScreenName,
  isMasterPlanTableLoading,
  setIsTableViewPanelOpen
}) => {
  const isRowDataEmpty = isEmpty(useSelector(masterPlanTableRowDataSelector));
  const approveAccess = useSelector(masterPlanApproveAccessSelector);
  const approveLoader = useSelector(masterPlanApproveLoaderSelector);
  const approveStatus = useSelector(masterPlanApproveStatusSelector);
  const lockAccess = useSelector(masterPlanLockAccessSelector);
  const lockLoader = useSelector(masterPlanLockLoaderSelector);
  const lockStatus = useSelector(masterPlanLockStatusSelector);
  const dispatch = useDispatch();
  const lockButtonAction = lockStatus
    ? MASTER_PLAN_ACTION_BUTTONS.BUTTON_UNLOCK
    : MASTER_PLAN_ACTION_BUTTONS.BUTTON_LOCK;

  const resetFilter = () => {
    dispatch(resetMasterPlan());
  };

  return (
    <div
      className="action-buttons-flex-box"
      style={{ pointerEvents: isMasterPlanTableLoading ? "none" : "auto" }}
    >
      {/* <ListingViews />
      <Tooltip
        text={MASTER_PLAN_VIEW_MANAGEMENT.TOOLTIP_TITLE}
        placement={"bottom"}
      >
        <Button
          className="customActionButton"
          color="primary"
          icon={ViewManagementIcon}
          id="ViewManagementBtn"
          onClick={() => setIsTableViewPanelOpen(true)}
          variant="secondary"
        />
      </Tooltip> */}
      <Button
        className="customActionButton"
        color="primary"
        disabled={isRowDataEmpty}
        icon={DownloadOutlinedIcon}
        id="MASTER_PLAN_DOWNLOAD_BUTTON"
        onClick={handleMasterPlanDownload}
        variant="primary"
      >
        {MASTER_PLAN_ACTION_BUTTONS.BUTTON_DOWNLOAD}
      </Button>
      {lockAccess && (
        <Button
          className="customActionButton"
          color="primary"
          disabled={lockLoader || approveLoader}
          id="MASTER_PLAN_LOCK_BUTTON"
          onClick={handleMasterPlanLock}
          variant="secondary"
          icon={lockLoader ? () => <CircularProgress size="1rem" /> : null}
        >
          {lockButtonAction}
        </Button>
      )}
      {approveAccess && (
        <Button
          className="customActionButton"
          color="primary"
          disabled={approveLoader || !approveStatus || lockLoader}
          id="MASTER_PLAN_APPROVE_BUTTON"
          onClick={handleMasterPlanApprove}
          variant="secondary"
          icon={approveLoader ? () => <CircularProgress size="1rem" /> : null}
        >
          {MASTER_PLAN_ACTION_BUTTONS.BUTTON_APPROVE}
        </Button>
      )}
      <Button
        className="customActionButton"
        color="primary"
        id="MASTER_PLAN_HISTORY_BUTTON"
        icon={HistoryToggleOffOutlinedIcon}
        onClick={handleMasterPlanHistoryNav}
        variant="secondary"
      >
        {MASTER_PLAN_ACTION_BUTTONS.BUTTON_HISTORY}
      </Button>
      {/* <MasterPlanFilter selectedScreenName={selectedScreenName} /> */}
      <SelectFilter
        filterConfigUrl={MASTER_PLAN_FILTER_CONF_URL}
        filterConfigPayload={""}
        handleFilter={handleMasterPlanFilter}
        selectedScreenName={selectedScreenName}
        showFilterStatus={true}
        resetFilter={resetFilter}
        modalTopValue={"2rem"}
      />
    </div>
  );
};

MasterPlanActionButtons.propTypes = {
  handleMasterPlanApprove: PropTypes.func,
  handleMasterPlanDownload: PropTypes.func,
  handleMasterPlanHistoryNav: PropTypes.func,
  handleMasterPlanLock: PropTypes.func,
  selectedScreenName: PropTypes.string,
  isMasterPlanTableLoading: PropTypes.bool,
  setIsTableViewPanelOpen: PropTypes.func
};

export default MasterPlanActionButtons;
