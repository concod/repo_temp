import PropTypes from "prop-types";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { bindActionCreators } from "redux";
import "ag-grid-enterprise";
import * as actions from "../../dashboard.slice";
import * as apis from "../../dashboard.api";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";
import "core/Utils/agGrid/ag-theme-mtp.scss";
import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import ActionButtons from "../ActionButtons/ActionButtons";
import "../../Dashboard.scss";
import CustomActionButton from "../../../../components/Impact/CustomActionButton/CustomActionButton";
import ContentDensityIcon from "assets/contentDensity.svg";
import MasterPlanIcon from "assets/masterPlan.svg";
import ContentDensityDefault from "assets/cntDenDefault.svg";
import ContentDensityCompact from "assets/cntDenCompact.svg";
import ContentDensityComfort from "assets/cntDenComfort.svg";
import CustomPopover from "../../../PlanningScreen/components/ButtonDropdown/CustomPopover";
import ButtonDropdown from "../../../PlanningScreen/components/ButtonDropdown/ButtonDropdown";
import {
  IN_SEASON_DASHBOARD_ROUTE,
  PRE_SEASON_DASHBOARD_ROUTE,
  MASTER_PLAN_ROUTE
} from "../../../../constants/route.constant";
import { DASHBOARD_PAGES } from "../../dashboard.constant";
import { useHistory } from "react-router";
import { statusFilterValues } from "../ActionButtons/actionButtons.constants";
import { getRequestPayload } from "../ActionButtons/actionButtons.util";
import * as dataApis from "../../../MasterPlan/api/masterPlanTable.api";
import * as showHideApi from "../../../MasterPlan/api/masterPlanShoworHide.api";
import { isEqual } from "lodash";
import { TENANT } from "config/api";
import { TENANT_MAPPING } from "config/constants";
import * as selectFilterApi from "../SelectFilter//apis/index";
import { MASTER_PLAN_FILTER_CONF_URL } from "../../../MasterPlan/masterplan.constant";

