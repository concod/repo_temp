import Table from "core/Utils/agGrid";
import React, { useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import PropTypes from "prop-types";
import * as apis from "../../apis/planningScreen.api";
import * as actions from "../../slice/planningScreen.slice";
import CellRenderer from "../../../../components/planSmart/CellRenderer/CellRenderer";
import {
  BUDGET_TABLE_ROW_HEIGHT,
  PLANNING_SCREEN
} from "../../planningScreen.constant";
import {
  kpiFlow,
  rowDataInxMapping,
  channelRollUpMapping,
  timeRollUpMapping,
  valueByColumnValueKey,
  channelRollDownMapping,
  varianceList,
  varianceMapping,
  sample_plan_config,
  currentVersion,
  timeRollDownMapping,
  productHierarchies,
  rollDownPriority,
  rollUpPriority,
  productContributionMapping,
  channelContributionMapping,
  productContributionParentMapping,
  channelContributionParentMapping,
  previous_timeline_mapping
} from "../../apis/budgetTable.data";
import { cloneDeep, get } from "lodash";
import removeFuncFromArrayObject from "../../../../utils/removeFuncFromArrayObject.util";
import flashEditedCells from "../../../../utils/flashCells.util";
import getColumnMaps from "../../../../utils/getColumnMaps.util";
import ShowOrHideMetrics from "../../../../components/planSmart/ShowOrHideMetrics/ShowOrHideMetrics";
import {
  isExternalFilterPresent,
  doesExternalFilterPass
} from "../../../../utils/validateTableCell.util";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";
import "core/Utils/agGrid/ag-theme-mtp.scss";
import styles from "./BudgetTable.module.css";
import { getContributionValues } from "./budgetTable.util";
import processClipboardValues from "../../../../utils/clipboard.util";
import redrawBudgetTable from "../../../../utils/redrawBudgetTable.util";

function MockBudgetTable(props) {
  const {
    getBudgetTableData,
    colDef,
    rowData,
    planDetails,
    budgetTableLoader,
    planKpiConfig,
    calculationWorker,
    setBudgeTableRowData,
    tableRef,
    tableRowDataRef,
    trackBudgetTableChanges,
    setTrackBudgetTableChanges,
    showHideMetricsData,
    setBudgetShowHideMetricsData,
    viewType,
    showHideMetricLoader,
    lockedCellRef
  } = props;

  const trackBudgetTableChangesRef = useRef(trackBudgetTableChanges);

  tableRowDataRef.current = rowData;
  trackBudgetTableChangesRef.current = trackBudgetTableChanges;
  useEffect(() => {
    if (Object.keys(planDetails).length > 0 && !budgetTableLoader) {
      getBudgetTableData(true);
    }
  }, [planDetails]);

  useEffect(() => {
    tableRef?.current?.api?.onFilterChanged();
  }, [showHideMetricsData]);

  const handleChange = (changeDetected, cellProps, lockedCells) => {
    const columnDefs = removeFuncFromArrayObject(cloneDeep(colDef));
    const changedColumnDef = removeFuncFromArrayObject([
      cellProps.column.userProvidedColDef
    ])[0];
    const tableRows = get(tableRowDataRef, "current", []) || [];
    const columnsMap = getColumnMaps(
      get(tableRef, "current.api.columnModel.gridColumnsMap", {}),
      true
    );

    const isContributionCol = get(
      changedColumnDef,
      "extra.contribution",
      false
    );

    if (!isContributionCol) {
      runBudgetCaluculation(
        cellProps,
        columnDefs,
        tableRows,
        columnsMap,
        changeDetected,
        changedColumnDef,
        lockedCellRef.current
      );
    } else {
      const updatedValues = getContributionValues(
        cellProps,
        tableRows,
        columnsMap,
        changeDetected,
        changedColumnDef,
        productContributionParentMapping,
        channelContributionParentMapping,
        channelRollUpMapping,
        lockedCellRef.current
      );

      runBudgetCaluculation(
        cellProps,
        columnDefs,
        tableRows,
        columnsMap,
        updatedValues?.updatedChangedCellData,
        updatedValues?.updatedChangedColumnDef,
        updatedValues?.updatedLockedCells
      );
    }
  };

  const runBudgetCaluculation = (
    cellProps,
    columnDefs,
    tableRows,
    columnsMap,
    updatedChangedCellData,
    updatedChangedColumnDef,
    lockedCells
  ) => {
    calculationWorker.postMessage([
      {
        rowData: tableRows,
        changedCellData: updatedChangedCellData,
        changedRow: cellProps.data,
        columnDefs: columnDefs,
        changedColumnDef: updatedChangedColumnDef,
        changedRowInx: cellProps.data.index,
        timeRollUpMapping: timeRollUpMapping,
        timeRollDownMapping: timeRollDownMapping,
        channelRollUpMapping: channelRollUpMapping,
        valueByColumnValueKey: valueByColumnValueKey,
        rowDataInxMapping: rowDataInxMapping,
        kpiFlow: kpiFlow,
        channelRollDownMapping: channelRollDownMapping,
        columnsMap: columnsMap,
        varianceList: varianceList,
        varianceMapping: varianceMapping,
        kpiConfig: sample_plan_config,
        currentVersion: currentVersion,
        trackBudgetTableChanges: trackBudgetTableChangesRef.current,
        productHierarchies: productHierarchies,
        rollDownPriority: rollDownPriority,
        rollUpPriority: rollUpPriority,
        lockedCells: lockedCells,
        productContributionMapping: productContributionMapping,
        channelContributionMapping: channelContributionMapping,
        previousTimelineMapping: previous_timeline_mapping,
        logCalculations: true
      }
    ]);
    calculationWorker.onmessage = (e) => {
      const newRowData = e.data.rowData;
      const newTrackBudgetTableChanges = e.data.trackBudgetTableChanges;
      const newRefreshCells = e?.data?.refreshCells;
      setBudgeTableRowData(newRowData);
      setTrackBudgetTableChanges(newTrackBudgetTableChanges);
      redrawBudgetTable({ tableRef, rowData: newRefreshCells.rowData });
      flashEditedCells({ tableRef, newRefreshCells });
    };
  };

  const doesExternalFilterPassCallback = useCallback(
    (node) => doesExternalFilterPass(node, showHideMetricsData),
    [showHideMetricsData]
  );

  return (
    <div className={`${styles.tableContainer} ag-theme-alpine`}>
      <>
        {!showHideMetricLoader && rowData.length > 0 && (
          <Table
            skipAutoSizeColumnOnSideBarAction={true}
            tableRef={tableRef}
            uniqueId="order"
            columns={colDef}
            rowdata={rowData}
            uniqueRowId="order"
            pagination={false}
            suppressRowTransform={true}
            showSaveTableConfig={false}
            noEditableCustomCellRender={(props) => (
              <CellRenderer
                planKpiConfig={planKpiConfig}
                {...props}
                onChange={handleChange}
                viewType={viewType}
              />
            )}
            rowHeight={BUDGET_TABLE_ROW_HEIGHT}
            valueCache={true}
            enableRowSpan={true}
            rowSpanColumn={[]}
            getRowData={(params, columnName) => params?.data?.[columnName]}
            customSideBar={[
              {
                id: "show_or_hide_section",
                labelDefault: "Show/Hide metrics",
                labelKey: "show_hide_metrics",
                iconKey: "menu",
                toolPanel: ShowOrHideMetrics,
                toolPanelParams: {
                  tableRef: tableRef,
                  setShowHideMetricsData: setBudgetShowHideMetricsData,
                  planScreen: PLANNING_SCREEN
                },
                height: 600,
                minHeight: 600,
                maxHeight: 600
              }
            ]}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPassCallback}
            enableRangeSelection={true}
            processDataFromClipboard={(params) =>
              processClipboardValues({
                tableRef,
                params,
                kpiConfig: planKpiConfig,
                calculationWorker
              })
            }
            // props for enabling save user preferences setup
            enableTableView={true}
            tableName={get(planDetails, "plan_code", null)}
            rowGroupPanelShow={"always"}
            rowDragManaged={true}
            isGroupOpenByDefault={() => {
              return true;
            }}
            groupRowRendererParams={{
              suppressCount: true
            }}
            groupDisplayType={"groupRows"}
            showSearchModalBtn={false}
          />
        )}
      </>
    </div>
  );
}

