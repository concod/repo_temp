import { chunk, cloneDeep, get } from "lodash";
import {
  CHANNEL_HIERARCHY_KEY,
  PRODUCT_HIERARCHY_KEY,
  WEEK_KEY
} from "../budgetTableCalculation.constant";
import rollDownUtil from "../rollDown.util";
import rollUp from "../rollUp.util";
import timeRollDown from "../timeRollDown.util";
import timeRollUp from "../timeRollUp.util";
import getLockedCellsForKPIUtil from "./getLockedCellsForKPI.util";

export default function ({
  rollDownQueue,
  kpiFlow,
  isDeliveryCalculation = false,
  isSelf = false
}) {
  this.lockedCells = getLockedCellsForKPIUtil.call(this, {
    kpi: kpiFlow.kpi
  });

  if (!isDeliveryCalculation && isSelf) {
    rollDownUtil.call(this, {
      rollDownQueue,
      kpiFlow,
      rollDownPriority: ["product", "channel"],
      rollDownLockedCells: []
    });
  }

  if (this.lastRollDownHierarchy === null) {
    this.lastRollDownHierarchy = CHANNEL_HIERARCHY_KEY;
  }

  const rollUpQueue = chunk(rollDownQueue, 100);

  rollUpQueue.forEach((queue) => {
    rollUp.call(this, {
      rollUpQueue: queue,
      kpiFlow,
      finalRollDownQueue: rollDownQueue
    });
  });

  if (isSelf) {
    // remove residual locks from logically locked scenarios
    const uniqueColIds = [
      ...new Set(Object.values(rollDownQueue).map((item) => item.colId))
    ];

    const changedTimeLineChannelParent = this.channelRollUpMapping[
      uniqueColIds[0]
    ];

    [
      changedTimeLineChannelParent,
      ...this.channelRollDownMapping[changedTimeLineChannelParent]
    ].forEach((colId) => {
      delete this.lockedCells[colId];
    });
  }

  const timeRollDownQueue = cloneDeep(rollDownQueue);

  if (!isDeliveryCalculation) {
    timeRollDown.call(this, {
      timeRollDownQueue,
      kpiFlow
    });
  }

  const timeLineChildRollQueue = [];

  function groupQueueByRowIndex(arr) {
    const grouped = arr.reduce((acc, obj) => {
      const { rowInx } = obj;
      if (!acc[rowInx]) {
        acc[rowInx] = [];
      }
      acc[rowInx].push(obj);
      return acc;
    }, {});

    // Return the grouped objects as an array of arrays
    return Object.values(grouped);
  }

  const timeQueue = groupQueueByRowIndex(timeRollDownQueue);

  timeQueue.forEach((queue) => {
    // queue is split based on rowInx, when the new queue starts the elements are from week level so reset timeRollupLevel
    this.timeRollupLevel = -1;
    timeRollUp.call(this, {
      timeRollUpQueue: cloneDeep(queue),
      timeLineChildRollQueue: timeLineChildRollQueue,
      kpiFlow
    });
  });

  const timeRollupQueue = chunk(
    [...timeRollDownQueue, ...timeLineChildRollQueue],
    100
  );

  this.lockedCells = {};

  timeRollupQueue.forEach((queue) => {
    rollUp.call(this, {
      rollUpQueue: queue,
      kpiFlow
    });
  });

  // filtering week columns to run dependent kpi calculations
  this.rollDownQueue = [...timeRollDownQueue, ...timeLineChildRollQueue].filter(
    (rollDownQueueKey) => {
      const columnCategory = get(
        this.columnsMap[rollDownQueueKey.colId],
        "extra.category",
        []
      );

      return columnCategory.includes(WEEK_KEY);
    }
  );
}
