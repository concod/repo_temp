import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import get from "lodash/get";
import { connect } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import {
  getComparePlanColDef,
  planSmartComparePlanColDefLoaderSelector,
  planSmartComparePlanFilterLoaderSelector,
  planSmartGetPlansToCompareLoaderSelector,
  setPlanSmartComparePlanColRefLoader,
} from "modules/plansmart/services-plansmart/ComparePlan/compare-plan-service";
import colours from "core/Styles/colours";
import {
  comparePlanBudgetTable,
  rowsToCompareValidCheckForComparePlan,
} from "./budget-table-functions";
import {
  getStatusCodeForImportPlan,
  MAX_ROW_ALLOWED_FOR_COMPARE_ERROR_MSG,
} from "modules/plansmart/constants-plansmart/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { fetchCompatibleVersions } from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { SNACK_VARIANT } from "modules/plansmart/utils-plansmart/snackMessage";
import { planSmartScreenConfigSelector } from "modules/plansmart/services-plansmart/common/plansmart-common-service";
import { addProductHierarchyTooltip } from "modules/plansmart/utils-plansmart/ConstantFunctions";

function ComparePlanModal(props) {
  const {
    open,
    handleCancel,
    getComparePlanColDefReq,
    filterData,
    filterLoader,
    colDefLoader,
    planCode,
    onSubmit,
    getPlansToCompareLoader,
    selectedRows,
    setSelectedRows,
    tableData,
    setTableData,
    planDetails,
    showSnackMessage,
    planningLevelHierarchy,
    prevSelectedPlans,
    comparePlanRef,
    agTableRef,
    tabData,
    customTooltipByChannel,
  } = props;
  const [colDef, setColDef] = useState({});

  useEffect(async () => {
    const fetchColDef = async () => {
      props.setPlanSmartComparePlanColRefLoader(true);
      const result = await getComparePlanColDefReq();
      const list = get(result, "data.data", []);
      const formattedColDef = agGridColumnFormatter(list);
      setColDef(
        addProductHierarchyTooltip(formattedColDef, customTooltipByChannel)
      );
      props.setPlanSmartComparePlanColRefLoader(false);
    };
    fetchColDef();
  }, []);

  useEffect(async () => {
    if (Object.keys(filterData).length > 0) {
      try {
        const result = await props.fetchCompatibleVersions(planCode);
        const comparePlans = result.data.data || [];
        setTableData(comparePlanBudgetTable(comparePlans));
      } catch (error) {
        setTableData([]);
      }
    }
  }, [filterData]);

  const handleRowSelection = (instance) => {
    const rows = instance.api.getSelectedRows();
    setSelectedRows(rows);
  };

  const handleImportPlan = () => {
    const selectedPlans = selectedRows.map((row) => row.plan_code);
    const currentPlans = selectedPlans.filter(
      (plan) => prevSelectedPlans.indexOf(plan) === -1
    );
    const tableRows = get(agTableRef, "current.props.rowData", []);
    if (currentPlans.length === 0) {
      showSnackMessage("Please select a version", SNACK_VARIANT.ERROR);
    } else if (currentPlans.length > 1) {
      showSnackMessage(
        "Maximum 1 versions are allowed to add",
        SNACK_VARIANT.ERROR
      );
    } else if (selectedPlans.length > 3) {
      showSnackMessage("Maximum 3 versions are allowed", SNACK_VARIANT.ERROR);
    }
    if (!rowsToCompareValidCheckForComparePlan(tableRows)) {
      showSnackMessage(
        MAX_ROW_ALLOWED_FOR_COMPARE_ERROR_MSG,
        SNACK_VARIANT.ERROR
      );
    } else {
      onSubmit(currentPlans, [...prevSelectedPlans, ...selectedPlans]);
    }
  };

  const isRowSelectable = (rowNode) =>
    prevSelectedPlans.indexOf(rowNode.data.plan_code) > -1 ? false : true;

  return (
    <Dialog open={open} maxWidth="lg" fullWidth>
      <DialogTitle>Add/Hide Versions</DialogTitle>
      <DialogContent>
        <LoadingOverlay loader={filterLoader || colDefLoader}>
          <Box width="100%">
            <Box component={"span"} fontWeight="700">
              Plan name:{" "}
            </Box>{" "}
            {planDetails?.name}
          </Box>
          <Box mt={3}>
            <AgGridComponent
              tableRef={comparePlanRef}
              columns={colDef}
              rowdata={tableData}
              showDisabledCheckboxes={true}
              rowSelection="single"
              uniqueRowId="plan_code"
              isRowSelectable={isRowSelectable}
              onSelectionChanged={handleRowSelection}
              selectAllHeaderComponent={true}
              showSaveTableConfig={false}
              hideHeaderCheckboxComponent={true}
              skipAutoSizeColumn={true}
            />
          </Box>
        </LoadingOverlay>
      </DialogContent>
      <Box component={DialogActions} px={3} py={2}>
        <Button color="primary" onClick={() => handleCancel(false)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={
            getPlansToCompareLoader ||
            selectedRows?.length <= 0 ||
            prevSelectedPlans?.length === 3
          }
          onClick={handleImportPlan}
          startIcon={
            getPlansToCompareLoader ? <CircularProgress size="1rem" /> : null
          }
        >
          Add
        </Button>
      </Box>
    </Dialog>
  );
}

const mapState = (state) => {
  const screenConfig = planSmartScreenConfigSelector(state);
  return {
    colDefLoader: planSmartComparePlanColDefLoaderSelector(state),
    filterLoader: planSmartComparePlanFilterLoaderSelector(state),
    getPlansToCompareLoader: planSmartGetPlansToCompareLoaderSelector(state),
    planningLevelHierarchy:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .planningLevelHierarchy,
    customTooltipByChannel: get(
      screenConfig,
      "common.customTooltipByChannel",
      {}
    ),
  };
};

const mapDispatch = (dispatch) => {
  return {
    getComparePlanColDefReq: () => dispatch(getComparePlanColDef()),
    setPlanSmartComparePlanColRefLoader: (payload) =>
      dispatch(setPlanSmartComparePlanColRefLoader(payload)),
    fetchCompatibleVersions: (payload) =>
      dispatch(fetchCompatibleVersions(payload)),
  };
};

export default connect(mapState, mapDispatch)(ComparePlanModal);
