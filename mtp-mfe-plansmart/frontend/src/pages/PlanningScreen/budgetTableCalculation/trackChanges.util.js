import { get, findIndex, isEqual } from "lodash";
import getHierarchyValues from "./common/getHierarchyValues.util";
import {
  CHANNEL_HIERARCHY_KEY,
  UPDATE_PAYLOAD_TIMELINE_KEY
} from "./budgetTableCalculation.constant";

function trackChanges({ rowIndex, oldValue, newValue, columnId }) {
  const currentRow = this.rowData[rowIndex];
  const channel = get(
    this.columnsMap,
    [columnId, "extra", CHANNEL_HIERARCHY_KEY],
    ""
  );
  const timelineKey = get(
    this.columnsMap,
    [columnId, "extra", UPDATE_PAYLOAD_TIMELINE_KEY],
    ""
  );

  if (!channel || !currentRow) return;

  const hierarchyValues = getHierarchyValues.call(this, { row: currentRow });
  const channelHierarchyUpdate = {
    channel,
    level: hierarchyValues
  };

  const changeIndex = findIndex(
    this.trackBudgetTableChanges,
    (trackedChange) => {
      const trackedHierarchyValues = {
        channel: trackedChange.channel,
        level: trackedChange.level
      };
      return isEqual(channelHierarchyUpdate, trackedHierarchyValues);
    }
  );

  if (changeIndex === -1) {
    this.trackBudgetTableChanges.push(
      createNewChangeObj(
        channelHierarchyUpdate,
        currentRow,
        timelineKey,
        oldValue,
        newValue
      )
    );
  } else {
    updateExistingChange(
      this.trackBudgetTableChanges[changeIndex],
      currentRow,
      timelineKey,
      oldValue,
      newValue
    );
  }
}

function createNewChangeObj(
  channelHierarchyUpdate,
  row,
  columnId,
  oldValue,
  newValue
) {
  return {
    ...channelHierarchyUpdate,
    updates: [
      {
        kpi: row.metric_key,
        timeline: [{ time: columnId, old: oldValue, new: newValue }]
      }
    ]
  };
}

function updateExistingChange(changeObj, row, columnId, oldValue, newValue) {
  const kpiIndex = findIndex(
    changeObj.updates,
    (update) => update.kpi === row.metric_key
  );

  if (kpiIndex === -1) {
    changeObj.updates.push({
      kpi: row.metric_key,
      timeline: [{ time: columnId, old: oldValue, new: newValue }]
    });
  } else {
    const timelineIndex = findIndex(
      changeObj.updates[kpiIndex].timeline,
      (time) => time.time === columnId
    );

    if (timelineIndex === -1) {
      changeObj.updates[kpiIndex].timeline.push({
        time: columnId,
        old: oldValue,
        new: newValue
      });
    } else {
      changeObj.updates[kpiIndex].timeline[timelineIndex] = {
        time: columnId,
        old: oldValue,
        new: newValue
      };
    }
  }
}

export default trackChanges;
