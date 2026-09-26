import Table from "core/Utils/agGrid";
import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useState
} from "react";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import makeStyles from "@mui/styles/makeStyles";
import { Chip, Stack } from "@mui/material";
import PropTypes from "prop-types";
import * as apis from "../../apis/planningScreen.api";
import * as actions from "../../slice/planningScreen.slice";
import {
  activeViewSettingsSelector,
  activeViewShowOrHideMetricsDataSelector,
  setActiveViewMetricsData
} from "../../../ViewManagement/viewManagement.slice";
import CellRenderer from "../../../../components/planSmart/CellRenderer/CellRenderer";
import {
  productHierarchies,
  rollDownPriority,
  rollUpPriority
} from "../../apis/budgetTable.data";
import { cloneDeep, get, isEmpty, merge, noop } from "lodash";
import removeFuncFromArrayObject from "../../../../utils/removeFuncFromArrayObject.util";
import flashEditedCells from "../../../../utils/flashCells.util";
import getColumnMaps from "../../../../utils/getColumnMaps.util";
import ShowOrHideMetrics from "../../../../components/planSmart/ShowOrHideMetrics/ShowOrHideMetrics";
import {
  isExternalFilterPresent,
  doesExternalFilterPass
} from "../../../../utils/validateTableCell.util";

import {
  BUDGET_TABLE_ROW_HEIGHT,
  CLASS,
  DEPARTMENT,
  PLANNING_SCREEN,
  calcOnServer
} from "../../planningScreen.constant";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-alpine.css";
import "core/Utils/agGrid/ag-theme-mtp.scss";
import styles from "./BudgetTable.module.css";
import {
  getContributionValues,
  customTabFunction,
  addGroupingMenuItems
} from "./budgetTable.util";
import processClipboardValues from "../../../../utils/clipboard.util";
import redrawBudgetTable from "../../../../utils/redrawBudgetTable.util";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import agGridColumnFormatter from "../../../../core/Utils/agGrid/column-formatter";
import valueGetter from "../../budgetTableCalculation/valueGetter/valueGetter.util";
import ViewSettingPreferences from "./SavePreferences/ViewSettingPreferences";
import PreferencesShowHideMetrics from "./SavePreferences/PreferencesShowHideMetrics/PreferencesShowHideMetrics";
import {
  applyGridSettings,
  applyShowHideMetricsChange
} from "../TableGridSettings/TableGridSettings.util";
import {
  selectedMetricsPayloadSelector,
  selectedViewSettingsPayloadSelector
} from "../../../../core/Utils/agGrid/TableViewManagement/table-view/table-view-panel-service";
import { TABLE_SETTINGS } from "./constants";
import { useLocation } from "react-router-dom-v5-compat";
import { budgetTableCalculateApi } from "./apis/budgetTable.api";
import handleVarianceChange from "../../budgetTableCalculation/handleVarianceChange.util";
import isVarianceChanged from "../../budgetTableCalculation/common/isVarianceChanged.util";
import classNames from "classnames";