function DashboardPlanTable(props) {
  const {
    statusFilterPayload,
    selectedScreenName,
    getDashboardTableData,
    columnDef,
    rowData,
    dashboardPlanTableLoader,
    setStatusFilter,
    statusFilter,
    resetDashboardTable,
    fetchShowHideData,
    fetchMasterPlanTableDataReq,
    getKpiConfig,
    formFields,
    selectedRows,
    setSelectedRows,
    fieldsDefaultValues,
    setFieldsDefaultValues,
    setCallDropdownApi,
    fetchFilterConfig,
    filterConfigUrl,
    resetFilter,
    filterConfigPayload
  } = props;

  const [planCode, setPlanCode] = useState(0);
  const [openPopover, setOpenPopover] = useState(false);
  const buttonDropdownRef = useRef(null);
  const navigate = useNavigate();

  const history = useHistory();
  const dropdownButtons = [
    { name: "Default", startIcon: ContentDensityDefault },
    { name: "Compact", startIcon: ContentDensityCompact },
    { name: "Comfort", startIcon: ContentDensityComfort }
  ];

  useEffect(() => {
    setStatusFilter(statusFilterPayload);
    return () => {
      setStatusFilter({});
      resetDashboardTable();
      setSelectedRows([]);
    };
  }, []);

  useEffect(() => {
    if (Object.keys(statusFilter).length > 0) {
      getDashboardTableData(selectedScreenName);
    }
  }, [statusFilter]);

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  const handleSelectionChange = (event) => {
    const selectedRows = event.api.getSelectedNodes();
    setSelectedRows(selectedRows);
    setPlanCode(selectedRows?.[0]?.data.plan_code);
  };

  const showFilterState = true;
  const statusFilterValue = statusFilter.values;

  const fetchFormFields = async () => {
    return await fetchFilterConfig(
      selectedScreenName,
      MASTER_PLAN_FILTER_CONF_URL,
      ""
    );
  };

  const handleMasterPlan = async (fetchFormFields) => {
    history.push(
      selectedScreenName === DASHBOARD_PAGES.PRE_SEASON
        ? {
            pathname: `${PRE_SEASON_DASHBOARD_ROUTE}${MASTER_PLAN_ROUTE}`,
            state: showFilterState
          }
        : {
            pathname: `${IN_SEASON_DASHBOARD_ROUTE}${MASTER_PLAN_ROUTE}`,
            state: showFilterState
          }
    );

    const formFields = await fetchFormFields();
    await setCallDropdownApi(true);
    const tableDataReqPayload = await getRequestPayload(
      selectedRows,
      formFields
    );

    setFieldsDefaultValues(tableDataReqPayload);
    await getKpiConfig(selectedScreenName);
    await fetchShowHideData(selectedScreenName);

    await fetchMasterPlanTableDataReq(
      tableDataReqPayload,
      selectedScreenName,
      formFields
    );
  };

  const handleMasterPlanNav = () => {
    fetchFilterConfig(selectedScreenName, MASTER_PLAN_FILTER_CONF_URL, "");
    navigate(
      selectedScreenName === DASHBOARD_PAGES.PRE_SEASON
        ? `${PRE_SEASON_DASHBOARD_ROUTE}${MASTER_PLAN_ROUTE}`
        : `${IN_SEASON_DASHBOARD_ROUTE}${MASTER_PLAN_ROUTE}`
    );
  };
  return (
    <>
      <div className="actionButtons-container">
        {selectedScreenName !== DASHBOARD_PAGES.TARGET_PLAN &&
          selectedRows.length === 1 &&
          !(
            isEqual(statusFilterValue, statusFilterValues.scenarioPlan) ||
            isEqual(statusFilterValue, statusFilterValues.scenarioForecast)
          ) && (
            <>
              <CustomActionButton
                icon={() => <MasterPlanIcon viewBox="-1 -3.5 24 24" />}
                tooltipText="Master Plan"
                placement="top"
                id="MASTER_PLAN_BUTTON"
                onClick={() => handleMasterPlan(fetchFormFields)}
              />
              <hr className="splitDivider" style={{ margin: 0 }} />
            </>
          )}

        {TENANT.toLocaleLowerCase() !== TENANT_MAPPING.ARHAUS &&
          selectedRows.length === 0 && (
            <CustomPopover
              show={openPopover}
              setShow={setOpenPopover}
              triggerRef={buttonDropdownRef}
              triggerElement={
                <CustomActionButton
                  domRef={buttonDropdownRef}
                  icon={() => <ContentDensityIcon viewBox="-0.3 0 16 16" />}
                  tooltipText="Content Density"
                />
              }
              tooltip={true}
              positionStyle={{ top: 40, left: -75 }}
            >
              <ButtonDropdown
                dropdownButtons={dropdownButtons}
                setPopover={setOpenPopover}
              />
            </CustomPopover>
          )}
        {selectedScreenName !== DASHBOARD_PAGES.TARGET_PLAN &&
          !selectedRows?.length && (
            <>
              <CustomActionButton
                icon={() => <MasterPlanIcon viewBox="-1 -3.5 24 24" />}
                tooltipText="Master Plan"
                placement="top"
                id="MASTER_PLAN_BUTTON"
                onClick={handleMasterPlanNav}
              />
              <hr className="splitDivider" style={{ margin: 0 }} />
            </>
          )}
        <ActionButtons
          selectedRows={selectedRows}
          planCode={planCode}
          filterConfigUrl={filterConfigUrl}
          resetFilter={resetFilter}
          filterConfigPayload={filterConfigPayload}
        />
      </div>

      <div className={`ag-theme-alpine plansTable ${props.className}`}>
        <LoadingOverlay loader={dashboardPlanTableLoader}>
          <AgGridComponent
            columns={columnDef}
            rowdata={rowData}
            uniqueRowId="plan_code"
            pagination={true}
            suppressRowTransform={true}
            getRowData={getRowData}
            domLayout="autoHeight"
            showSaveTableConfig={false}
            skipAutoSizeColumnOnSideBarAction={true}
            selectAllHeaderComponent={true}
            skipAutoSizeColumn={true}
            onSelectionChanged={handleSelectionChange}
            showSearchModalBtn={false}
          />
        </LoadingOverlay>
      </div>
    </>
  );
}

DashboardPlanTable.propTypes = {
  columnDef: PropTypes.array,
  dashboardPlanTableLoader: PropTypes.bool,
  getDashboardTableData: PropTypes.func,
  rowData: PropTypes.array,
  setStatusFilter: PropTypes.func,
  statusFilter: PropTypes.object,
  statusFilterPayload: PropTypes.object,
  selectedScreenName: PropTypes.string,
  resetDashboardTable: PropTypes.func,
  getKpiConfig: PropTypes.func,
  formFields: PropTypes.array,
  selectedRows: PropTypes.array,
  setSelectedRows: PropTypes.func
};

const mapState = (state) => ({
  columnDef: actions.dashboardPlanTableColDefSelector(state),
  rowData: actions.dashboardPlanTableRowDataSelector(state),
  dashboardPlanTableLoader: actions.dashboardPlanTableLoaderSelector(state),
  statusFilter: actions.statusFilterSelector(state),
  formFields: actions.formFieldsSelector(state),
  selectedRows: actions.selectedRowsSelector(state),
  fieldsDefaultValues: actions.fieldsDefaultValuesSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators(
      { ...actions, ...apis, ...dataApis, ...showHideApi, ...selectFilterApi },
      dispatch
    )
  };
};

export default connect(mapState, mapDispatch)(DashboardPlanTable);
