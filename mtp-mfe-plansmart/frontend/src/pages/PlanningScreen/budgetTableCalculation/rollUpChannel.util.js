import { findIndex, get } from "lodash";
import { CHANNEL_HIERARCHY_KEY } from "./budgetTableCalculation.constant";
import executeFormulaUtil from "./common/executeFormula.util";
import isCellLockedUtil from "./common/isCellLocked.util";
import updateRowData from "./common/updateRowData.util";
import rollDownUtil from "./rollDown.util";
import removeLockUtil from "./common/removeLock.util";
import saveChangedRowInxColId from "./saveChangedRowInxColId.until";
import getEligibleChannelColumnsUtil from "./common/getEligibleChannelColumns.util";
function rollUpChannel({
  channelRollUpQueue,
  rollUpQueue,
  kpiFlow,
  isSingleRollUp,
  finalRollDownQueue,
  tempRollUpQueue
}) {
  channelRollUpQueue.forEach((channelRollUpQueueKey) => {
    channelRollUpQueue.shift();
    if (this.channelRollUpMapping[channelRollUpQueueKey.colId]) {
      this.channelRollUpMapping[channelRollUpQueueKey.colId].forEach(
        (channelRollUpKey) => {
          this.currentRow = this.rowData[channelRollUpQueueKey.rowInx];
          this.changedColumnDef = this.columnsMap[channelRollUpKey];

          this.currentHierarchy = CHANNEL_HIERARCHY_KEY;

          const isCellLocked = isCellLockedUtil.call(this, {
            accessor: channelRollUpKey,
            rowInx: channelRollUpQueueKey.rowInx
          });

          const duplicateQueueKeyIndex = findIndex(channelRollUpQueue, {
            rowInx: channelRollUpQueueKey.rowInx,
            colId: channelRollUpKey
          });

          const isChannelEligible = get(
            channelRollUpQueueKey,
            "isChannelEligible",
            true
          );

          if (!isCellLocked) {
            if (duplicateQueueKeyIndex === -1) {
              const value = executeFormulaUtil.call(
                this,
                isChannelEligible ? kpiFlow.rollUpChannel : kpiFlow.formula,
                {
                  ...channelRollUpQueueKey.changedCellData,
                  focused_value: this.rowData[channelRollUpQueueKey.rowInx][
                    channelRollUpKey
                  ]
                },
                "product-channel",
                {
                  colId: channelRollUpKey,
                  rowInx: channelRollUpQueueKey.rowInx
                }
              );

              if (duplicateQueueKeyIndex === -1) {
                channelRollUpQueue.push({
                  rowInx: channelRollUpQueueKey.rowInx,
                  colId: channelRollUpKey,
                  changedCellData: {
                    before_user_entered_value: this.rowData[
                      channelRollUpQueueKey.rowInx
                    ][channelRollUpKey],
                    user_entered_value: value
                  },
                  isChannelEligible
                });
                tempRollUpQueue.push({
                  rowInx: channelRollUpQueueKey.rowInx,
                  colId: channelRollUpKey,
                  changedCellData: {
                    before_user_entered_value: this.rowData[
                      channelRollUpQueueKey.rowInx
                    ][channelRollUpKey],
                    user_entered_value: value
                  },
                  isChannelEligible
                });
              }

              if (!isChannelEligible) {
                const eligibleColumn = getEligibleChannelColumnsUtil.call(
                  this,
                  {
                    kpi: kpiFlow.kpi,
                    row: this.rowData[channelRollUpQueueKey.rowInx],
                    column: channelRollUpKey
                  }
                );

                eligibleColumn.map((channel) => {
                  updateRowData.call(this, {
                    rowInx: channelRollUpQueueKey.rowInx,
                    key: channel,
                    value: value
                  });
                  saveChangedRowInxColId.call(this, {
                    columnId: channel,
                    rowInx: channelRollUpQueueKey.rowInx
                  });
                });
              }

              updateRowData.call(this, {
                rowInx: channelRollUpQueueKey.rowInx,
                key: channelRollUpKey,
                value: value
              });
              saveChangedRowInxColId.call(this, {
                columnId: channelRollUpKey,
                rowInx: channelRollUpQueueKey.rowInx
              });
            }
          } else {
            const lockedRollDownQueue = [
              {
                colId: channelRollUpKey,
                rowInx: channelRollUpQueueKey.rowInx,
                changedCellData: { ...channelRollUpQueueKey.changedCellData }
              }
            ];

            const excludedCell = {
              colId: channelRollUpQueueKey.colId,
              rowInx: channelRollUpQueueKey.rowInx
            };

            rollDownUtil.call(this, {
              rollDownQueue: lockedRollDownQueue,
              kpiFlow,
              excludedCell: excludedCell,
              rollDownPriority: ["channel", "product"]
            });

            lockedRollDownQueue.forEach((lockedRollDownQueueKey) => {
              const rollUpQueueIndex = findIndex(rollUpQueue, {
                colId: lockedRollDownQueue.colId,
                rowInx: lockedRollDownQueue.rowInx
              });

              if (rollUpQueueIndex !== -1) {
                rollUpQueue[rollUpQueueIndex] = {
                  ...lockedRollDownQueueKey
                };
              } else {
                rollUpQueue.push(lockedRollDownQueueKey);
              }

              const rollDownFinalQueueIndex = findIndex(finalRollDownQueue, {
                colId: lockedRollDownQueue.colId,
                rowInx: lockedRollDownQueue.rowInx
              });

              if (rollDownFinalQueueIndex !== -1) {
                finalRollDownQueue[rollDownFinalQueueIndex] = {
                  ...lockedRollDownQueueKey
                };
              } else {
                finalRollDownQueue.push(lockedRollDownQueueKey);
              }
            });

            removeLockUtil.call(this, {
              accessor: channelRollUpKey,
              rowInx: channelRollUpQueueKey.rowInx
            });
          }
        }
      );
    }
    if (!isSingleRollUp) {
      rollUpChannel.call(this, {
        channelRollUpQueue,
        kpiFlow,
        rollUpQueue,
        isSingleRollUp,
        finalRollDownQueue,
        tempRollUpQueue
      });
    }
  });
}

export default rollUpChannel;
