import { findIndex, get } from "lodash";
import rollUpChannel from "./rollUpChannel.util";
import rollUpProduct from "./rollUpProduct.util";
import {
  CHANNEL_HIERARCHY_KEY,
  PRODUCT_HIERARCHY_KEY
} from "./budgetTableCalculation.constant";

function rollUp({ rollUpQueue, kpiFlow, finalRollDownQueue }) {
  const tempRollUpQueue = [];
  if (this.lastRollDownHierarchy === PRODUCT_HIERARCHY_KEY) {
    let { length } = rollUpQueue;
    for (let i = 0; i < length; i += 1) {
      const rollUpQueueKey = rollUpQueue[i];
      const parentInx = get(
        this.rowData[rollUpQueueKey.rowInx],
        "parent_index",
        -1
      );

      if (parentInx !== -1) {
        const productRollUpQueue = [rollUpQueueKey];
        const channelRollupQueue = [rollUpQueueKey];

        const duplicateTempQueueKeyIndex = findIndex(tempRollUpQueue, {
          rowInx: rollUpQueueKey.rowInx,
          colId: this.channelRollUpMapping[rollUpQueueKey.colId][0]
        });

        if (
          this.channelRollUpMapping[rollUpQueueKey.colId] &&
          duplicateTempQueueKeyIndex === -1
        ) {
          rollUpChannel.call(this, {
            channelRollUpQueue: channelRollupQueue,
            rollUpQueue,
            kpiFlow,
            isSingleRollUp: false,
            finalRollDownQueue,
            tempRollUpQueue: tempRollUpQueue
          });
        }

        const duplicateQueueKeyIndex = findIndex(rollUpQueue, {
          rowInx: this.rowData[rollUpQueueKey.rowInx].parent_index,
          colId: rollUpQueueKey.colId
        });

        if (duplicateQueueKeyIndex === -1) {
          rollUpProduct.call(this, {
            productRollUpQueue: productRollUpQueue,
            rollUpQueue,
            kpiFlow,
            isSingleRollUp: true,
            finalRollDownQueue,
            tempRollUpQueue: tempRollUpQueue
          });

          rollUpQueue.push(...productRollUpQueue);
          length = rollUpQueue.length;
        }
      } else if (this.channelRollUpMapping[rollUpQueueKey.colId]) {
        rollUpChannel.call(this, {
          channelRollUpQueue: [rollUpQueueKey],
          rollUpQueue,
          kpiFlow,
          isSingleRollUp: false,
          finalRollDownQueue,
          tempRollUpQueue: tempRollUpQueue
        });

        length = rollUpQueue.length;
      }
    }
  } else if (this.lastRollDownHierarchy === CHANNEL_HIERARCHY_KEY) {
    let { length } = rollUpQueue;
    for (let i = 0; i < length; i += 1) {
      const rollUpQueueKey = rollUpQueue[i];

      const parentChannel = get(
        this.channelRollUpMapping,
        rollUpQueueKey.colId,
        false
      );

      if (parentChannel) {
        const channelRollupQueue = [rollUpQueueKey];
        const productRollupQueue = [rollUpQueueKey];

        const duplicateTempQueueKeyIndex = findIndex(tempRollUpQueue, {
          rowInx: this.rowData[rollUpQueueKey.rowInx].parent_index,
          colId: rollUpQueueKey.colId
        });

        if (
          this.rowData[rollUpQueueKey.rowInx].parent_index &&
          duplicateTempQueueKeyIndex === -1
        ) {
          rollUpProduct.call(this, {
            productRollUpQueue: productRollupQueue,
            rollUpQueue,
            kpiFlow,
            isSingleRollUp: false,
            finalRollDownQueue,
            tempRollUpQueue: tempRollUpQueue
          });
        }

        const duplicateQueueKeyIndex = findIndex(rollUpQueue, {
          rowInx: rollUpQueueKey.rowInx,
          colId: this.channelRollUpMapping[rollUpQueueKey.colId][0]
        });

        if (duplicateQueueKeyIndex === -1) {
          rollUpChannel.call(this, {
            channelRollUpQueue: channelRollupQueue,
            rollUpQueue,
            kpiFlow,
            isSingleRollUp: true,
            finalRollDownQueue,
            tempRollUpQueue: tempRollUpQueue
          });
          rollUpQueue.push(...channelRollupQueue);
          length = rollUpQueue.length;
        }
      } else if (this.rowData[rollUpQueueKey.rowInx].parent_index >= 0) {
        const duplicateTempQueueKeyIndex = findIndex(tempRollUpQueue, {
          rowInx: this.rowData[rollUpQueueKey.rowInx].parent_index,
          colId: rollUpQueueKey.colId
        });

        if (duplicateTempQueueKeyIndex === -1) {
          rollUpProduct.call(this, {
            productRollUpQueue: [rollUpQueueKey],
            rollUpQueue,
            kpiFlow,
            isSingleRollUp: false,
            finalRollDownQueue,
            tempRollUpQueue: tempRollUpQueue
          });
          length = rollUpQueue.length;
        }
      }
    }
  }
}

export default rollUp;
