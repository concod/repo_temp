import PropTypes from "prop-types";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import DeleteIcon from "assets/deleteIcon.svg";
import EditIcon from "assets/editIcon.svg";
import CopyIcon from "assets/copyIcon.svg";
import DownloadIcon from "assets/download.svg";
import DownloadCurrent from "assets/downloadCurrent.svg";
import DownloadEntire from "assets/downloadEntire.svg";
import { Button } from "impact-ui";
import { actionType } from "./actionButtons.constants";
import CopyPlanModal from "./CopyPlanModal/CopyPlanModal";
import DeletePlan from "./DeletePlan/DeletePlan";
import {
  CREATE_PLAN_ROUTE,
  REVIEW_IN_SEASON_ROUTE,
  CREATE_TARGET_PLAN_ROUTE
} from "constants/route.constant";
import * as actions from "./../../dashboard.slice";
import { getButtonName } from "./actionButtons.util";
import "./ActionButtons.scss";
import { DASHBOARD_PAGES } from "../../dashboard.constant";
import CustomActionButton from "../../../../components/Impact/CustomActionButton/CustomActionButton";
import CustomPopover from "../../../PlanningScreen/components/ButtonDropdown/CustomPopover";
import ButtonDropdown from "../../../PlanningScreen/components/ButtonDropdown/ButtonDropdown";
import SelectFilter from "../SelectFilter/SelectFilter";
import { DOWNLOAD_PLAN_LABEL } from "components/planSmart/downloadPlan/downloadPlanModal.constant";
import { getHierarchyValuesForDownloadPlan } from "components/planSmart/downloadPlan/downloadPlanModal.utils";
import * as apis from "components/planSmart/downloadPlan/downloadPlanModal.api";
import { get } from "lodash";
import Visibility from "@mui/icons-material/Visibility";
import { PLANNING_SCREEN_ROUTE } from "../../../../constants/route.constant";

