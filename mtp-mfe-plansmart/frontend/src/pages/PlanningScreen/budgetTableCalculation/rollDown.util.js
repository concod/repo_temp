import { ZERO_HANDLING } from "../apis/budgetTable.data";
import {
  CHANNEL_HIERARCHY_KEY,
  PRODUCT_HIERARCHY_KEY
} from "./budgetTableCalculation.constant";
import executeFormulaUtil from "./common/executeFormula.util";
import isCellLockedUtil from "./common/isCellLocked.util";
import numberValidationUtil from "./common/numberValidation.util";
import updateRowData from "./common/updateRowData.util";
import isLogicallyLocked from "./isLogicallyLocked.util";
import saveChangedRowInxColId from "./saveChangedRowInxColId.until";
import isChannelEligibleUtil from "./common/isChannelEligible.util";
import getEligibleChannelCountUtil from "./common/getEligibleChannelCount.util";
import removeLockUtil from "./common/removeLock.util";

function rollDown({
  kpiFlow,
  rollDownQueue,
  excludedCell,
  rollDownPriority,
  rollDownLockedCells
}) {
  rollDownPriority.forEach((rollDownHierarchy) => {
    if (rollDownHierarchy === CHANNEL_HIERARCHY_KEY) {
      this.currentHierarchy = CHANNEL_HIERARCHY_KEY;

      rollDownQueue.forEach((rollDownQueueKey) => {
        if (this.channelRollDownMapping[rollDownQueueKey.colId]) {
          rollDownQueue.shift();
          this.lastRollDownHierarchy = CHANNEL_HIERARCHY_KEY;
          this.channelRollDownMapping[rollDownQueueKey.colId].forEach(
            (channelRollDownKey) => {
              const isCellLocked = isCellLockedUtil.call(this, {
                accessor: channelRollDownKey,
                rowInx: rollDownQueueKey.rowInx
              });

              const isCellLogicallyLocked = isLogicallyLocked.call(this, {
                accessor: channelRollDownKey,
                rowInx: rollDownQueueKey.rowInx
              });

              this.changedColumnDef = this.columnsMap[channelRollDownKey];
              this.currentRow = this.rowData[rollDownQueueKey.rowInx];

              const isCellExcluded =
                excludedCell !== null &&
                excludedCell?.colId === channelRollDownKey &&
                excludedCell?.rowInx === rollDownQueueKey.rowInx;

              const isChannelEligible = isChannelEligibleUtil.call(this, {
                kpi: kpiFlow.kpi
              });

              if (
                !(
                  isCellLocked ||
                  Boolean(isCellLogicallyLocked) ||
                  isCellExcluded
                ) &&
                isChannelEligible
              ) {
                let value = 0;

                if (
                  Number(
                    this.rowData[this.currentRow.index][rollDownQueueKey.colId]
                  ) === 0
                ) {
                  if (kpiFlow.zeroHandling === ZERO_HANDLING.PROPORTIONAL) {
                    const childLength = getEligibleChannelCountUtil.call(this, {
                      kpi: kpiFlow.kpi,
                      column: rollDownQueueKey.colId,
                      row: this.rowData[rollDownQueueKey.rowInx]
                    });

                    value = numberValidationUtil(
                      rollDownQueueKey.changedCellData.user_entered_value /
                        childLength
                    );
                  } else if (kpiFlow.zeroHandling === ZERO_HANDLING.EQUAL) {
                    value = numberValidationUtil(
                      rollDownQueueKey.changedCellData.user_entered_value
                    );
                  }
                  if (JSON.parse(this.logCalculations)) {
                    console.log("channel-zeroHandled", value);
                  }
                } else {
                  value = executeFormulaUtil.call(
                    this,
                    kpiFlow.rollDownChannel,
                    {
                      ...rollDownQueueKey.changedCellData,
                      focused_value: this.rowData[rollDownQueueKey.rowInx][
                        channelRollDownKey
                      ]
                    },
                    "channel-rollDown",
                    {
                      colId: channelRollDownKey,
                      rowInx: rollDownQueueKey.rowInx
                    }
                  );
                }
                rollDownQueue.push({
                  rowInx: rollDownQueueKey.rowInx,
                  colId: channelRollDownKey,
                  changedCellData: {
                    before_user_entered_value: this.rowData[
                      rollDownQueueKey.rowInx
                    ][channelRollDownKey],
                    user_entered_value: value
                  },
                  isChannelEligible
                });
              }
              if (isCellLocked) {
                rollDownLockedCells.push({
                  accessor: channelRollDownKey,
                  rowInx: rollDownQueueKey.rowInx
                });
              }
            }
          );

          rollDown.call(this, {
            kpiFlow,
            rollDownQueue,
            rollDownPriority,
            rollDownLockedCells
          });
        }
      });
    } else if (rollDownHierarchy === PRODUCT_HIERARCHY_KEY) {
      this.currentHierarchy = PRODUCT_HIERARCHY_KEY;
      rollDownQueue.forEach((rollDownQueueKey) => {
        if (this.rowData[rollDownQueueKey.rowInx].children_indexes) {
          rollDownQueue.shift();
          this.lastRollDownHierarchy = PRODUCT_HIERARCHY_KEY;
          this.rowData[rollDownQueueKey.rowInx].children_indexes.forEach(
            (productRollDownInx) => {
              const isCellLocked = isCellLockedUtil.call(this, {
                accessor: rollDownQueueKey.colId,
                rowInx: productRollDownInx
              });

              const isCellLogicallyLocked = isLogicallyLocked.call(this, {
                accessor: rollDownQueueKey.colId,
                rowInx: productRollDownInx
              });

              this.changedColumnDef = this.columnsMap[rollDownQueueKey.colId];
              this.currentRow = this.rowData[productRollDownInx];

              const isCellExcluded =
                excludedCell !== null &&
                excludedCell?.colId === rollDownQueueKey.colId &&
                excludedCell?.rowInx === productRollDownInx;

              const isChannelEligible = isChannelEligibleUtil.call(this, {
                kpi: kpiFlow.kpi
              });
              if (
                !(
                  isCellLocked ||
                  Boolean(isCellLogicallyLocked) ||
                  isCellExcluded
                )
              ) {
                let value = 0;
                if (
                  Number(
                    this.rowData[this.currentRow.parent_index][
                      rollDownQueueKey.colId
                    ]
                  ) === 0
                ) {
                  if (kpiFlow.zeroHandling === ZERO_HANDLING.PROPORTIONAL) {
                    const childLength = this.rowData[rollDownQueueKey.rowInx]
                      .children_indexes.length;

                    value = numberValidationUtil(
                      rollDownQueueKey.changedCellData.user_entered_value /
                        childLength
                    );
                  } else if (kpiFlow.zeroHandling === ZERO_HANDLING.EQUAL) {
                    value = numberValidationUtil(
                      rollDownQueueKey.changedCellData.user_entered_value
                    );
                  }
                  if (JSON.parse(this.logCalculations)) {
                    console.log("product-zeroHandled", value);
                  }
                } else {
                  value = executeFormulaUtil.call(
                    this,
                    kpiFlow.productRollDown,
                    {
                      ...rollDownQueueKey.changedCellData,
                      focused_value: this.rowData[productRollDownInx][
                        rollDownQueueKey.colId
                      ]
                    },
                    "product-rollDown",
                    {
                      colId: rollDownQueueKey.colId,
                      rowInx: productRollDownInx
                    }
                  );
                }
                rollDownQueue.push({
                  rowInx: productRollDownInx,
                  colId: rollDownQueueKey.colId,
                  changedCellData: {
                    before_user_entered_value: this.rowData[productRollDownInx][
                      rollDownQueueKey.colId
                    ],
                    user_entered_value: value
                  },
                  isChannelEligible
                });
              }
              if (isCellLocked) {
                rollDownLockedCells.push({
                  accessor: rollDownQueueKey.colId,
                  rowInx: productRollDownInx
                });
              }
            }
          );

          rollDown.call(this, {
            kpiFlow,
            rollDownQueue,
            rollDownPriority,
            rollDownLockedCells
          });
        }
      });
    }
  });

  rollDownLockedCells &&
    rollDownLockedCells.forEach((rollDownLockedCellsKey) => {
      removeLockUtil.call(this, {
        rowInx: rollDownLockedCellsKey.rowInx,
        accessor: rollDownLockedCellsKey.accessor
      });
    });
  rollDownQueue.forEach((rollDownQueueKey) => {
    if (rollDownQueueKey.isChannelEligible) {
      updateRowData.call(this, {
        rowInx: rollDownQueueKey.rowInx,
        key: rollDownQueueKey.colId,
        value: rollDownQueueKey.changedCellData.user_entered_value
      });
      saveChangedRowInxColId.call(this, {
        columnId: rollDownQueueKey.colId,
        rowInx: rollDownQueueKey.rowInx
      });
    }
  });
}

export default rollDown;
