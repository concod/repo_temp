import { useEffect, useCallback } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import PropTypes from "prop-types";
import makeStyles from "@mui/styles/makeStyles";

import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";

import CellRenderer from "../../../../components/planSmart/CellRenderer/CellRenderer";
import ShowOrHideMetrics from "../../../../components/planSmart/ShowOrHideMetrics/ShowOrHideMetrics";

import * as actions from "../../masterPlan.slice";

import {
  isExternalFilterPresent,
  doesExternalFilterPass
} from "../../../../utils/validateTableCell.util";

import { replaceSpecialCharacter } from "core/Utils/functions/utils";

import {
  CLASS,
  DEPARTMENT
} from "../../../PlanningScreen/planningScreen.constant";
import { MASTER_PLAN } from "../../masterplan.constant";
import { addGroupingMenuItems } from "../../../PlanningScreen/components/BudgetTable/budgetTable.util";

const useStyles = makeStyles(() => ({
  customGrid: {
    "& .ag-body-viewport, & .ag-center-cols-viewport": {
      overflow: "auto !important",
      scrollbarWidth: "auto !important"
    },
    "& .ag-body-viewport::-webkit-scrollbar, & .ag-center-cols-viewport::-webkit-scrollbar": {
      display: "block !important"
    }
  }
}));

const MasterPlanTable = (props) => {
  const {
    agTableRef,
    columnDef,
    kpiConfigLoader,
    masterPlanPlanTableLoader,
    planKpiConfig,
    rowData,
    setMasterPlanTableRef,
    setMasterShowHideMetricsData,
    showHideMetricsData,
    showHideMetricLoader,
    varianceList
  } = props;

  const classes = useStyles();

  useEffect(() => {
    setMasterPlanTableRef(agTableRef);
  }, [agTableRef?.current?.props?.rowData]);

  useEffect(() => {
    agTableRef?.current?.api?.onFilterChanged();
  }, [showHideMetricsData]);

  const doesExternalFilterPassCallback = useCallback(
    (node) => doesExternalFilterPass(node, showHideMetricsData),
    [showHideMetricsData]
  );

  const innerRendererFunc = (props) => {
    const value = props.value;
    const columnDef = props.node.field;
    const formattedValue =
      columnDef === CLASS || DEPARTMENT
        ? replaceSpecialCharacter(value)
        : value;
    return formattedValue;
  };

  return (
    <LoadingOverlay
      loader={
        masterPlanPlanTableLoader || showHideMetricLoader || kpiConfigLoader
      }
    >
      {!showHideMetricLoader && rowData.length > 0 && (
        <AgGridComponent
          skipAutoSizeColumn={false}
          sizeColumnsToFitFlag={false}
          restrictResize={true}
          minWidth={100}
          columns={columnDef}
          groupDisplayType={"groupRows"}
          pagination={false}
          rowdata={rowData}
          rowGroupPanelShow={"always"}
          rowHeight={30}
          addGroupingMenuItems={addGroupingMenuItems}
          customCellRenderer={(props) => (
            <CellRenderer
              colDef={columnDef}
              planKpiConfig={planKpiConfig}
              varianceList={varianceList}
              isMasterPlan={true}
              {...props}
            />
          )}
          noEditableCustomCellRender={(props) => (
            <CellRenderer
              colDef={columnDef}
              planKpiConfig={planKpiConfig}
              varianceList={varianceList}
              isMasterPlan={true}
              {...props}
            />
          )}
          showSaveTableConfig={false}
          suppressRowTransform={true}
          tableRef={agTableRef}
          getRowData={(params, columnName) => params?.data?.[columnName]}
          uniqueRowId="order"
          uniqueId="order"
          showSearchModalBtn={false}
          //TO-DO: Update with customSideBar values and move to constants
          customSideBar={[
            {
              id: "show_hide_category",
              labelDefault: "Show/Hide metrics",
              labelKey: "show_hide_metrics",
              iconKey: "menu",
              // toolPanel: getShowHideColumnsText,
              toolPanel: ShowOrHideMetrics,
              height: 600,
              minHeight: 600,
              maxHeight: 600,
              toolPanelParams: {
                onChange: true,
                tableRef: agTableRef,
                // showSnackMessage,
                hiddenMetrics: {},
                groupKeys: ["category", "bucket_category"],
                // bucketSelection: bucketSelection,
                setShowHideMetricsData: setMasterShowHideMetricsData,
                planScreen: MASTER_PLAN
              }
            }
          ]}
          isGroupOpenByDefault={() => {
            return true;
          }}
          groupRowRendererParams={{
            suppressCount: true,
            innerRenderer: innerRendererFunc
          }}
          rowDragManaged={true}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPassCallback}
          customClass={classes.customGrid}
        />
      )}
    </LoadingOverlay>
  );
};

const mapState = (state) => ({
  masterPlanPlanTableLoader: actions.masterPlanPlanTableLoaderSelector(state),
  columnDef: actions.masterPlanTableColDefSelector(state),
  rowData: actions.masterPlanTableRowDataSelector(state),
  varianceList: actions.masterPlanVarianceVersionListSelector(state),
  showHideMetricsData: actions.showHideMetricsDataSelector(state),
  showHideMetricLoader: actions.showHideMetricLoaderSelector(state),
  planKpiConfig: actions.masterPlanKpiConfigSelector(state),
  kpiConfigLoader: actions.masterPlanKpiConfigLoaderSelector(state)
});

MasterPlanTable.propTypes = {
  agTableRef: PropTypes.any,
  columnDef: PropTypes.any,
  masterPlanPlanTableLoader: PropTypes.bool,
  rowData: PropTypes.any,
  setMasterPlanTableRef: PropTypes.func,
  showHideMetricsData: PropTypes.any,
  setMasterShowHideMetricsData: PropTypes.func,
  showHideMetricLoader: PropTypes.bool,
  planKpiConfig: PropTypes.object,
  kpiConfigLoader: PropTypes.bool,
  varianceList: PropTypes.array
};

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions }, dispatch)
  };
};

export default connect(mapState, mapDispatch)(MasterPlanTable);
