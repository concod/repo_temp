import runDependentFlow from "./common/runDependentFlow.util";
import contributionCalculation from "./contributionCalculation.util";

import { leafTimelineMapping } from "../apis/budgetTable.data";
import updateRowDataUtil from "./common/updateRowData.util";
import runSequentialTimelineUpdate from "./runSequentialTimelineUpdate.util";
import { cloneDeep } from "lodash";
import trackChangesHandler from "./trackChangesHandler.util";
import getUniqueDetails from "./common/getUniqueDetails.util";
import isVarianceChanged from "./common/isVarianceChanged.util";
import handleVarianceChange from "./handleVarianceChange.util";
import runDeliveryCalculation from "./runDeliveryCalculation.util";

const getFutureTimelineMapping = (previousTimelineMapping) => {
  const futureTimelineMapping = Object.entries(previousTimelineMapping).reduce(
    (acc, [key, value]) => {
      return {
        ...acc,
        [value]: key
      };
    },
    {}
  );
  return futureTimelineMapping;
};

async function main({
  rowData,
  columnDefs,
  changedRow,
  changedColumnDef,
  changedRowInx,
  changedCellData,
  timeRollUpMapping,
  channelRollUpMapping,
  valueByColumnValueKey,
  rowDataInxMapping,
  kpiFlow,
  channelRollDownMapping,
  columnsMap,
  varianceList,
  varianceMapping,
  kpiConfig,
  kpiConfigV2,
  currentVersion,
  timeRollDownMapping,
  trackBudgetTableChanges,
  productHierarchies,
  rollDownPriority,
  rollUpPriority,
  lockedCells,
  previousTimelineMapping = {},
  refreshCells = {
    rowData: [],
    columnDef: [],
    parentRowIndex: []
  },
  initialRowData,
  productContributionMapping,
  channelContributionMapping,
  logCalculations,
  deliveryData,
  writtenRollDownMapping,
  timeRollDownGroupMapping,
  planActualizedWeeks,
  planDetails
}) {
  const kpiDependentFlow = kpiFlow[changedRow.metric_key] || [];
  this.rowData = rowData;
  this.initialRowData = cloneDeep(initialRowData);
  this.columnDefs = columnDefs;
  this.changedRow = changedRow;
  this.changedColumnDef = changedColumnDef;
  this.changedRowInx = changedRowInx;
  this.currentRow = changedRow;
  this.kpiFlow = kpiFlow;
  this.changedKpiDependentFlow = kpiDependentFlow.filter(
    (flow) => !flow.sequenceflow
  );
  this.changedColumnSequenceDependentFlowAllWeeks = kpiDependentFlow.filter(
    (flow) => flow.sequenceflow && flow.allsequencetimelineupdate
  );
  this.changedColumnSequenceDependentFlowNWeeks = kpiDependentFlow.filter(
    (flow) =>
      flow.sequenceflow &&
      !flow.allsequencetimelineupdate &&
      flow.sequencetimelinecount > 0
  );
  this.changedKpiDeliveryDependentFlow = kpiDependentFlow.filter(
    (flow) => flow?.deliveryMetrics?.isDelivery
  );
  this.changedCellData = changedCellData;
  this.timeRollUpMapping = timeRollUpMapping;
  this.changedTimeRollUpList =
    this.timeRollUpMapping[changedColumnDef.accessor] || [];
  this.timeRollDownMapping = timeRollDownMapping;
  this.channelRollUpMapping = channelRollUpMapping;
  this.valueByColumnValueKey = valueByColumnValueKey;
  this.rowDataInxMapping = rowDataInxMapping;
  this.channelRollDownMapping = channelRollDownMapping;
  this.columnsMap = columnsMap;
  this.varianceList = varianceList;
  this.varianceMapping = varianceMapping;
  this.kpiConfig = kpiConfig;
  this.kpiConfigV2 = kpiConfigV2;
  this.currentVersion = currentVersion;
  this.leafTimelineMapping = leafTimelineMapping;
  this.trackBudgetTableChanges = trackBudgetTableChanges;
  this.productHierarchies = valueByColumnValueKey.filter(
    (key) => key !== "plan_version"
  );
  this.rollDownPriority = rollDownPriority;
  this.rollUpPriority = rollUpPriority;
  this.lockedCells = lockedCells;
  this.currentHierarchy = null;
  this.visitedLockeCells = [];
  this.refreshCells = refreshCells;
  this.productContributionMapping = productContributionMapping;
  this.channelContributionMapping = channelContributionMapping;
  this.previousTimelineMapping = Object.fromEntries(
    Object.entries(previousTimelineMapping).map(([key, value]) => [
      key.split("_")[1],
      value.split("_")[1]
    ])
  );
  this.futureTimelineMapping = getFutureTimelineMapping(
    this.previousTimelineMapping
  );

  this.lastRollDownHierarchy = null;

  this.timelineRollDownQueue = [];
  this.trackChangedRowInxColInx = [];

  this.logCalculations = logCalculations;

  this.deliveryData = deliveryData;
  this.writtenRollDownMapping = writtenRollDownMapping;

  this.changedKpi = changedRow.metric_key;
  this.rollDownQueue = [];
  this.skipEditibilityFlow = false;
  this.timeRollupLevel = -1;
  this.timeRollDownGroupMapping = timeRollDownGroupMapping;
  this.planActualizedWeeks = planActualizedWeeks;
  this.planDetails = planDetails;

  let isError = false;
  try {
    const isVariance = isVarianceChanged.call(this, { row: changedRow });

    if (isVariance) {
      return handleVarianceChange.call(this);
    }
    console.time("calculation");
    const rollDownQueue = [
      {
        rowInx: this.changedRowInx,
        colId: this.changedColumnDef.column_name,
        changedCellData: this.changedCellData,
        isChannelEligible: true // if user is able to edit it is an eligible channel
      }
    ];

    runDependentFlow.call(this, {
      dependentFlow: this.changedKpiDependentFlow,
      initialRollDownQueue: rollDownQueue
    });

    // console.time("runDeliveryCalculation");
    // await runDeliveryCalculation.call(this, {
    //   rollDownQueue: this.rollDownQueue,
    // });
    // console.timeEnd("runDeliveryCalculation");

    // for kpi that update N weeks
    // runSequentialTimelineUpdate.call(this, {
    //   kpiFlow: this.changedColumnSequenceDependentFlowNWeeks
    // });

    // for kpi that update all the weeks
    // runSequentialTimelineUpdate.call(this, {
    //   kpiFlow: this.changedColumnSequenceDependentFlowAllWeeks
    // });

    console.timeEnd("calculation");
  } catch (error) {
    isError = true;
    console.log("error", error);
    updateRowDataUtil.call(this, {
      rowInx: this.changedRowInx,
      key: this.changedColumnDef.column_name,
      value: this.changedCellData.before_user_entered_value
    });
  }

  if (!isError) {
    const { uniqueTrackChangedRowInxColInx } = getUniqueDetails.call(this);
    trackChangesHandler.call(this, {
      uniqueTrackChangedRowInxColInx
    });
  }

  return {
    rowData: this.rowData,
    trackBudgetTableChanges: this.trackBudgetTableChanges,
    refreshCells: this.refreshCells
  };
}

const budgetTableCalculation = async (params) => {
  return await main.bind({})(params);
};

export default budgetTableCalculation;
