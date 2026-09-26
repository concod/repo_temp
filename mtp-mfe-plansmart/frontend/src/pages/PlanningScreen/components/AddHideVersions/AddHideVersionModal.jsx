import { useState, useEffect } from "react";
import { connect, useSelector, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import { Modal } from "impact-ui-v3";
import { Typography, CircularProgress } from "@mui/material";

import PropTypes from "prop-types";
import LoadingOverlay from "core/Utils/Loader/loader";

import AddHideVersionTable from "./AddHideVersionTable";
import { applyTableSettings } from "../../../ViewManagement/components/TableSettings/tableSettings.util.js";

import * as colApi from "./apis/versionColDef.api";
import * as tableApi from "./apis/versionTableApi";
import * as listCompareApi from "./apis/versionListCompareApi.api";

import * as actions from "../../slice/planningScreen.slice";
import {
  setActiveViewMetricsData,
  activeViewSettingsSelector
} from "../../../ViewManagement/viewManagement.slice.js";

import { ADD_VERSION_CONSTANTS } from "./constants";

import "./AddHideVersion.scss";

const AddHideVersionModal = ({
  fetchVersionColDefDataReq,
  fetchVersionTableDataReq,
  planName,
  planCode,
  showVersionModal,
  setShowVersionModal,
  versionColDefLoader,
  versionColDef,
  versionTableLoader,
  versionTableData,
  listCompareApiReq,
  selectedRows,
  listCompareLoader,
  showHideMetricsData,
  prevSelectedPlans,
  budgetTableResp,
  setGridSettings,
  tableRef,
  currentVersion,
  varianceMapping,
  viewSettings
}) => {
  const dispatch = useDispatch();

  const [isDisabled, setIsDisabled] = useState(true);

  const tableSettingsData = useSelector(activeViewSettingsSelector);
  const dispatchSetActiveViewMetricsData = (data) =>
    dispatch(setActiveViewMetricsData(data));

  useEffect(() => {
    fetchVersionColDefDataReq();
    fetchVersionTableDataReq(planCode);

    return () => {
      setIsDisabled(true);
    };
  }, []);

  const handleAddVersionButton = () => {
    listCompareApiReq(
      setShowVersionModal,
      showHideMetricsData,
      budgetTableResp
    ).then((updatedShowHideData) => {
      if (updatedShowHideData) {
        applyTableSettings({
          currentVersion,
          showHideMetricsData: updatedShowHideData,
          settings: tableSettingsData,
          setActiveViewMetricsData: dispatchSetActiveViewMetricsData,
          setGridSettings,
          setTableShowHideMetricsData: (updatedShowHideData) =>
            actions.setBudgetShowHideMetricsData(updatedShowHideData),
          tableRef,
          versionVarianceMap: varianceMapping
        });
      }
    });
  };

  const isButtonDisabled = () => {
    return (
      isDisabled ||
      listCompareLoader ||
      selectedRows?.length <= 0 ||
      prevSelectedPlans?.length === 2
    );
  };

  return (
    <div>
      <Modal
        className="add-hide-modal"
        size="small"
        title={ADD_VERSION_CONSTANTS.VERSION_MODAL_HEADER}
        open={showVersionModal}
        onClose={() => {
          setShowVersionModal(false);
        }}
        // primaryButtonProps={{
        //   children: ADD_VERSION_CONSTANTS.BUTTON_ADD,
        //   disabled: isButtonDisabled(),
        //   onClick: () => {
        //     handleAddVersionButton();
        //   },
        //   icon: listCompareLoader
        //     ? () => <CircularProgress size="1rem" />
        //     : null
        // }}
        // tertiaryButtonProps={{
        //   children: ADD_VERSION_CONSTANTS.BUTTON_CANCEL,
        //   onClick: () => setShowVersionModal(false)
        // }}
        secondaryButtonLabel={ADD_VERSION_CONSTANTS.BUTTON_CANCEL}
        onSecondaryButtonClick={() => setShowVersionModal(false)}
        primaryButtonLabel={ADD_VERSION_CONSTANTS.BUTTON_ADD}
        onPrimaryButtonClick={handleAddVersionButton}
        primaryButtonProps={{
          disabled: isButtonDisabled()
        }}
      >
        <LoadingOverlay loader={versionColDefLoader || versionTableLoader}>
          <Typography
            component="span"
            sx={{ fontWeight: 300, fontSize: "0.875rem" }}
          >
            {ADD_VERSION_CONSTANTS.LABEL_PLAN_NAME}
            <Typography
              component="span"
              variant="subtitle1"
              sx={{ fontWeight: 500, fontSize: "0.875rem" }}
            >
              {planName}
            </Typography>
          </Typography>
          <div className="versionTableWrapper">
            <AddHideVersionTable
              versionColDefLoader={versionColDefLoader}
              versionColDef={versionColDef}
              versionTableLoader={versionTableLoader}
              versionTableData={versionTableData}
              setIsDisabled={setIsDisabled}
            />
          </div>
        </LoadingOverlay>
      </Modal>
    </div>
  );
};

const mapStateToProps = (state) => ({
  versionColDefLoader: actions.versionColDefLoaderSelector(state),
  versionColDef: actions.versionColDefDataSelector(state),
  versionTableLoader: actions.versionTableLoaderSelector(state),
  versionTableData: actions.versionTableDataSelector(state),
  listCompareLoader: actions.listCompareLoaderSelector(state),
  selectedRows: actions.selectedRowsSelector(state),
  showHideMetricsData: actions.showHideMetricsDataSelector(state),
  prevSelectedPlans: actions.prevSelectedPlansSelector(state),
  budgetTableResp: actions.budgetTableRespSelector(state),
  currentVersion: actions.currentVersionSelector(state),
  varianceMapping: actions.varianceVersionMappingSelector(state),
  viewSettings: actions.viewSettingsSelector(state)
});

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators(
      { ...colApi, ...tableApi, ...listCompareApi },
      dispatch
    )
  };
};

AddHideVersionModal.propTypes = {
  fetchVersionColDefDataReq: PropTypes.func,
  fetchVersionTableDataReq: PropTypes.func,
  planName: PropTypes.string,
  planCode: PropTypes.bool,
  showVersionModal: PropTypes.bool,
  setShowVersionModal: PropTypes.func,
  versionColDefLoader: PropTypes.bool,
  versionColDef: PropTypes.array,
  versionTableLoader: PropTypes.bool,
  versionTableData: PropTypes.array,
  listCompareApiReq: PropTypes.func,
  selectedRows: PropTypes.shape({
    length: PropTypes.number
  }),
  listCompareLoader: PropTypes.bool,
  showHideMetricsData: PropTypes.array,
  budgetTableResp: PropTypes.object,
  currentVersion: PropTypes.string,
  varianceMapping: PropTypes.array,
  viewSettings: PropTypes.array
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AddHideVersionModal);
