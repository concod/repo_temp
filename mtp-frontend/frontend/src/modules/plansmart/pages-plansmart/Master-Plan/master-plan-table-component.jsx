import React, { useState, useEffect, useRef, useMemo } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { Box, Button, Paper } from "@mui/material";
import withStyles from "@mui/styles/withStyles";
import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  fetchMasterPlanTableData,
  setMasterPlanTableLoader,
  fetchMasterPlanTableColumnsDef,
  masterPlanTableLoaderSelector,
  fetchMasterPlanFilteredData,
  masterPlanColumnDefDataSelector,
  masterPlanColDefLoaderSelector,
  masterPlanFilteredDataLoaderSelector,
  masterPlanTableDataSelector,
} from "../../services-plansmart/Master-Plan/master-plan-services";
import {
  getPlanningTableColumns,
  fetchPlanBudgetDetails,
} from "../../services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { addSnack } from "../../../../core/actions/snackbarActions";
import {
  fetchComparePlanFilterDef,
  getCsvParams,
  noEditableCustomCellRender,
} from "../plansmart-budget-table/budget-table-functions";
import {
  getComparePlanFilters,
  getPlansToCompare,
  setPlanSmartComparePlanFilterLoader,
  setPlanSmartGetPlansToCompareLoader,
} from "../../services-plansmart/ComparePlan/compare-plan-service";
import colours from "core/Styles/colours";
import BalanceIcon from "@mui/icons-material/Balance";
import { useStyles } from "../plansmart-styles";
import ComparePlanModal from "./../plansmart-budget-table/compare-plan-modal";
import cloneDeep from "lodash/cloneDeep";
import globalStyles from "core/Styles/globalStyles";
import DownloadIcon from "@mui/icons-material/Download";
import AddHideMetrics from "../plansmart-budget-table/ShowHideMetrics";
import { getColumnsToExport } from "../plansmart-utility";
import { get } from "lodash";
import { planSmartScreenConfigSelector } from "modules/plansmart/services-plansmart/common/plansmart-common-service";

const CustomButton = withStyles({
  root: {
    backgroundColor: colours.linkWaterLight,
    color: colours.black,
    "&:hover": {
      backgroundColor: colours.linkWaterLight,
    },
  },
})(Button);

