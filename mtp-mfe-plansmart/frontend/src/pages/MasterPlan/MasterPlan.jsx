import { useRef, useState, useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { isEmpty } from "lodash";
import PropTypes from "prop-types";
import { EmptyState } from "impact-ui";

import MasterPlanActionButtons from "./components/MasterPlanActionButtons/MasterPlanActionButtons";
import MasterPlanHistoryModal from "./components/MasterPlanHistory/MasterPlanHistoryModal";
import MasterPlanTable from "./components/MasterPlanTable/MasterPlanTable";
import { getParams } from "../../components/planSmart/downloadPlan/downloadPlanModal.utils";
import ViewManagementController from "../ViewManagement/ViewManagementController.jsx";

import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import FilterChips from "core/commonComponents/filters/filterChips";

import * as actions from "./masterPlan.slice";

import * as approveApi from "./api/masterPlanApprove.api";
import * as historyApis from "./api/masterPlanHistory.api";
import * as lockApi from "./api/masterPlanLock.api";
import * as dataApis from "./api/masterPlanTable.api";
import * as showHideApi from "./api/masterPlanShoworHide.api";
import * as selectFilterActions from "../CommonDashboard/components/SelectFilter/apis/index";

import {
  IN_SEASON_DASHBOARD_ROUTE,
  PRE_SEASON_DASHBOARD_ROUTE
} from "../../constants/route.constant";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { PRE_SEASON, IN_SEASON } from "../../constants/constant";
import { MASTER_PLAN_FILTER_CONF_URL } from "./masterplan.constant";

import "./MasterPlan.scss";

const MasterPlan = ({
  fetchMasterPlanHistoryColDefReq,
  fetchMasterPlanHistoryDataReq,
  fetchMasterPlanTableDataReq,
  fetchShowHideData,
  getKpiConfig,
  masterPlanApproveReq,
  masterPlanLockReq,
  masterPlanPlanTableLoader,
  planKpiConfig,
  resetMasterPlan,
  selectedFilters,
  selectedFiltersChips,
  varianceList,
  fetchFilterConfig
}) => {
  const agTableRef = useRef();

  const location = useLocation();
  const navigate = useNavigate();

  const [masterPlanTableRef, setMasterPlanTableRef] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isTableViewPanelOpen, setIsTableViewPanelOpen] = useState(false);

  const selectedScreenName = location?.pathname?.split("/")[2];
  const showSelectedFilters = selectedFilters?.length > 0;
  const masterPlanfilterChips = selectedFiltersChips?.slice(1);

  const showTableContent =
    masterPlanPlanTableLoader || !isEmpty(selectedFilters);

  useEffect(() => {
    resetMasterPlan();
    fetchFilterConfig(selectedScreenName, MASTER_PLAN_FILTER_CONF_URL, "");
  }, []);

  const handleMasterPlanHistoryNav = () => {
    fetchMasterPlanHistoryColDefReq();
    fetchMasterPlanHistoryDataReq(selectedScreenName);
    setShowHistoryModal(true);
  };

  const handleMasterPlanDownload = () => {
    masterPlanTableRef?.current?.api?.exportDataAsCsv(
      getParams({ planKpiConfig, varianceList })
    );
  };

  const handleMasterPlanLock = () => {
    masterPlanLockReq();
  };

  const handleMasterPlanApprove = () => {
    masterPlanApproveReq();
  };

  const handleMasterPlanFilter = async (fieldsDefaultValues, fields) => {
    const screenName =
      selectedScreenName === PRE_SEASON ? PRE_SEASON : IN_SEASON;

    await getKpiConfig(screenName);
    fetchShowHideData(screenName);
    fetchMasterPlanTableDataReq(fieldsDefaultValues, screenName, fields);
  };

  const handlePanelClose = () => {
    setIsTableViewPanelOpen(false);
  };

  const getTableContent = () => {
    return showTableContent ? (
      <div className="masterplan-table-container">
        <MasterPlanTable
          agTableRef={agTableRef}
          setMasterPlanTableRef={setMasterPlanTableRef}
        />
      </div>
    ) : (
      <div className="emptyState-wrapper">
        <EmptyState
          variant="noPlan"
          layout="horizontal"
          heading="No data found"
          info="Please click on select filters to filter and View Data"
          primaryButtonProps={{ children: "Create Plan" }}
        />
      </div>
    );
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Dashboard",
            id: 1,
            action: () => {
              navigate(
                selectedScreenName === PRE_SEASON
                  ? PRE_SEASON_DASHBOARD_ROUTE
                  : IN_SEASON_DASHBOARD_ROUTE
              );
            }
          },
          {
            label: "Master Plan",
            id: 1
          }
        ]}
      />
      <MasterPlanActionButtons
        handleMasterPlanApprove={handleMasterPlanApprove}
        handleMasterPlanDownload={handleMasterPlanDownload}
        handleMasterPlanHistoryNav={handleMasterPlanHistoryNav}
        handleMasterPlanLock={handleMasterPlanLock}
        selectedScreenName={selectedScreenName}
        handleMasterPlanFilter={handleMasterPlanFilter}
        isMasterPlanTableLoading={masterPlanPlanTableLoader}
        setIsTableViewPanelOpen={setIsTableViewPanelOpen}
      />
      {showSelectedFilters && (
        <div className="selected-filters-wrapper">
          <FilterChips filterConfig={masterPlanfilterChips} />
        </div>
      )}
      {getTableContent()}
      {showHistoryModal && (
        <MasterPlanHistoryModal
          showHistoryModal={showHistoryModal}
          setShowHistoryModal={setShowHistoryModal}
        />
      )}
      {/* {isTableViewPanelOpen && (
        <ViewManagementController
          showPanel={isTableViewPanelOpen}
          handleClose={handlePanelClose}
        />
      )} */}
    </>
  );
};

const mapStateToProps = (state) => ({
  masterPlanPlanTableLoader: actions.masterPlanPlanTableLoaderSelector(state),
  planKpiConfig: actions.masterPlanKpiConfigSelector(state),
  selectedFilters: actions.selectedFiltersSelector(state),
  selectedFiltersChips: actions.selectedFiltersChipsSelector(state),
  varianceList: actions.masterPlanVarianceVersionListSelector(state)
});
const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators(
      {
        ...actions,
        ...approveApi,
        ...lockApi,
        ...historyApis,
        ...dataApis,
        ...showHideApi,
        ...selectFilterActions
      },
      dispatch
    )
  };
};

MasterPlan.propTypes = {
  fetchMasterPlanHistoryColDefReq: PropTypes.func,
  fetchMasterPlanHistoryDataReq: PropTypes.func,
  fetchMasterPlanTableDataReq: PropTypes.func,
  fetchShowHideData: PropTypes.func,
  getKpiConfig: PropTypes.func,
  masterPlanApproveReq: PropTypes.func,
  masterPlanLockReq: PropTypes.func,
  masterPlanPlanTableLoader: PropTypes.bool,
  planKpiConfig: PropTypes.object,
  resetMasterPlan: PropTypes.func,
  selectedFilters: PropTypes.array,
  selectedFiltersChips: PropTypes.array,
  varianceList: PropTypes.array
};

export default connect(mapStateToProps, mapDispatchToProps)(MasterPlan);
