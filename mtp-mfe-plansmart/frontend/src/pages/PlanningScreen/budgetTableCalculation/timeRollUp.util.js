import executeFormulaUtil from "./common/executeFormula.util";
import { findIndex, cloneDeep } from "lodash";
import updateRowData from "./common/updateRowData.util";
import { timeRollUpGroupMapping } from "../apis/budgetTable.data";
import rollUp from "./rollUp.util";
import { TIME_HIERARCHY_KEY } from "./budgetTableCalculation.constant";
import isCellLockedUtil from "./common/isCellLocked.util";
import timeRollDownUtil from "./timeRollDown.util";
import removeLockUtil from "./common/removeLock.util";
import saveChangedRowInxColId from "./saveChangedRowInxColId.until";
import isTimelineLockedUtil, {
  isSomethingLockedOnTimeLineUtil
} from "./common/isTimelineLocked.util";

function timeRollUp({ timeRollUpQueue, kpiFlow, timeLineChildRollQueue }) {
  timeRollUpQueue.forEach((timeRollUpQueueKey) => {
    this.timeRollUpMapping.forEach((timeRollUpMapping, index) => {
      //timeRollUpMapping mapping is split according to the timeline hierarchy eg. 0 - weeks, 1 - Month so on
      // when index is more then the current timeline level, it means that week is done and we are rolling up month to quarter
      // before triggering the rollup we check if anything is locked on the next timeline and lock all the respective rollup cells in queue
      if (index > this.timeRollupLevel) {
        this.timeRollupLevel = index;
        const tempLocks = {};
        [...timeRollUpQueue].map((item) => {
          const isLocked = isSomethingLockedOnTimeLineUtil.call(this, {
            accessor: timeRollUpMapping[item.colId],
            isDelete: false
          });

          if (isLocked) {
            if (!tempLocks[timeRollUpMapping[item.colId]]) {
              tempLocks[timeRollUpMapping[item.colId]] = [];
            }

            tempLocks[timeRollUpMapping[item.colId]].push(item.rowInx);
          }
        });

        Object.keys(tempLocks).forEach((lockedColumns) => {
          this.lockedCells[lockedColumns] = tempLocks[lockedColumns];
        });
      }

      if (timeRollUpMapping[timeRollUpQueueKey.colId]) {
        const removedQueueKey = timeRollUpQueue.shift();

        timeRollUpMapping[timeRollUpQueueKey.colId].forEach((timeRollUpKey) => {
          this.currentRow = this.rowData[timeRollUpQueueKey.rowInx];
          this.changedColumnDef = this.columnsMap[timeRollUpKey];
          this.currentHierarchy = TIME_HIERARCHY_KEY;

          const isCellLocked = isTimelineLockedUtil.call(this, {
            accessor: timeRollUpKey,
            rowInx: timeRollUpQueueKey.rowInx
          });

          const duplicateQueueKeyIndex = findIndex(timeRollUpQueue, {
            rowInx: timeRollUpQueueKey.rowInx,
            colId: timeRollUpKey
          });

          if (!isCellLocked) {
            if (duplicateQueueKeyIndex === -1) {
              const value = executeFormulaUtil.call(
                this,
                kpiFlow.rollUpTimeline,
                {
                  ...timeRollUpQueueKey.changedCellData,
                  focused_value: this.rowData[timeRollUpQueueKey.rowInx][
                    timeRollUpKey
                  ]
                },
                "time-RollUp",

                { colId: timeRollUpKey, rowInx: timeRollUpQueueKey.rowInx }
              );
              let valueNotFoundInQueue = false;
              // to get old value we are summing up values of child elements in the queue
              // since the old value from row data and calculated value will be equal
              const before_value = this.timeRollDownMapping[
                timeRollUpKey
              ].reduce((sum, childColumn) => {
                const queueKey = [removedQueueKey, ...timeRollUpQueue].find(
                  (key) =>
                    key.colId === childColumn &&
                    key.rowInx === timeRollUpQueueKey.rowInx
                );

                if (queueKey) {
                  return (
                    sum + queueKey.changedCellData.before_user_entered_value
                  );
                }
                valueNotFoundInQueue = true;
                return 0;
              }, 0);

              if (duplicateQueueKeyIndex === -1) {
                timeRollUpQueue.push({
                  rowInx: timeRollUpQueueKey.rowInx,
                  colId: timeRollUpKey,
                  changedCellData: {
                    before_user_entered_value: valueNotFoundInQueue
                      ? this.rowData[timeRollUpQueueKey.rowInx][timeRollUpKey]
                      : before_value,
                    user_entered_value: value
                  }
                });

                timeLineChildRollQueue.push({
                  rowInx: timeRollUpQueueKey.rowInx,
                  colId: timeRollUpKey,
                  changedCellData: {
                    before_user_entered_value: this.rowData[
                      timeRollUpQueueKey.rowInx
                    ][timeRollUpKey],
                    user_entered_value: value
                  }
                });
              }

              updateRowData.call(this, {
                rowInx: timeRollUpQueueKey.rowInx,
                key: timeRollUpKey,
                value: value
              });
              saveChangedRowInxColId.call(this, {
                columnId: timeRollUpKey,
                rowInx: timeRollUpQueueKey.rowInx
              });
            }
          } else {
            const lockedRollDownQueue = [
              {
                colId: timeRollUpKey,
                rowInx: timeRollUpQueueKey.rowInx,
                changedCellData: { ...timeRollUpQueueKey.changedCellData }
              }
            ];

            const excludedCell = {
              colId: timeRollUpQueueKey.colId,
              rowInx: timeRollUpQueueKey.rowInx
            };

            timeRollDownUtil.call(this, {
              timeRollDownQueue: lockedRollDownQueue,
              kpiFlow,
              excludedCell: excludedCell
            });

            lockedRollDownQueue.forEach((lockedRollDownQueueKey) => {
              const rollUpQueueIndex = findIndex(timeRollUpQueue, {
                colId: lockedRollDownQueue.colId,
                rowInx: lockedRollDownQueue.rowInx
              });
              const rollUpChildQueueIndex = findIndex(timeLineChildRollQueue, {
                colId: lockedRollDownQueue.colId,
                rowInx: lockedRollDownQueue.rowInx
              });

              if (rollUpQueueIndex !== -1) {
                timeRollUpQueue[rollUpQueueIndex] = {
                  ...lockedRollDownQueueKey
                };
                timeLineChildRollQueue[rollUpChildQueueIndex] = {
                  ...lockedRollDownQueueKey
                };
              } else {
                timeRollUpQueue.push(lockedRollDownQueueKey);
                timeLineChildRollQueue.push(lockedRollDownQueueKey);
              }
            });

            removeLockUtil.call(this, {
              accessor: timeRollUpKey,
              rowInx: timeRollUpQueueKey.rowInx
            });
          }
        });

        timeRollUp.call(this, {
          timeRollUpQueue,
          timeLineChildRollQueue,
          kpiFlow
        });
      }
    });
  });
}

export default timeRollUp;