const ActionButtons = (props) => {
  const {
    selectedRows,
    planCode,
    setDownloadPlanVisible,
    selectedScreenName,
    actionButtonLoader,
    downloadPlanReq,
    levels,
    filterConfigPayload,
    filterConfigUrl,
    resetFilter
  } = props;
  const navigate = useNavigate();

  const onClickHandler = () => {
    if (selectedScreenName === DASHBOARD_PAGES.TARGET_PLAN) {
      return navigate(CREATE_TARGET_PLAN_ROUTE);
    } else
      return selectedScreenName === DASHBOARD_PAGES.PRE_SEASON
        ? navigate(CREATE_PLAN_ROUTE)
        : navigate(REVIEW_IN_SEASON_ROUTE);
  };

  const [showCopyPlanModal, setShowCopyPlanModal] = useState(false);
  const [showDeletePlanDialogue, setShowDeletePlanDialogue] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);
  const buttonDropdownRef = useRef(null);
  const [isDownloadDisabled, setIsDownloadDisabled] = useState(false);
  const [isCancelButtonDisabled, setIsCancelButtonDisabled] = useState(false);

  const buttonConfigs = [
    {
      id: "EditPlanBtn",
      icon: EditIcon,
      tooltipText: "Edit",
      placement: "top",
      onClick: () =>
        navigate(`${PLANNING_SCREEN_ROUTE}/${actionType.EDIT}/${planCode}`)
    },
    // This functionality to be moved on click of plan name within the table
    {
      id: "ViewPlanBtn",
      icon: Visibility,
      placement: "top",
      onClick: () =>
        navigate(`${PLANNING_SCREEN_ROUTE}/${actionType.VIEW}/${planCode}`),
      tooltipText: "View"
    },
    {
      id: "CopyPlanBtn",
      icon: CopyIcon,
      placement: "top",
      onClick: () => setShowCopyPlanModal(true),
      tooltipText: "Copy"
    },
    {
      id: "DeletePlanBtn",
      icon: DeleteIcon,
      placement: "top",
      onClick: () => setShowDeletePlanDialogue(true),
      tooltipText: "Delete"
    }
  ];

  const dropdownButtons = [
    {
      name: "High level plan",
      startIcon: DownloadCurrent,
      action: () => handleDownload(DOWNLOAD_PLAN_LABEL.HIGH_LEVEL)
    },
    {
      name: "Entire plan",
      startIcon: DownloadEntire,
      action: () => handleDownload(DOWNLOAD_PLAN_LABEL.ENTIRE)
    }
  ];

  const downloadPlanCallback = () => {
    setDownloadPlanVisible(false);
  };

  const handleDownload = (groupValue) => {
    const [selectedPlan = {}] = selectedRows;
    const isHighLevel = groupValue === DOWNLOAD_PLAN_LABEL.HIGH_LEVEL;

    const payload = {
      source: "client",
      plan_code: selectedPlan.data?.plan_code,
      filters: getHierarchyValuesForDownloadPlan(levels, selectedPlan.data),
      ...(isHighLevel && { aggregated_single_sheet: true })
    };

    downloadPlanReq(
      payload,
      downloadPlanCallback,
      setIsDownloadDisabled,
      setIsCancelButtonDisabled
    );
  };

  return (
    <div className="actionButtons">
      {selectedRows.length === 0 && (
        <div className="textual-buttons-container">
          <SelectFilter
            selectedScreenName={selectedScreenName}
            filterConfigUrl={filterConfigUrl}
            filterConfigPayload={filterConfigPayload}
            resetFilter={resetFilter}
            modalTopValue={"-4rem"}
          />
          <Button
            className="customActionButton"
            variant="primary"
            color="primary"
            id="CreateNewPlanBtn"
            onClick={onClickHandler}
          >
            {getButtonName(selectedScreenName)}
          </Button>
        </div>
      )}

      {Boolean(selectedRows.length) &&
        buttonConfigs.map(({ id, icon, onClick, ...props }) =>
          selectedScreenName === DASHBOARD_PAGES.TARGET_PLAN &&
          id === "CopyPlanBtn" ? (
            <></>
          ) : id === "DeletePlanBtn" ? (
            Boolean(selectedRows.length) && (
              <CustomActionButton
                id={id}
                data-testid={id}
                icon={icon}
                onClick={onClick}
                warnButton={true}
                {...props}
              />
            )
          ) : (
            selectedRows.length === 1 && (
              <CustomActionButton
                key={id}
                id={id}
                icon={icon}
                onClick={onClick}
                {...props}
              />
            )
          )
        )}

      {/* hidden the download option */}
      {false && selectedRows.length === 1 && (
        <>
          <hr className="splitDivider" />
          <CustomPopover
            show={openPopover}
            setShow={setOpenPopover}
            triggerRef={buttonDropdownRef}
            triggerElement={
              <CustomActionButton
                id="DownloadPlanBtn"
                icon={DownloadIcon}
                placement="top-end"
                onClick={() => setDownloadPlanVisible(true)}
                tooltipText="Download"
                domRef={buttonDropdownRef}
              />
            }
          >
            <ButtonDropdown
              dropdownButtons={dropdownButtons}
              setPopover={setOpenPopover}
            />
          </CustomPopover>
        </>
      )}

      {showDeletePlanDialogue && (
        <DeletePlan
          showDeletePlanDialogue={showDeletePlanDialogue}
          setShowDeletePlanDialogue={setShowDeletePlanDialogue}
          selectedRows={selectedRows}
          selectedScreenName={selectedScreenName}
          actionButtonLoader={actionButtonLoader}
          tooltipText="Delete"
        />
      )}

      {showCopyPlanModal && (
        <CopyPlanModal
          setShowCopyPlanModal={setShowCopyPlanModal}
          planCode={planCode}
          actionButtonLoader={actionButtonLoader}
        />
      )}
    </div>
  );
};

ActionButtons.propTypes = {
  planCode: PropTypes.number,
  selectedRows: PropTypes.shape({
    length: PropTypes.number
  }),
  selectedScreenName: PropTypes.string,
  setDownloadPlanVisible: PropTypes.func,
  actionButtonLoader: PropTypes.bool
};

const mapState = (state) => ({
  selectedScreenName: state.sideBarReducer.userPlatformScreenName,
  actionButtonLoader: actions.actionButtonLoaderSelector(state),
  statusFilter: actions.statusFilterSelector(state),
  levels: get(
    state,
    "tenantUserRoleMgmtReducer.userRoleManagementReducer.planningLevelHierarchy",
    []
  )
});

const mapDispatch = (dispatch) => ({
  ...bindActionCreators({ ...actions, ...apis }, dispatch)
});

export default connect(mapState, mapDispatch)(ActionButtons);