const useStyles = makeStyles(() => ({
  customHeight: {
    "& .ag-root-wrapper-body": {
          minHeight: "73vh"
    }
  },
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

function BudgetTable(props) {
  const {
    colDef,
    rowData,
    planDetails,
    planKpiConfig,
    planKpiConfigV2,
    calculationWorker,
    setBudgeTableRowData,
    tableRef,
    tableRowDataRef,
    trackBudgetTableChanges,
    setTrackBudgetTableChanges,
    showHideMetricsData,
    setBudgetShowHideMetricsData,
    viewType,
    rowDataInxMapping,
    currentVersion,
    varianceMapping,
    varianceList,
    showHideMetricLoader,
    timeRollUpMapping,
    timeRollDownMapping,
    channelRollUpMapping,
    channelRollDownMapping,
    formula,
    versionBudgetTableRowData,
    lockedCellRef,
    productContributionMapping,
    channelContributionMapping,
    productContributionParentMapping,
    channelContributionParentMapping,
    comparePlanLists,
    versionListRowData,
    previousTimelineMapping,
    isVersionChipVisible,
    setIsVersionChipVisible,
    setPrevSelectedPlans,
    isTargetPlan,
    seasonType,
    setVersionListData,
    deliveryData,
    preferencesViewSettingsPayload,
    preferencesMetricsPayload,
    tableViewSettingsPayload,
    gridSettings,
    setGridSettings,
    initialBudgetTableResp,
    initialTableRowDataRef,
    initialBudgetTableRowData,
    editMode,
    valueByColumnValueKey,
    productHierarchyKeys,
    planActualizedWeeks,
    tableLoader = false,
    calculationUUIDRef,
    setIsUpdatePlanEnabled,
    setCalculationUUID,
    isUndo = false,
    isMatchWith,
    isAllColumnCollapse,
    activeViewTableSettings,
    activeViewMetrics
  } = props;

  if (isAllColumnCollapse) {
    const displayedGroups = Object.values(
      tableRef?.current?.columnApi?.columnModel?.displayedColumnsAndGroupsMap
    );

    displayedGroups.forEach((group) => {
      tableRef?.current?.columnApi?.setColumnGroupState([
        { groupId: group.groupId, open: true }
      ]);
    });
  }

  const { wrtnToDelvrData, writtenRollDownMapping } = deliveryData;

  const classes = useStyles();
  const dispatch = useDispatch();
  const location = useLocation();

  const pathName = location?.pathname;
  const trackBudgetTableChangesRef = useRef(trackBudgetTableChanges);

  tableRowDataRef.current = rowData;
  initialTableRowDataRef.current = initialBudgetTableRowData;
  trackBudgetTableChangesRef.current = trackBudgetTableChanges;

  const planCode = get(planDetails, "plan_code", null)?.toString();
  const userPreferencesTableName = "plansmart_planning_col";
  const hierarchyLevels = valueByColumnValueKey.filter((level) =>
    productHierarchyKeys.includes(level)
  );

  const clipboardStaticParams = {
    planKpiConfig: planKpiConfigV2,
    currentVersion,
    valueByColumnValueKey,
    varianceList,
    varianceMapping,
    editMode,
    planActualizedWeeks,
    planDetails,
    tableRowDataRef,
    lockedCellRef
  };

  useEffect(() => {
    return () => {
      setVersionListData([]);
      setPrevSelectedPlans([]);
    };
  }, [pathName]);

  useEffect(() => {
    tableRef?.current?.api?.onFilterChanged();
  }, [showHideMetricsData, gridSettings]);

  const [disableKeyboardActions, setDisableKeyboardActions] = useState(false);

  const handleKeyDown = (event) => {
    if (disableKeyboardActions) {
      if (event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [disableKeyboardActions]);

  const formattedColDef = useMemo(
    () =>
      agGridColumnFormatter(
        colDef,
        {},
        {
          customValueGetter: (cellProps) =>
            valueGetter(cellProps, tableRowDataRef, versionListRowData, props)
        }
      ),
    [colDef, versionListRowData]
  );

  useEffect(() => {
    if (isMatchWith) {
      tableRef?.current?.api?.refreshCells({
        force: true
      });
      dispatch(actions.setIsMatchWith(false));
    }
  }, [isMatchWith]);

  const handleChange = (changeDetected, cellProps) => {
    if (!cellProps) return;
    const columnDefs = removeFuncFromArrayObject(cloneDeep(colDef));
    const changedColumnDef = removeFuncFromArrayObject([
      cellProps.column.userProvidedColDef
    ])[0];
    const tableRows = get(tableRowDataRef, "current", []) || [];
    const initialTableRows = get(initialTableRowDataRef, "current", []) || [];
    const columnsMap = getColumnMaps(
      get(tableRef, "current.columnApi.columnModel.gridColumnsMap", {}),
      true
    );

    const isContributionCol = get(
      changedColumnDef,
      "extra.contribution",
      false
    );

    const { before_user_entered_value, user_entered_value } = changeDetected;
    if (
      Math.round(before_user_entered_value) !== Math.round(user_entered_value)
    ) {
      if (!isContributionCol) {
        runBudgetCaluculation(
          cellProps,
          columnDefs,
          tableRows,
          columnsMap,
          changeDetected,
          changedColumnDef,
          lockedCellRef.current,
          initialTableRows,
          isUndo
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
          lockedCellRef.current,
          initialTableRows
        );

        runBudgetCaluculation(
          cellProps,
          columnDefs,
          tableRows,
          columnsMap,
          updatedValues?.updatedChangedCellData,
          updatedValues?.updatedChangedColumnDef,
          updatedValues?.updatedLockedCells,
          initialTableRows,
          isUndo
        );
      }
    }
  };

  const runBudgetCaluculation = (
    cellProps,
    columnDefs,
    tableRows,
    columnsMap,
    updatedChangedCellData,
    updatedChangedColumnDef,
    lockedCells,
    initialRowData,
    isUndo
  ) => {
    const { point_variance_list: pointVarianceList = [] } =
      planKpiConfig[cellProps.data.metric_key] || {};

    if (calcOnServer()) {
      const context = {
        varianceList: varianceList,
        changedCellData: updatedChangedCellData,
        changedRow: cellProps.data,
        rowDataInxMapping: rowDataInxMapping,
        valueByColumnValueKey: valueByColumnValueKey,
        changedColumnDef: updatedChangedColumnDef,
        rowData: tableRows,
        varianceMapping: varianceMapping,
        currentVersion: currentVersion,
        pointVarianceList: pointVarianceList
      };

      const isVariance = isVarianceChanged.call(context, {
        row: cellProps.data
      });

      const payload = {
        columnId: updatedChangedColumnDef.accessor,
        planCode: planCode,
        module: "pre-season",
        lockedCells,
        session_id: calculationUUIDRef.current,
        trackBudgetTableChanges: [],
        columnDefs: []
      };

      if (isVariance) {
        const {
          changedRowInx,
          changedCellData
        } = handleVarianceChange.call(context, { calcOnServer: true });

        payload.changedRowInx = changedRowInx;
        payload.changedCellData = changedCellData;
      } else {
        payload.changedRowInx = cellProps.data.index;
        payload.changedCellData = updatedChangedCellData;
      }

      budgetTableCalculateApi(payload, dispatch, tableRows, tableRef);
    } else {
      dispatch(actions.setBudgetTableLoader(true));
      let flattenTimeRollDownMapping = {};
      setDisableKeyboardActions(true);

      timeRollDownMapping.forEach((rollDownMapping) => {
        flattenTimeRollDownMapping = {
          ...flattenTimeRollDownMapping,
          ...rollDownMapping
        };
      });

      calculationWorker.postMessage([
        {
          rowData: tableRows,
          initialRowData: initialRowData,
          changedCellData: updatedChangedCellData,
          changedRow: cellProps.data,
          columnDefs: columnDefs,
          changedColumnDef: updatedChangedColumnDef,
          changedRowInx: cellProps.data.index,
          timeRollUpMapping: timeRollUpMapping,
          timeRollDownMapping: flattenTimeRollDownMapping,
          timeRollDownGroupMapping: timeRollDownMapping,
          channelRollUpMapping: channelRollUpMapping,
          valueByColumnValueKey: valueByColumnValueKey,
          rowDataInxMapping: rowDataInxMapping,
          kpiFlow: formula,
          channelRollDownMapping: channelRollDownMapping,
          columnsMap: columnsMap,
          varianceList: varianceList,
          varianceMapping: varianceMapping,
          kpiConfig: planKpiConfig,
          kpiConfigV2: planKpiConfigV2,
          currentVersion: currentVersion,
          trackBudgetTableChanges: trackBudgetTableChangesRef.current,
          productHierarchies: productHierarchies,
          rollDownPriority: rollDownPriority,
          rollUpPriority: rollUpPriority,
          lockedCells: lockedCells,
          productContributionMapping: productContributionMapping,
          channelContributionMapping: channelContributionMapping,
          previousTimelineMapping: previousTimelineMapping,
          logCalculations: localStorage.getItem("logCalculations"),
          deliveryData: wrtnToDelvrData,
          writtenRollDownMapping: writtenRollDownMapping,
          planActualizedWeeks: planActualizedWeeks,
          planDetails: planDetails
        }
      ]);
      calculationWorker.onmessage = (e) => {
        dispatch(actions.setBudgetTableLoader(false));
        const newRowData = e.data.rowData;
        const newTrackBudgetTableChanges = e.data.trackBudgetTableChanges;
        const newRefreshCells = e?.data?.refreshCells;
        setBudgeTableRowData(newRowData);
        setTrackBudgetTableChanges(newTrackBudgetTableChanges);
        redrawBudgetTable({ tableRef, rowData: newRefreshCells.rowData });
        flashEditedCells({ tableRef, newRefreshCells });
      };
    }
  };

  const innerRendererFunc = (props) => {
    const value = props.value;
    const columnDef = props.node.field;
    const formattedValue =
      columnDef === CLASS || DEPARTMENT
        ? replaceSpecialCharacter(value)
        : value;
    return formattedValue;
  };

  const doesExternalFilterPassCallback = useCallback(
    (node) =>
      doesExternalFilterPass(
        node,
        showHideMetricsData,
        isTargetPlan,
        gridSettings,
        hierarchyLevels
      ),
    [showHideMetricsData, gridSettings]
  );

  const handleRemoveVersion = (plan) => {
    //updated ShowHide Metrics
    const [kipData, versionData = [], bucketData = []] =
      showHideMetricsData || [];
    const updatedVersionData = versionData.filter((group) => {
      return group.plan_code !== plan.plan_code;
    });
    const updatedShowHideMetricsData1 =
      showHideMetricsData.length === 2
        ? [kipData, updatedVersionData]
        : [kipData, updatedVersionData, bucketData];

    setBudgetShowHideMetricsData(updatedShowHideMetricsData1);

    //update currentView metrics Details
    const [kipsData, versionsData = [], bucketsData = []] =
      activeViewMetrics || [];

    const updatedVersionsData = versionsData.filter((group) => {
      return group.plan_code !== plan.plan_code;
    });

    const updatedShowHideMetrics =
      activeViewMetrics.length === 2
        ? [kipsData, updatedVersionsData]
        : [kipsData, updatedVersionsData, bucketsData];

    dispatch(setActiveViewMetricsData(updatedShowHideMetrics));

    const prevSelectedPlans = comparePlanLists.filter((version) => {
      return version.plan_code !== plan.plan_code;
    });
    setPrevSelectedPlans(prevSelectedPlans);

    if (versionListRowData.hasOwnProperty(planCode)) {
      delete versionListRowData[planCode];
    }

    setVersionListData(versionListRowData);
  };

  const handleDefaultViewValueChange = (configData) => {
    if (configData) {
      if (!isEmpty(configData?.custom_tab_preferences?.view_setting)) {
        applyGridSettings({
          applyCallBack: (updatedSettings) =>
            dispatch(actions.setTableViewSetting(updatedSettings)),
          showHideMetricsData:
            configData?.custom_tab_preferences?.show_hide_metrics,
          setGridSettings,
          settings: configData?.custom_tab_preferences?.view_setting,
          tableRef,
          currentVersion,
          versionVarianceMap: varianceMapping,
          setShowHideMetricsData: (showHideMetricsData) =>
            setBudgetShowHideMetricsData(showHideMetricsData)
        });
      } else {
        //No code here
      }

      if (!isEmpty(configData?.custom_tab_preferences?.view_setting)) {
        applyShowHideMetricsChange({
          setShowHideMetricsData: setBudgetShowHideMetricsData,
          tableRef,
          updatedMetricData:
            configData?.custom_tab_preferences?.show_hide_metrics
        });
      }
    } else {
      return;
    }
  };

  return (
    <div
      className={`${styles.tableContainer} ag-theme-alpine`}
      style={{ pointerEvents: "auto" }}
    >
      {isVersionChipVisible && Boolean(get(comparePlanLists, "length", 0)) && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          gap={1}
          paddingBottom={4}
        >
          {comparePlanLists.map((plan) => (
            <Chip
              label={plan.name}
              onDelete={() => handleRemoveVersion(plan)}
            />
          ))}
        </Stack>
      )}

      {!showHideMetricLoader && rowData.length > 0 && (
        <Table
          skipAutoSizeColumnOnSideBarAction={true}
          skipAutoSizeColumn={false}
          sizeColumnsToFitFlag={false}
          restrictResize={true}
          minWidth={100}
          tableRef={tableRef}
          uniqueId="order"
          columns={formattedColDef}
          rowdata={versionBudgetTableRowData}
          uniqueRowId="order"
          pagination={false}
          suppressRowTransform={true}
          showSaveTableConfig={false}
          rowHeight={BUDGET_TABLE_ROW_HEIGHT}
          addGroupingMenuItems={addGroupingMenuItems}
          customCellRenderer={(props) => (
            <CellRenderer
              planKpiConfig={planKpiConfig}
              onChange={(changeDetected, cellProps) =>
                handleChange(changeDetected, cellProps)
              }
              viewType={viewType}
              valueByColumnValueKey={valueByColumnValueKey}
              editMode={editMode}
              varianceList={varianceList}
              currentVersion={currentVersion}
              {...props}
            />
          )}
          noEditableCustomCellRender={(props) => (
            <CellRenderer
              viewType="view"
              valueByColumnValueKey={valueByColumnValueKey}
              editMode={false}
              varianceList={varianceList}
              currentVersion={currentVersion}
              {...props}
            />
          )}
          // rowHeight={BUDGET_TABLE_ROW_HEIGHT}
          valueCache={true}
          getRowData={(params, columnName) => params?.data?.[columnName]}
          //TO-DO: Remove post verification
          // customSideBar={[
          //   {
          //     id: "show_or_hide_section",
          //     labelDefault: "Show/Hide metrics",
          //     labelKey: "show_hide_metrics",
          //     iconKey: "menu",
          //     toolPanel: ShowOrHideMetrics,
          //     toolPanelParams: {
          //       tableRef: tableRef,
          //       setShowHideMetricsData: setBudgetShowHideMetricsData,
          //       planScreen: PLANNING_SCREEN,
          //       isTargetPlan: isTargetPlan
          //     },
          //     height: 600,
          //     minHeight: 600,
          //     maxHeight: 600
          //   }
          // ]}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPassCallback}
          enableRangeSelection={true}
          processDataFromClipboard={(params) =>
            processClipboardValues({
              tableRef,
              params,
              calculationWorker,
              clipboardStaticParams,
              setBudgeTableRowData,
              setTrackBudgetTableChanges,
              redrawBudgetTable,
              flashEditedCells,
              calculationUUID: calculationUUIDRef.current,
              dispatch,
              setIsUpdatePlanEnabled,
              setCalculationUUID,
              rowDataInxMapping: rowDataInxMapping
            })
          }
          rowGroupPanelShow={"always"}
          rowDragManaged={true}
          isGroupOpenByDefault={() => {
            return true;
          }}
          groupRowRendererParams={{
            suppressCount: true,
            innerRenderer: innerRendererFunc
          }}
          groupDisplayType={"groupRows"}
          planSmartPlanCode={planCode}
          handleDefaultViewValueChange={handleDefaultViewValueChange}
          tableLoader={tableLoader}
          customTabFunction={(event, column, instance) => {
            return customTabFunction({
              column,
              instance,
              event,
              planDetails,
              planKpiConfigV2,
              varianceList,
              varianceMapping,
              lockedCells: lockedCellRef.current
            });
          }}
          customClass={classNames(
            { "sidebar-disabled": tableLoader },
            classes.customHeight,
            classes.customGrid
          )}
          showSearchModalBtn={false}
        />
      )}
    </div>
  );
}

const mapState = (state) => ({
  colDef: actions.budgetTableColDefSelector(state),
  rowData: actions.budgetTableRowDataSelector(state),
  planDetails: actions.planDetailsSelector(state),
  planKpiConfig: actions.planKpiConfigSelector(state),
  planKpiConfigV2: actions.planKpiConfigV2Selector(state),
  trackBudgetTableChanges: actions.trackBudgetTableChangesSelector(state),
  showHideMetricsData: actions.showHideMetricsDataSelector(state),
  rowDataInxMapping: actions.rowDataInxMappingSelector(state),
  currentVersion: actions.currentVersionSelector(state),
  varianceMapping: actions.varianceVersionMappingSelector(state),
  varianceList: actions.varianceListSelector(state),
  showHideMetricLoader: actions.showHideMetricLoaderSelector(state),
  timeRollUpMapping: actions.timeRollUpMappingSelector(state),
  timeRollDownMapping: actions.timeRollDownMappingSelector(state),
  channelRollUpMapping: actions.channelRollUpMappingSelector(state),
  channelRollDownMapping: actions.channelRollDownMappingSelector(state),
  formula: actions.formulaSelector(state),
  versionBudgetTableRowData: actions.versionDataMergeSelector(state),
  productContributionMapping: actions.productContributionMappingSelector(state),
  channelContributionMapping: actions.channelContributionMappingSelector(state),
  productContributionParentMapping: actions.productContributionParentMappingSelector(
    state
  ),
  channelContributionParentMapping: actions.channelContributionParentMappingSelector(
    state
  ),
  comparePlanLists: actions.prevSelectedPlansSelector(state),
  versionListRowData: actions.versionListDataSelector(state),
  previousTimelineMapping: actions.previousTimelineMappingSelector(state),
  budgetTableResp: actions.budgetTableRespSelector(state),
  isVersionChipVisible: actions.isVersionChipVisibleSelector(state),
  deliveryData: actions.deliveryDataSelector(state),
  preferencesViewSettingsPayload: selectedViewSettingsPayloadSelector(state),
  preferencesMetricsPayload: selectedMetricsPayloadSelector(state),
  tableViewSettingsPayload: actions.userPrefViewSettingsPayloadSelector(state),
  initialBudgetTableResp: actions.initialBudgetTableRespSelector(state),
  initialBudgetTableRowData: actions.initialBudgetTableRowDataSelector(state),
  valueByColumnValueKey: actions.valueByColumnValueKeySelector(state),
  productHierarchyKeys: actions.productHierarchySelector(state),
  planActualizedWeeks: actions.planActualizedWeeksSelector(state),
  isUpdatePlanEnabled: actions.isUpdatePlanEnabledSelector(state),
  calculationUUID: actions.calculationUUIDSelector(state),
  isMatchWith: actions.isMatchWithSelector(state),
  isAllColumnCollapse: actions.isAllColumnCollapseSelector(state),
  activeViewTableSettings: activeViewSettingsSelector(state),
  activeViewMetrics: activeViewShowOrHideMetricsDataSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions, ...apis }, dispatch)
  };
};

BudgetTable.propTypes = {
  tableLoader: PropTypes.any,
  calculationWorker: PropTypes.shape({
    onmessage: PropTypes.any,
    postMessage: PropTypes.func
  }),
  channelRollDownMapping: PropTypes.any,
  channelRollUpMapping: PropTypes.any,
  colDef: PropTypes.any,
  currentVersion: PropTypes.any,
  formula: PropTypes.any,
  getBudgetTableData: PropTypes.func,
  planDetails: PropTypes.any,
  planKpiConfig: PropTypes.any,
  planKpiConfigV2: PropTypes.any,
  rowData: PropTypes.shape({
    length: PropTypes.number
  }),
  rowDataInxMapping: PropTypes.any,
  setBudgeTableRowData: PropTypes.func,
  setTrackBudgetTableChanges: PropTypes.func,
  tableRowDataRef: PropTypes.shape({
    current: PropTypes.any
  }),
  trackBudgetTableChanges: PropTypes.any,
  showHideMetricsData: PropTypes.array,
  setBudgetShowHideMetricsData: PropTypes.func,
  showHideMetricLoader: PropTypes.bool,
  tableRef: PropTypes.shape({
    current: PropTypes.shape({
      api: PropTypes.shape({
        flashCells: PropTypes.func,
        getRowNode: PropTypes.func,
        onFilterChanged: PropTypes.func,
        refreshCells: PropTypes.func
      })
    })
  }),
  timeRollDownMapping: PropTypes.any,
  timeRollUpMapping: PropTypes.any,
  trackBudgetTableChanges: PropTypes.any,
  varianceList: PropTypes.array,
  varianceMapping: PropTypes.any,
  viewType: PropTypes.any,
  versionBudgetTableRowData: PropTypes.array,
  productContributionMapping: PropTypes.object,
  channelContributionMapping: PropTypes.object,
  productContributionParentMapping: PropTypes.object,
  channelContributionParentMapping: PropTypes.object,
  deliveryData: PropTypes.object,
  preferencesViewSettingsPayload: PropTypes.array,
  tableViewSettingsPayload: PropTypes.array,
  isVersionChipVisible: PropTypes.bool,
  setIsVersionChipVisible: PropTypes.func,
  setPrevSelectedPlans: PropTypes.func,
  setVersionListData: PropTypes.func,
  lockedCellRef: PropTypes.object,
  isUndo: PropTypes.bool,
  isMatchWith: PropTypes.bool,
  isAllColumnCollapse: PropTypes.bool,
  activeViewMetrics: PropTypes.shape({
    length: PropTypes.number
  })
};

export default connect(mapState, mapDispatch)(BudgetTable);
