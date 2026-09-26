import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { Modal, RadioGroup, Radio, Checkbox } from "impact-ui";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import * as actions from "../../slice/planningScreen.slice";
import * as apis from "components/planSmart/downloadPlan/downloadPlanModal.api";
import {
  getHierarchyValuesForDownloadPlan,
  getParams
} from "components/planSmart/downloadPlan/downloadPlanModal.utils";
import { DOWNLOAD_PLAN_LABEL } from "components/planSmart/downloadPlan/downloadPlanModal.constant";
import "components/planSmart/downloadPlan/downloadPlanModal.scss";
import LoadingOverlay from "core/Utils/Loader/loader";
import { get } from "lodash";

const DownloadPlanModal = (props) => {
  const {
    tableRef,
    planCode,
    planDetail,
    setIsDownloadPlanVisible,
    isDownloadPlanVisible,
    downloadPlanReq,
    downloadPlanLoader,
    hierarchyLevels,
    planKpiConfig,
    varianceList
  } = props;

  const [groupValue, setGroupValue] = useState(DOWNLOAD_PLAN_LABEL.THIS_PAGE);
  const [isDownloadDisabled, setIsDownloadDisabled] = useState(false);
  const [selectedHierarchyLevel, setSelectedHierarchyLevel] = useState([]);
  const [isCancelButtonDisabled, setIsCancelButtonDisabled] = useState(false);

  useEffect(() => {
    setSelectedHierarchyLevel([]);
    setGroupValue(DOWNLOAD_PLAN_LABEL.THIS_PAGE);
  }, [isDownloadPlanVisible]);

  const downloadPlanCallback = () => {
    setIsDownloadPlanVisible(false);
  };

  const handleClose = () => {
    setIsDownloadPlanVisible(false);
  };

  const handleDownload = () => {
    if (groupValue === DOWNLOAD_PLAN_LABEL.THIS_PAGE) {
      tableRef.current.api.exportDataAsCsv(
        getParams({ planKpiConfig, setPopover })
      );
      setIsDownloadPlanVisible(false);
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

  return (
    <Modal
      size="medium"
      heading="Download Plan"
      isOpen={isDownloadPlanVisible}
      onClose={handleClose}
      primaryButtonProps={{
        children: "Download",
        onClick: () => handleDownload(),
        disabled: downloadPlanLoader
      }}
      tertiaryButtonProps={{
        children: "Cancel",
        onClick: handleClose,
        disabled: isCancelButtonDisabled
      }}
    >
      <LoadingOverlay loader={downloadPlanLoader} text="Downloading...">
        <RadioGroup
          onChange={(value) => {
            setGroupValue(value);
          }}
          value={groupValue}
          name="group"
          layout="horizontal"
        >
          <Radio id="this-page" label="This Page" value="this-page" />
          <Radio id="entire-plan" label="Entire Plan" value="entire-plan" />
        </RadioGroup>
      </LoadingOverlay>
    </Modal>
  );
};

DownloadPlanModal.propTypes = {
  downloadPlanLoader: PropTypes.any,
  downloadPlanReq: PropTypes.func,
  isDownloadPlanVisible: PropTypes.any,
  planCode: PropTypes.any,
  planDetail: PropTypes.any,
  setIsDownloadPlanVisible: PropTypes.func,
  tableRef: PropTypes.shape({
    current: PropTypes.shape({
      api: PropTypes.shape({
        exportDataAsCsv: PropTypes.func
      })
    })
  }),
  varianceList: PropTypes.array
};

const mapState = (state) => ({
  hierarchyLevels: actions.productHierarchySelector(state),
  planKpiConfig: actions.planKpiConfigSelector(state),
  isDownloadPlanVisible: actions.downloadPlanVisibleSelector(state),
  downloadPlanLoader: get(
    state,
    "plansmartReducer.commonDashboard.downloadPlanLoader"
  ),
  varianceList: actions.varianceListSelector(state)
});

const mapDispatch = (dispatch) => ({
  ...bindActionCreators({ ...actions, ...apis }, dispatch)
});

export default connect(mapState, mapDispatch)(DownloadPlanModal);