const MasterPlanTableComponent = (props) => {
  const {
    fetchMasterPlanFilteredDataReq,
    filterDependency,
    columnDefs,
    columnDefLoader,
    filteredDataLoader,
    mainTableData,
  } = props;
  const comparePlanRef = useRef();
  const agTableRef = useRef();
  const [comparePlanModal, setComparePlanModal] = useState(false);
  const [budgetTableRef, setBudgetTableRef] = useState(null);
  const [comparePlanFilter, setComparePlanFilter] = useState([]);
  const [comparePlanFilterData, setComparePlanFilterData] = useState({});
  const classes = useStyles();
  const globalClasses = globalStyles();
  const bucketSelection = get(
    props.screenConfig,
    `master_plan.bucket_selection`,
    false
  );

  const tableData = useMemo(() => cloneDeep(mainTableData), [mainTableData]);

  useEffect(() => {
    setBudgetTableRef(agTableRef);
  }, [agTableRef?.current?.props?.rowData]);

  useEffect(() => {
    const body = {
      filters:
        props.masterPlanFilterPayload.length > 0
          ? props.masterPlanFilterPayload.map((filterData) => {
              filterData.filter_type = "non-cascaded";
              return filterData;
            })
          : [],
    };
    fetchMasterPlanFilteredDataReq(
      props.metrics_with_formatter,
      props.defaultMetrics,
      props.defaultBucket,
      props.weekAggregationFormula,
      props.totalBucketAggregrationFormulas,
      props.firstLastBucketTotalColumn,
      body,
      filterDependency
    );
  }, [props.masterPlanFilterPayload]);

  const showSnackMessage = (text, variance) => {
    props.addSnack({
      message: text,
      options: {
        variant: variance,
      },
    });
  };

  const handleDownload = () => {
    const columns = getColumnsToExport(budgetTableRef);
    budgetTableRef.current.api.exportDataAsCsv(getCsvParams(columns));
  };

  function isExternalFilterPresent() {
    return true;
  }

  function doesExternalFilterPass(node) {
    let isHidden = node.data.hide || node.data.hideReference;
    if (bucketSelection) {
      isHidden = isHidden || node.data.hideBucket;
    }
    return isHidden ? false : true;
  }

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  return (
    <LoadingOverlay
      loader={
        props.masterPlanTableLoader || columnDefLoader || filteredDataLoader
      }
      text={"Fetching master plan data..."}
    >
      <Box component={Paper} mt={3}>
        {/* <Box py={3} px={5} display="flex" justifyContent="end">
          <CustomButton
            size="large"
            variant="contained"
            startIcon={<BalanceIcon />}
            onClick={() => setComparePlanModal(true)}
          >
            Import Plan to Compare
          </CustomButton>
        </Box> */}
        {tableData.length > 0 && (
          <Button
            variant="contained"
            className={globalClasses.marginAround}
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            Download
          </Button>
        )}
        <AgGridComponent
          groupHeaderHeight={0}
          tableRef={agTableRef}
          columns={columnDefs}
          rowdata={tableData}
          groupDisplayType={"groupRows"}
          uniqueRowId="uniqueId"
          noEditableCustomCellRender={(cellProps) =>
            noEditableCustomCellRender(props.metrics_with_formatter, cellProps)
          }
          showSaveTableConfig={false}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          rowHeight={30}
          rowSpanColumn={["category", "metric"]}
          getRowData={getRowData}
          rowGroupPanelShow={"always"}
          enableRowSpan={true}
          isGroupOpenByDefault={(params, cellProps) => {
            return true;
          }}
          pagination={false}
          customSideBar={[
            {
              id: "show_hide_category",
              labelDefault: "Show/Hide metrics",
              labelKey: "show_hide_metrics",
              iconKey: "menu",
              toolPanel: AddHideMetrics,
              height: 600,
              minHeight: 600,
              maxHeight: 600,
              toolPanelParams: {
                onChange: true,
                tableRef: agTableRef,
                showSnackMessage,
                hiddenMetrics: {},
                groupKeys: ["category", "bucket_category"],
                bucketSelection: bucketSelection,
              },
            },
          ]}
        />
      </Box>
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => {
  return {
    masterPlanTableLoader: masterPlanTableLoaderSelector(state),
    columnDefs: masterPlanColumnDefDataSelector(state),
    columnDefLoader: masterPlanColDefLoaderSelector(state),
    filteredDataLoader: masterPlanFilteredDataLoaderSelector(state),
    screenConfig: planSmartScreenConfigSelector(state),
    mainTableData: masterPlanTableDataSelector(state),
    metrics_with_formatter:
      state.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .metrics_with_formatter,
    defaultMetrics:
      state.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .defaultMetrics,
    defaultBucket:
      state.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        ?.defaultBucket,

    weekAggregationFormula:
      state.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .weekAggregationFormula,

    totalBucketAggregrationFormulas:
      state.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .totalBucketAggregrationFormulas,
    firstLastBucketTotalColumn:
      state.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .firstLastBucketTotalColumn,
  };
};
const mapDispatchToProps = (dispatch) => ({
  setMasterPlanTableLoader: (payload) =>
    dispatch(setMasterPlanTableLoader(payload)),
  fetchMasterPlanTableData: (payload) =>
    dispatch(fetchMasterPlanTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  fetchMasterPlanTableColumnsDef: (payload) =>
    dispatch(fetchMasterPlanTableColumnsDef(payload)),
  getPlanningTableColumns: (payload, action) =>
    dispatch(getPlanningTableColumns(payload, action)),
  fetchPlanBudgetDetails: (payload) =>
    dispatch(fetchPlanBudgetDetails(payload)),
  getComparePlanFilters: (payload) => dispatch(getComparePlanFilters(payload)),
  setPlanSmartComparePlanFilterLoader: (payload) =>
    dispatch(setPlanSmartComparePlanFilterLoader(payload)),
  fetchMasterPlanFilteredDataReq: (
    weekAggregationFormula,
    totalBucketAggregrationFormulas,
    firstLastBucketTotalColumn,
    metrics_with_formatter,
    defaultMetrics,
    defaultBucket,
    payload,
    filterObj
  ) =>
    dispatch(
      fetchMasterPlanFilteredData(
        weekAggregationFormula,
        totalBucketAggregrationFormulas,
        firstLastBucketTotalColumn,
        metrics_with_formatter,
        defaultMetrics,
        defaultBucket,
        payload,
        filterObj
      )
    ),
});
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(MasterPlanTableComponent));
