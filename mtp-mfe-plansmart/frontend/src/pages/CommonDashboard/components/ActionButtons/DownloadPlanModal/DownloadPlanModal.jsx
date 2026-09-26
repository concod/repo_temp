import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";
import { Modal, RadioGroup, Radio } from "impact-ui";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import * as apis from "components/planSmart/downloadPlan/downloadPlanModal.api";
import { getHierarchyValuesForDownloadPlan } from "components/planSmart/downloadPlan/downloadPlanModal.utils";
import * as actions from "../../../dashboard.slice";
import { get } from "lodash";
import { DOWNLOAD_PLAN_LABEL } from "components/planSmart/downloadPlan/downloadPlanModal.constant";
import "components/planSmart/downloadPlan/downloadPlanModal.scss";
import LoadingOverlay from "core/Utils/Loader/loader";

const DownloadPlanModal = (props) => {
  const {
    selectedRows,
    setDownloadPlanVisible,
    isDownloadPlanVisible,
    downloadPlanReq,
    levels,
    downloadPlanLoader
  } = props;

  const [groupValue, setGroupValue] = useState(DOWNLOAD_PLAN_LABEL.HIGH_LEVEL);
  const [isDownloadDisabled, setIsDownloadDisabled] = useState(false);
  const [isCancelButtonDisabled, setIsCancelButtonDisabled] = useState(false);

  useEffect(() => {
    setGroupValue(DOWNLOAD_PLAN_LABEL.HIGH_LEVEL);
  }, [isDownloadPlanVisible]);

  const handleClose = () => {
    setDownloadPlanVisible(false);
  };

  const downloadPlanCallback = () => {
    setDownloadPlanVisible(false);
  };

  const handleDownload = () => {
    const [selectedPlan = {}] = selectedRows;
    const payload = {
      source: "client",
      plan_code: selectedPlan.data?.plan_code,
      filters: getHierarchyValuesForDownloadPlan(levels, selectedPlan.data),
      aggregated_single_sheet:
        groupValue === DOWNLOAD_PLAN_LABEL.ENTIRE ? false : true
    };
    downloadPlanReq(
      payload,
      downloadPlanCallback,
      setIsDownloadDisabled,
      setIsCancelButtonDisabled
    );
  };

  return (
    <div>
      <Modal
        size="medium"
        heading="Download Plan"
        isOpen={isDownloadPlanVisible}
        onClose={handleClose}
        primaryButtonProps={{
          children: "Download",
          disabled: downloadPlanLoader || isDownloadDisabled,
          onClick: () => handleDownload()
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: handleClose,
          disabled: isCancelButtonDisabled
        }}
      >
        <LoadingOverlay
          loader={downloadPlanLoader}
          text="Downloading..."
          spinner
        >
          <RadioGroup
            onChange={(value) => {
              setGroupValue(value);
            }}
            value={groupValue}
            name="group"
            layout="horizontal"
          >
            <Radio
              id="high-level-plan"
              label="High Level Plan"
              value="high-level-plan"
            />
            <Radio id="entire-plan" label="Entire Plan" value="entire-plan" />
          </RadioGroup>
        </LoadingOverlay>
      </Modal>
    </div>
  );
};

DownloadPlanModal.propTypes = {
  downloadPlanLoader: PropTypes.any,
  downloadPlanReq: PropTypes.func,
  isDownloadPlanVisible: PropTypes.any,
  levels: PropTypes.shape({
    slice: PropTypes.func
  }),
  selectedRows: PropTypes.any,
  setDownloadPlanVisible: PropTypes.func
};

const mapState = (state) => ({
  isDownloadPlanVisible: actions.downloadPlanVisibleSelector(state),
  levels: get(
    state,
    "tenantUserRoleMgmtReducer.userRoleManagementReducer.planningLevelHierarchy",
    []
  ),
  downloadPlanLoader: actions.downloadPlanLoaderSelector(state)
});

const mapDispatch = (dispatch) => ({
  ...bindActionCreators({ ...actions, ...apis }, dispatch)
});

export default connect(mapState, mapDispatch)(DownloadPlanModal);
