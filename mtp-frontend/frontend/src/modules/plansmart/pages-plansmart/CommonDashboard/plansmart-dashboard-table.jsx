import React, { useState, useEffect } from "react";
import get from "lodash/get";
import { Paper, Tabs, Tab, Typography, Grid } from "@mui/material";
import AgGridComponent from "core/Utils/agGrid";
import {
  setPlansmartDashboardLoader,
  setPlansmartColDefDashboardLoader,
  plansmartDashboardColDefSelector,
} from "../../services-plansmart/PlanSmart-Dashboard/plansmart-dashboard-services";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { withTransaction } from "@elastic/apm-rum-react";
import { plansmartLabelsForButtons } from "modules/plansmart/constants-plansmart/stringConstants";

import { updateDataForDownload } from "./functionsForPlansmartDashboard";
import DashboardActionButtons from "./dashboardActionButtons";
import { getPlanHierarchies } from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";

import globalStyles from "core/Styles/globalStyles";
import {
  planSmartPlanHierarchyLoaderSelector,
  planSmartPlanHierarchySelector,
  planSmartScreenConfigSelector,
} from "modules/plansmart/services-plansmart/common/plansmart-common-service";

function tabStyleProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

const PlansmartDashboardTable = function (props) {
  const globalClasses = globalStyles();

  const {
    tabValue,
    setTabValue,
    tableRef,
    fetchTableData,
    selectedRows,
    setSelectedRows,
    planHierarchyLoader,
    setDownloadModal,
    dashboardTableColDef,
    planHierarchies,
  } = props;
  const [downloadData, setDataForDownload] = useState([]);
  const [selectedRowLength, setSelectedRowLength] = useState(0);

  useEffect(() => {
    updateHiddenColumn(tabValue);
  }, [props?.dashboardTableData]);

  const handleChange = (_event, newValue) => {
    setTabValue(newValue);
    tableRef.current.api.setFilterModel(null);
  };

  const rowSelectionHandle = (instance) => {
    const rows = instance.api.getSelectedRows();
    setSelectedRows(rows);
    setSelectedRowLength(rows.length);
    updateDataForDownload(rows, setDataForDownload);
  };

  const updateHiddenColumn = (value) => {
    if (!!tableRef.current.columnApi) {
      if (value === 0) {
        tableRef.current.columnApi.setColumnsVisible(
          ["scenario_name", "action"],
          false
        );
        tableRef.current.columnApi.setColumnsVisible(["status_txt"], true);
      } else if (value === 1) {
        tableRef.current.columnApi.setColumnsVisible(
          ["status_txt", "action"],
          false
        );
      }
    }
  };

  return (
    <LoadingOverlay
      loader={
        props.plansmartDashboardLoader ||
        props.plansmartFilterLoader ||
        props.plansmartColDefDashboardLoader ||
        planHierarchyLoader
      }
      text="Loading Plans"
    >
      <Paper variant="outlined" className={globalClasses.evenPaddingAround}>
        <Grid container>
          <Grid item xs={2}>
            <Typography
              variant="h4"
              component="h4"
              className={`${globalClasses.pageHeader}`}
            >
              Plan Dashboard
            </Typography>
          </Grid>
          <Grid item xs={10}>
            <DashboardActionButtons
              tableRef={tableRef}
              selectedRows={selectedRows}
              selectedRowLength={selectedRowLength}
              downloadData={downloadData}
              tabValue={tabValue}
              addSnack={props.addSnack}
              setPlansmartDashboardTableData={
                props.setPlansmartDashboardTableData
              }
              dashboardTableData={props?.dashboardTableData}
              isInSeasonDashbaord={props?.isInSeasonDashbaord}
              userAccessList={props?.userAccessList}
              planHierarchies={planHierarchies}
              fetchTableData={fetchTableData}
              setDownloadModal={setDownloadModal}
            />
          </Grid>
        </Grid>

        <Tabs
          value={tabValue}
          onChange={handleChange}
          aria-label="dasboard tabs"
        >
          <Tab
            label={
              plansmartLabelsForButtons(props?.isInSeasonDashbaord).regular_plan
            }
            {...tabStyleProps(0)}
          />
          <Tab
            label={
              plansmartLabelsForButtons(props?.isInSeasonDashbaord)
                .scenario_plan
            }
            {...tabStyleProps(1)}
          />
          {props.screenConfig.dashboard.receipt_plan && (
            <Tab
              label={plansmartLabelsForButtons().regular_receipt_plan}
              {...tabStyleProps(2)}
            />
          )}
        </Tabs>
        <div style={{ overflow: "auto" }}>
          <AgGridComponent
            tableRef={tableRef}
            columns={dashboardTableColDef}
            rowdata={props?.dashboardTableData}
            onSelectionChanged={rowSelectionHandle}
            uniqueRowId="plan_code"
            sideBar={false}
            selectAllHeaderComponent={true}
            skipAutoSizeColumn={true}
          />
        </div>
      </Paper>
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  return {
    plansmartDashboardLoader:
      store.plansmartReducer.planDashboardReducer.plansmartDashboardLoader,
    plansmartColDefDashboardLoader:
      store.plansmartReducer.planDashboardReducer
        .plansmartColDefDashboardLoader,
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    dashboardTableData:
      store.plansmartReducer.planDashboardReducer.plansmartDashboardData,
    userAccessList:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    plansmartFilterLoader:
      store.plansmartReducer.planDashboardReducer.plansmartFilterLoader,
    planHierarchyLoader: planSmartPlanHierarchyLoaderSelector(store),
    screenConfig: planSmartScreenConfigSelector(store),
    dashboardTableColDef: plansmartDashboardColDefSelector(store),
    planHierarchies: get(
      planSmartPlanHierarchySelector(store),
      "level_info",
      []
    ),
  };
};
const mapDispatchToProps = (dispatch) => ({
  setPlansmartDashboardLoader: (payload) =>
    dispatch(setPlansmartDashboardLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getPlanHierarchies: (payload) => dispatch(getPlanHierarchies(payload)),
  setPlansmartColDefDashboardLoader: (payload) =>
    dispatch(setPlansmartColDefDashboardLoader(payload)),
});

export default withTransaction(
  "PlansmartDashboardTable",
  "component"
)(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(withRouter(PlansmartDashboardTable))
);