const mapState = (state) => ({
  colDef: actions.budgetTableMockColDefSelector(state),
  rowData: actions.budgetTableRowDataSelector(state),
  planDetails: actions.planDetailsSelector(state),
  budgetTableLoader: actions.budgetTableLoaderSelector(state),
  planKpiConfig: actions.planKpiConfigSelector(state),
  trackBudgetTableChanges: actions.trackBudgetTableChangesSelector(state),
  showHideMetricsData: actions.showHideMetricsDataSelector(state),
  showHideMetricLoader: actions.showHideMetricLoaderSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions, ...apis }, dispatch)
  };
};

MockBudgetTable.propTypes = {
  budgetTableLoader: PropTypes.any,
  calculationWorker: PropTypes.shape({
    onmessage: PropTypes.any,
    postMessage: PropTypes.func
  }),
  colDef: PropTypes.any,
  getBudgetTableData: PropTypes.func,
  planDetails: PropTypes.any,
  planKpiConfig: PropTypes.any,
  rowData: PropTypes.shape({
    length: PropTypes.number
  }),
  setBudgeTableRowData: PropTypes.func,
  setTrackBudgetTableChanges: PropTypes.func,
  tableRef: PropTypes.any,
  tableRowDataRef: PropTypes.shape({
    current: PropTypes.any
  }),
  trackBudgetTableChanges: PropTypes.any,
  fetchShowHideData: PropTypes.func,
  showHideMetricsData: PropTypes.any,
  setBudgetShowHideMetricsData: PropTypes.func,
  showHideMetricLoader: PropTypes.bool
};

export default connect(mapState, mapDispatch)(MockBudgetTable);
